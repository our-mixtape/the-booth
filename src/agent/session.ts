import { z } from 'zod';
import { sessionFetch, SignInRequiredError, type BoothSession } from '../auth/session';
import type { Attempt } from '../domain/session';
import type { compactState } from './hints';

export type Phase = 'idle' | 'thinking' | 'streaming' | 'steer-queued' | 'steered' | 'revising' | 'waiting-attempt' | 'reviewing' | 'done' | 'error';
export type ToolOutput = { status: 'complete' | 'retry' | 'timeout' | 'cancelled'; entryError?: number; handoffAt?: number; tolerance?: number };
export type SessionResponse = { id: string; text: string; startedAt: number; completedAt?: number; successorOf?: string; kind: 'plan' | 'review'; steered?: boolean };
export type SessionView = {
 phase: Phase;
 sessionId: string | null;
 inFlightResponseId: string | null;
 connected: boolean;
 requestPending: boolean;
 reviewPending: boolean;
 responses: SessionResponse[];
 pendingCall: { callId: string; reason: string; receivedAt: number } | null;
 history: { phase: Phase; at: number; responseId?: string }[];
 meta: { model: string | null; latencyMs: number | null };
 error: string;
 signInRequired: boolean;
};
const id = z.string().min(1).max(200);
const events = z.discriminatedUnion('t', [
 z.object({ t: z.literal('session'), sessionId: id }),
 z.object({ t: z.literal('created'), responseId: id, successorOf: id.optional() }),
 z.object({ t: z.literal('delta'), responseId: id, text: z.string().max(32000) }),
 z.object({ t: z.literal('tool_call'), responseId: id, callId: id, name: z.string(), args: z.unknown(), async: z.boolean() }),
 z.object({ t: z.literal('steer'), status: z.enum(['accepted', 'pending', 'failed']) }),
 z.object({ t: z.literal('steered'), responseId: id }),
 z.object({ t: z.literal('completed'), responseId: id, model: z.string().max(200) }),
 z.object({ t: z.literal('error'), message: z.string() }),
]);
const initial = (): SessionView => ({ phase: 'idle', sessionId: null, inFlightResponseId: null, connected: false, requestPending: false, reviewPending: false, responses: [], pendingCall: null, history: [], meta: { model: null, latencyMs: null }, error: '', signInRequired: false });
const unavailable = 'Astra session ended. Brief again to retry. Your mix keeps playing.';

/** One authenticated SSE stream owns the live session. It never dispatches mixer commands. */
export class AstraSession {
 state = initial();
 private generation = 0;
 private controllers = new Set<AbortController>();
 private streamController: AbortController | null = null;
 private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
 private getToken: BoothSession['getToken'] | null = null;
 private toolTimer: ReturnType<typeof setTimeout> | null = null;
 private resolvedCalls = new Set<string>();
 private attempt: Pick<Attempt, 'status' | 'entryError' | 'startedAt'> = { status: 'idle', startedAt: 0 };
 private briefActive = false;
 private trackedAttemptStart: number | null = null;
 private attemptResult: { startedAt: number; output: ToolOutput } | null = null;
 private reviewExpected = false;
 private requestStartedAt = 0;

 constructor(private readonly onChange: (state: SessionView) => void = () => {}) {}
 private publish(patch: Partial<SessionView> = {}) { this.state = { ...this.state, ...patch }; this.onChange(this.state); }
 private phase(phase: Phase, patch: Partial<SessionView> = {}) {
  const at = Date.now(), responseId = patch.inFlightResponseId ?? this.state.inFlightResponseId ?? undefined;
  this.publish({ ...patch, phase, history: this.state.phase === phase ? this.state.history : [...this.state.history, { phase, at, responseId }].slice(-32) });
 }
 private clearToolTimer() { if (this.toolTimer) clearTimeout(this.toolTimer); this.toolTimer = null; }
 private disconnect() {
  this.generation++;
  for (const controller of this.controllers) controller.abort();
  this.controllers.clear(); this.streamController = null;
  void this.reader?.cancel().catch(() => {}); this.reader = null;
  this.clearToolTimer(); this.reviewExpected = false; this.briefActive = false; this.trackedAttemptStart = null; this.attemptResult = null;
 }
 stop() { this.disconnect(); this.getToken = null; this.resolvedCalls.clear(); this.publish(initial()); }
 private fail(error?: unknown) {
  this.disconnect();
  const signInRequired = error instanceof SignInRequiredError;
  this.phase('error', { connected: false, sessionId: null, inFlightResponseId: null, pendingCall: null, requestPending: false, reviewPending: false, signInRequired, error: signInRequired ? 'Please sign in again to use the live session. Your mix keeps playing.' : unavailable });
 }
 private async post(path: '/api/session/brief' | '/api/session/steer' | '/api/session/tool', body: unknown, controller: AbortController) {
  if (!this.getToken) throw new SignInRequiredError();
  return sessionFetch(this.getToken, path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
 }

 async start({ state, brief, effort = 'low', getToken }: { state: ReturnType<typeof compactState>; brief: string; effort?: 'low' | 'medium'; getToken: BoothSession['getToken'] }) {
  const text = brief.trim();
  if (!text || text.length > 1000 || this.state.inFlightResponseId || this.state.requestPending || this.state.pendingCall || this.reviewExpected || this.state.signInRequired) return;
  const followup = this.state.connected && this.state.sessionId;
  if (!followup) { this.disconnect(); this.resolvedCalls.clear(); }
  this.getToken = getToken; this.attempt = { ...state.attempt }; this.requestStartedAt = Date.now();
  // A brief may cover an attempt already running, but never an earlier terminal result.
  this.briefActive = true; this.attemptResult = null;
  this.trackedAttemptStart = state.attempt.status === 'running' ? state.attempt.startedAt : null;
  const generation = this.generation, controller = new AbortController(); this.controllers.add(controller);
  this.phase('thinking', { requestPending: true, error: '' });
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
   const response = await this.post('/api/session/brief', { ...state, brief: text, effort, requestId: crypto.randomUUID(), ...(followup ? { sessionId: followup } : {}) }, controller);
   if (generation !== this.generation) return;
   if (!response.ok) throw new Error('Brief rejected');
   if (followup) { if (response.status !== 202) throw new Error('Invalid follow-up acknowledgement'); return; }
   if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) throw new Error('Invalid session stream');
   this.streamController = controller; this.publish({ connected: true });
   this.reader = response.body.getReader();
   void this.consume(this.reader, generation);
  } catch (error) { if (generation === this.generation) this.fail(error); }
  finally { clearTimeout(timeout); if (controller !== this.streamController) this.controllers.delete(controller); }
 }

 private async consume(reader: ReadableStreamDefaultReader<Uint8Array>, generation: number) {
  const decoder = new TextDecoder(); let buffer = '';
  const line = (raw: string) => {
   const value = raw.replace(/\r$/, ''); if (!value.startsWith('data:')) return;
   const data = value.slice(5).trimStart(); if (!data) return;
   let parsed: unknown; try { parsed = JSON.parse(data); } catch { throw new Error('Invalid session event'); }
   const event = events.safeParse(parsed); if (event.success) this.receive(event.data);
  };
  try {
   while (generation === this.generation) {
    const next = await reader.read(); if (generation !== this.generation) return;
    buffer += decoder.decode(next.value, { stream: !next.done });
    if (buffer.length > 128000) throw new Error('Oversized session event');
    let boundary: number;
    while ((boundary = buffer.indexOf('\n')) >= 0) { line(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 1); if (generation !== this.generation) return; }
    if (next.done) { if (buffer) line(buffer); break; }
   }
   if (generation !== this.generation) return;
   if (this.state.inFlightResponseId || this.state.requestPending || this.state.pendingCall || this.reviewExpected) throw new Error('Session disconnected before completion');
   this.disconnect(); this.publish({ connected: false, sessionId: null });
  } catch (error) { if (generation === this.generation) this.fail(error); }
  finally { reader.releaseLock(); }
 }

 private receive(event: z.infer<typeof events>) {
  const now = Date.now();
  if (event.t === 'session') { this.publish({ sessionId: event.sessionId }); return; }
  if (event.t === 'created') {
   if (this.state.responses.some(response => response.id === event.responseId)) return;
   const review = this.reviewExpected && !event.successorOf;
   if (review) this.reviewExpected = false;
   const response: SessionResponse = { id: event.responseId, text: '', startedAt: now, successorOf: event.successorOf, kind: review ? 'review' : 'plan' };
   this.phase(review ? 'reviewing' : event.successorOf ? 'revising' : 'thinking', { requestPending: false, reviewPending: review ? false : this.state.reviewPending, inFlightResponseId: event.responseId, responses: [...this.state.responses, response] }); return;
  }
  if (event.t === 'delta') {
   const current = this.state.responses.find(response => response.id === event.responseId);
   if (!current || current.completedAt || current.steered || event.responseId !== this.state.inFlightResponseId) return;
   const responses = this.state.responses.map(response => response.id === event.responseId ? { ...response, text: (response.text + event.text).slice(0, 24000) } : response);
   const phase = current.kind === 'review' ? 'reviewing' : this.state.phase === 'steer-queued' ? 'steer-queued' : current.successorOf ? 'revising' : 'streaming';
   this.phase(phase, { responses }); return;
  }
  if (event.t === 'steer') {
   if (!this.state.inFlightResponseId) return;
   if (event.status === 'failed') {
    const response = this.state.responses.find(response => response.id === this.state.inFlightResponseId);
    this.phase(response?.kind === 'review' ? 'reviewing' : response?.successorOf ? 'revising' : response?.text ? 'streaming' : 'thinking', { error: 'That steer was not applied. Try again while Astra is responding.' });
   } else this.phase('steer-queued');
   return;
  }
  if (event.t === 'steered') {
   if (event.responseId !== this.state.inFlightResponseId) return;
   this.phase('steered', { inFlightResponseId: null, requestPending: true, responses: this.state.responses.map(response => response.id === event.responseId ? { ...response, steered: true } : response) }); return;
  }
  if (event.t === 'tool_call') {
   if (event.name !== 'watch_attempt' || !event.async || this.resolvedCalls.has(event.callId) || this.state.pendingCall) return;
   const args = z.object({ reason: z.string().max(1000) }).safeParse(event.args);
   this.publish({ pendingCall: { callId: event.callId, reason: args.success ? args.data.reason : '', receivedAt: now } });
   this.clearToolTimer(); this.toolTimer = setTimeout(() => { void this.resolveTool(event.callId, { status: 'timeout' }); }, 120000);
   if (this.attemptResult && this.attemptResult.startedAt === this.attempt.startedAt) void this.resolveTool(event.callId, this.attemptResult.output);
   return;
  }
  if (event.t === 'completed') {
   if (event.responseId !== this.state.inFlightResponseId) return;
   const response = this.state.responses.find(item => item.id === event.responseId);
   this.phase(this.reviewExpected ? 'reviewing' : this.state.pendingCall ? 'waiting-attempt' : 'done', {
    inFlightResponseId: null, requestPending: this.reviewExpected,
    responses: this.state.responses.map(item => item.id === event.responseId ? { ...item, completedAt: now } : item),
    meta: { model: event.model, latencyMs: now - (response?.startedAt ?? this.requestStartedAt) },
   }); return;
  }
  if (event.t === 'error') this.fail();
 }

 async steer(text: string) {
  const value = text.trim(), responseId = this.state.inFlightResponseId;
  if (!value || value.length > 500 || !responseId || !this.state.sessionId || this.state.phase === 'steer-queued') return;
  const generation = this.generation, controller = new AbortController(); this.controllers.add(controller);
  this.phase('steer-queued', { error: '' });
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
   const response = await this.post('/api/session/steer', { sessionId: this.state.sessionId, text: value }, controller);
   if (generation !== this.generation) return;
   if (response.status === 409) { if (this.state.inFlightResponseId === responseId) this.fail(); return; }
   if (response.status !== 202) throw new Error('Steer rejected');
  } catch (error) { if (generation === this.generation) this.fail(error); }
  finally { clearTimeout(timeout); this.controllers.delete(controller); }
 }

 observeAttempt(attempt: Pick<Attempt, 'status' | 'entryError' | 'startedAt'>) {
  const previous = this.attempt; this.attempt = { ...attempt };
  if (!this.briefActive) return;
  if (attempt.status === 'running') {
   if (previous.status !== 'running' || previous.startedAt !== attempt.startedAt) this.attemptResult = null;
   this.trackedAttemptStart = attempt.startedAt;
   return;
  }
  if (attempt.status === 'idle' || this.trackedAttemptStart !== attempt.startedAt) {
   this.trackedAttemptStart = null; this.attemptResult = null; return;
  }
  if (previous.status === 'running' && previous.startedAt === attempt.startedAt) {
   // Retain this engine result even while Astra is still preparing its asynchronous call.
   // The engine has no exact handoff timestamp field. Do not fabricate one from a render clock.
   const output: ToolOutput = { status: attempt.status, ...(Number.isFinite(attempt.entryError) ? { entryError: attempt.entryError } : {}), tolerance: 0.25 };
   this.attemptResult = { startedAt: attempt.startedAt, output };
   if (this.state.pendingCall) void this.resolveTool(this.state.pendingCall.callId, output);
  }
 }

 async resolveTool(callId: string, output: ToolOutput) {
  if (this.state.pendingCall?.callId !== callId || this.resolvedCalls.has(callId) || !this.state.sessionId) return;
  const generation = this.generation, controller = new AbortController(); this.controllers.add(controller);
  this.resolvedCalls.add(callId); this.clearToolTimer(); this.attemptResult = null; this.trackedAttemptStart = null; this.reviewExpected = true; this.requestStartedAt = Date.now();
  if (this.state.inFlightResponseId) this.publish({ pendingCall: null, reviewPending: true });
  else this.phase('reviewing', { pendingCall: null, requestPending: true, reviewPending: true });
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
   const response = await this.post('/api/session/tool', { sessionId: this.state.sessionId, callId, output }, controller);
   if (generation !== this.generation) return;
   if (response.status !== 202) throw new Error('Tool result rejected');
  } catch (error) { if (generation === this.generation) this.fail(error); }
  finally { clearTimeout(timeout); this.controllers.delete(controller); }
 }
}

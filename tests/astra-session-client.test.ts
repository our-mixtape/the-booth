import { afterEach, expect, it, vi } from 'vitest';
import { AstraSession, type SessionView } from '../src/agent/session';
import type { compactState } from '../src/agent/hints';

const sessions: AstraSession[] = [];
afterEach(() => { sessions.splice(0).forEach(session => session.stop()); vi.restoreAllMocks(); vi.useRealTimers(); });
const state: ReturnType<typeof compactState> = { revision: 1, crossfader: 0, exercise: { entryAfter: 8, endAfter: 16 }, decks: {}, attempt: { status: 'idle', startedAt: 0, elapsed: null, entryError: undefined, assisted: false }, history: [] };
function harness() {
 let stream!: ReadableStreamDefaultController<Uint8Array>;
 const body = new ReadableStream<Uint8Array>({ start(controller) { stream = controller; } });
 const requests: { path: string; body: Record<string, unknown> }[] = [];
 const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (path, init) => {
  requests.push({ path: String(path), body: JSON.parse(String(init?.body)) });
  expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-only');
  return String(path) === '/api/session/brief' && !requests.at(-1)?.body.sessionId ? new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }) : new Response(null, { status: 202 });
 });
 const updates: SessionView[] = [], session = new AstraSession(view => updates.push(view)); sessions.push(session);
 const emit = (...events: unknown[]) => stream.enqueue(new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join('')));
 const start = () => session.start({ state, brief: 'I am about to attempt the handoff.', getToken: async () => 'test-only' });
 return { session, requests, fetch, updates, emit, stream, start };
}

it('parses fragmented SSE and heartbeats, preserves earlier text through native steering, and reuses the stream', async () => {
 const h = harness(); await h.start();
 h.stream.enqueue(new TextEncoder().encode(': heartbeat\n\ndata: {"t":"session","sessionId":"live-1"}\n\ndata: {"t":"cre'));
 h.stream.enqueue(new TextEncoder().encode('ated","responseId":"resp_first"}\n\n'));
 h.emit({ t: 'delta', responseId: 'resp_first', text: '1. Bar 5: bring in B.' });
 await vi.waitFor(() => expect(h.session.state.phase).toBe('streaming'));
 await h.session.steer('Delay B one bar');
 expect(h.requests[1]).toEqual({ path: '/api/session/steer', body: { sessionId: 'live-1', text: 'Delay B one bar' } });
 h.emit({ t: 'steer', status: 'accepted' }, { t: 'steered', responseId: 'resp_first' });
 await vi.waitFor(() => expect(h.session.state.inFlightResponseId).toBeNull());
 await h.session.steer('Too late'); expect(h.requests).toHaveLength(2);
 h.emit({ t: 'created', responseId: 'resp_successor', successorOf: 'resp_first' }, { t: 'delta', responseId: 'resp_successor', text: '1. Bar 6: bring in B.' }, { t: 'completed', responseId: 'resp_successor', model: 'gpt-6-astra' });
 await vi.waitFor(() => expect(h.session.state.phase).toBe('done'));
 expect(h.session.state.responses).toMatchObject([{ id: 'resp_first', text: '1. Bar 5: bring in B.', steered: true }, { id: 'resp_successor', text: '1. Bar 6: bring in B.', successorOf: 'resp_first' }]);
 expect(h.session.state.history.map(item => item.phase)).toEqual(['thinking', 'streaming', 'steer-queued', 'steered', 'revising', 'done']);
 await h.session.steer('Already completed'); expect(h.requests).toHaveLength(2);
 await h.start(); expect(h.requests.at(-1)?.body.sessionId).toBe('live-1');
 h.emit({ t: 'created', responseId: 'resp_followup' }, { t: 'completed', responseId: 'resp_followup', model: 'gpt-6-astra' });
 await vi.waitFor(() => expect(h.session.state.responses).toHaveLength(3));
});

it('keeps watch_attempt pending before practice, resolves measured retry once, and identifies the later review', async () => {
 const h = harness(); await h.start();
 h.emit({ t: 'session', sessionId: 'live-1' }, { t: 'created', responseId: 'resp_plan' }, { t: 'tool_call', responseId: 'resp_plan', callId: 'call_watch', name: 'watch_attempt', args: { reason: 'Measure this handoff' }, async: true }, { t: 'completed', responseId: 'resp_plan', model: 'gpt-6-astra' });
 await vi.waitFor(() => expect(h.session.state.phase).toBe('waiting-attempt'));
 h.session.observeAttempt({ status: 'retry', entryError: 9 }); expect(h.requests).toHaveLength(1);
 h.session.observeAttempt({ status: 'running' }); h.session.observeAttempt({ status: 'retry', entryError: -0.32 }); h.session.observeAttempt({ status: 'retry', entryError: -0.32 });
 await vi.waitFor(() => expect(h.requests).toHaveLength(2));
 expect(h.requests[1]).toEqual({ path: '/api/session/tool', body: { sessionId: 'live-1', callId: 'call_watch', output: { status: 'retry', entryError: -0.32, tolerance: 0.25 } } });
 h.emit({ t: 'created', responseId: 'resp_review' }, { t: 'delta', responseId: 'resp_review', text: 'Entry was 0.32s early. This does not verify blend quality.' }, { t: 'completed', responseId: 'resp_review', model: 'gpt-6-astra' });
 await vi.waitFor(() => expect(h.session.state.phase).toBe('done'));
 expect(h.session.state.responses.at(-1)).toMatchObject({ kind: 'review', id: 'resp_review' });
 h.emit({ t: 'tool_call', responseId: 'resp_review', callId: 'call_watch', name: 'watch_attempt', args: {}, async: true });
 await new Promise(resolve => setTimeout(resolve, 0)); expect(h.session.state.pendingCall).toBeNull();
});

it('times out a pending attempt after 120 seconds and stop cancels the next watcher', async () => {
 vi.useFakeTimers(); const h = harness(); await h.start();
 h.emit({ t: 'session', sessionId: 'live-1' }, { t: 'created', responseId: 'resp_plan' }, { t: 'tool_call', responseId: 'resp_plan', callId: 'call_timeout', name: 'watch_attempt', args: {}, async: true }, { t: 'completed', responseId: 'resp_plan', model: 'gpt-6-astra' });
 await vi.advanceTimersByTimeAsync(119999); expect(h.requests).toHaveLength(1);
 await vi.advanceTimersByTimeAsync(1); expect(h.requests[1].body).toMatchObject({ callId: 'call_timeout', output: { status: 'timeout' } });
 h.emit({ t: 'created', responseId: 'resp_review' }, { t: 'tool_call', responseId: 'resp_review', callId: 'call_cancel', name: 'watch_attempt', args: {}, async: true });
 await vi.advanceTimersByTimeAsync(0); h.session.stop(); await vi.advanceTimersByTimeAsync(120000);
 expect(h.requests).toHaveLength(2); expect(h.session.state.phase).toBe('idle'); expect(vi.getTimerCount()).toBe(0);
});

it('cancels before token retrieval can dispatch after stop', async () => {
 const h = harness(); let resolveToken!: (token: string) => void;
 const token = new Promise<string>(resolve => { resolveToken = resolve; });
 const started = h.session.start({ state, brief: 'Watch this', getToken: () => token });
 h.session.stop(); resolveToken('test-only'); await started;
 expect(h.fetch).not.toHaveBeenCalled(); expect(h.session.state.phase).toBe('idle');
});

it('never shows raw upstream errors and requires reauthentication after HTTP 401', async () => {
 const h = harness(); await h.start(); h.emit({ t: 'error', message: 'secret-provider-diagnostic-do-not-render' });
 await vi.waitFor(() => expect(h.session.state.phase).toBe('error'));
 expect(h.session.state.error).not.toContain('secret-provider'); expect(h.session.state.inFlightResponseId).toBeNull();
 h.fetch.mockResolvedValue(new Response(null, { status: 401 })); await h.start();
 expect(h.session.state.signInRequired).toBe(true); const count = h.fetch.mock.calls.length; await h.start(); expect(h.fetch).toHaveBeenCalledTimes(count);
});

it('fails cleanly when the SSE disappears during a pending attempt', async () => {
 const h = harness(); await h.start();
 h.emit({ t: 'session', sessionId: 'live-1' }, { t: 'created', responseId: 'resp_plan' }, { t: 'tool_call', responseId: 'resp_plan', callId: 'call_lost', name: 'watch_attempt', args: {}, async: true }, { t: 'completed', responseId: 'resp_plan', model: 'gpt-6-astra' });
 h.stream.close(); await vi.waitFor(() => expect(h.session.state.phase).toBe('error'));
 h.session.observeAttempt({ status: 'running' }); h.session.observeAttempt({ status: 'complete', entryError: 0.01 });
 expect(h.requests).toHaveLength(1); expect(h.session.state.pendingCall).toBeNull();
});

it('keeps coaching while an early attempt result queues, then starts the actual review after completion', async () => {
 const h = harness(); await h.start();
 h.emit({ t: 'session', sessionId: 'live-1' }, { t: 'created', responseId: 'resp_coaching' }, { t: 'delta', responseId: 'resp_coaching', text: '1. Bar 5: start B.' }, { t: 'tool_call', responseId: 'resp_coaching', callId: 'call_early', name: 'watch_attempt', args: {}, async: true });
 await vi.waitFor(() => expect(h.session.state.pendingCall).not.toBeNull());
 h.session.observeAttempt({ status: 'running' }); h.session.observeAttempt({ status: 'retry' });
 await vi.waitFor(() => expect(h.requests).toHaveLength(2));
 expect(h.session.state.phase).toBe('streaming'); expect(h.session.state.reviewPending).toBe(true);
 h.emit({ t: 'delta', responseId: 'resp_coaching', text: '\n2. Bar 8: blend to B.' });
 await vi.waitFor(() => expect(h.session.state.responses[0].text).toContain('2. Bar 8'));
 expect(h.session.state.phase).toBe('streaming');
 h.emit({ t: 'completed', responseId: 'resp_coaching', model: 'gpt-6-astra' }, { t: 'created', responseId: 'resp_review' });
 await vi.waitFor(() => expect(h.session.state.responses.at(-1)?.kind).toBe('review'));
 expect(h.session.state.reviewPending).toBe(false); expect(h.session.state.phase).toBe('reviewing');
});

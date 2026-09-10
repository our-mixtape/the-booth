import { afterEach, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { authEnv, sessionToken } from './auth-fixture';
import { compactState } from '../src/agent/hints';
import { Session, TrackSchema } from '../src/domain/session';
import type { AudioEngine } from '../src/audio/engine';
// @ts-expect-error The gateway runs directly as Node ESM.
import { createGateway } from '../server/index.mjs';
// @ts-expect-error The session core runs directly as Node ESM.
import { createAstraSession } from '../server/session-core.mjs';

type Json = Record<string, unknown>;
class FakeWebSocket extends EventTarget {
 static instances: FakeWebSocket[] = [];
 readyState = 0;
 sent: Json[] = [];
 constructor(public url: string, public options: unknown) {
  super(); FakeWebSocket.instances.push(this);
  queueMicrotask(() => { this.readyState = 1; this.dispatchEvent(new Event('open')); });
 }
 send(data: string) { this.sent.push(JSON.parse(data)); }
 emit(data: Json) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) })); }
 close() { if (this.readyState === 3) return; this.readyState = 3; this.dispatchEvent(new Event('close')); }
}
const servers: Server[] = [];
const streams: ReadableStreamDefaultReader<Uint8Array>[] = [];
afterEach(async () => {
 await Promise.all(streams.splice(0).map(reader => reader.cancel().catch(() => {})));
 await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); })));
 FakeWebSocket.instances.splice(0).forEach(socket => socket.close());
});
async function gateway(options: Json = {}) {
 const server: Server = createGateway({ key: 'test-only-secret', WebSocketImpl: FakeWebSocket, ...options, env: { ...authEnv, ...options.env as Json } });
 servers.push(server); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
 const address = server.address(); if (!address || typeof address === 'string') throw Error('Missing server address');
 return `http://127.0.0.1:${address.port}`;
}
function state() {
 const tracks = TrackSchema.array().parse(JSON.parse(readFileSync('public/audio/manifest.json', 'utf8')));
 const session = new Session(tracks);
 return compactState({ context: { currentTime: 0 }, snapshot: () => session.snapshot(0) } as AudioEngine);
}
function post(url: string, path: string, body: unknown, claims: Json = {}) {
 return fetch(`${url}/api/session/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken(claims)}` }, body: JSON.stringify(body) });
}
function events(reader: ReadableStreamDefaultReader<Uint8Array>) {
 let buffer = '';
 const decoder = new TextDecoder();
 return async (): Promise<Json> => {
  while (true) {
   const end = buffer.indexOf('\n\n');
   if (end >= 0) { const line = buffer.slice(0, end); buffer = buffer.slice(end + 2); if (line.startsWith('data: ')) return JSON.parse(line.slice(6)); continue; }
   const chunk = await reader.read(); if (chunk.done) throw Error('SSE ended unexpectedly'); buffer += decoder.decode(chunk.value, { stream: true });
  }
 };
}
async function brief(url: string) {
 const response = await post(url, 'brief', { ...state(), brief: 'I am about to attempt. Plan the handoff.', requestId: 'brief-1' });
 expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('text/event-stream');
 const reader = response.body!.getReader(); streams.push(reader); const next = events(reader);
 const session = await next(); expect(session.t).toBe('session');
 await vi.waitFor(() => expect(FakeWebSocket.instances.at(-1)?.sent).toHaveLength(1));
 return { next, reader, sessionId: session.sessionId, socket: FakeWebSocket.instances.at(-1)! };
}
const created = (socket: FakeWebSocket, id = 'resp_first') => socket.emit({ type: 'response.created', response: { id } });
const completed = (socket: FakeWebSocket, id = 'resp_first') => socket.emit({ type: 'response.completed', response: { id, model: 'gpt-6-astra' } });
const toolCall = (socket: FakeWebSocket, responseId = 'resp_first') => socket.emit({ type: 'response.output_item.done', response_id: responseId, item: { type: 'function_call', name: 'watch_attempt', call_id: 'call_attempt', async: true, arguments: '{"reason":"Watch this attempt"}' } });

it('relays brief, created, deltas and completion in order and reuses the owning SSE for another brief', async () => {
 const url = await gateway(); const { socket, next, sessionId } = await brief(url);
 expect(socket.url).toBe('wss://api.openai.com/v1/responses');
 expect(socket.sent[0]).toMatchObject({ type: 'response.create', model: 'gpt-6-astra', store: false, reasoning: { effort: 'low' }, max_output_tokens: 1200, tools: [{ name: 'watch_attempt', async: true }] });
 created(socket); socket.emit({ type: 'future.unknown', ignored: true }); socket.emit({ type: 'response.output_text.delta', response_id: 'resp_first', delta: '1. Bar 1, deck A: keep level steady.' }); completed(socket);
 expect(await next()).toEqual({ t: 'created', responseId: 'resp_first' });
 expect(await next()).toMatchObject({ t: 'delta', text: '1. Bar 1, deck A: keep level steady.' });
 expect(await next()).toMatchObject({ t: 'completed', model: 'gpt-6-astra' });
 expect((await post(url, 'brief', { ...state(), brief: 'Keep it restrained.', requestId: 'brief-2', sessionId })).status).toBe(202);
 expect(socket.sent[1]).toMatchObject({ type: 'response.create', previous_response_id: 'resp_first' });
 expect((await post(url, 'brief', { ...state(), brief: 'Duplicate.', requestId: 'brief-2', sessionId })).status).toBe(409);
});

it('steers the in-flight response and identifies the automatic successor', async () => {
 const url = await gateway(); const { socket, next, sessionId } = await brief(url);
 expect((await post(url, 'steer', { sessionId, text: 'Too soon' })).status).toBe(409);
 created(socket); await next();
 expect((await post(url, 'steer', { sessionId, text: 'Delay B one bar' })).status).toBe(202);
 expect(socket.sent[1]).toEqual({ type: 'response.steer', previous_response_id: 'resp_first', input: 'Delay B one bar' });
 socket.emit({ type: 'response.steer.accepted' }); socket.emit({ type: 'response.incomplete', response: { id: 'resp_first', incomplete_details: { reason: 'steered' } } }); created(socket, 'resp_successor');
 expect(await next()).toEqual({ t: 'steer', status: 'accepted' });
 expect(await next()).toEqual({ t: 'steered', responseId: 'resp_first' });
 expect(await next()).toEqual({ t: 'created', responseId: 'resp_successor', successorOf: 'resp_first' });
 completed(socket, 'resp_successor'); await next();
 expect((await post(url, 'steer', { sessionId, text: 'Too late' })).status).toBe(409);
});

it('queues an async result through steering and sends it exactly once using the completed successor', async () => {
 const url = await gateway(); const { socket, next, sessionId } = await brief(url);
 created(socket); await next(); toolCall(socket);
 expect(await next()).toEqual({ t: 'tool_call', responseId: 'resp_first', callId: 'call_attempt', name: 'watch_attempt', args: { reason: 'Watch this attempt' }, async: true });
 const result = { sessionId, callId: 'call_attempt', output: { status: 'retry', entryError: 0.34, tolerance: 0.25 } };
 expect((await post(url, 'tool', result)).status).toBe(202);
 expect(socket.sent).toHaveLength(1);
 expect((await post(url, 'tool', result)).status).toBe(409);
 socket.emit({ type: 'response.incomplete', response: { id: 'resp_first', incomplete_details: { reason: 'steered' } } });
 expect(socket.sent).toHaveLength(1);
 created(socket, 'resp_successor'); completed(socket, 'resp_successor');
 expect(socket.sent[1]).toMatchObject({ type: 'response.create', previous_response_id: 'resp_successor', reasoning: { effort: 'medium' }, input: [{ type: 'function_call_output', call_id: 'call_attempt', output: JSON.stringify(result.output) }] });
 expect((await post(url, 'tool', { ...result, callId: 'call_unknown' })).status).toBe(409);
});

it('scopes session ownership to both authenticated user and app-session id', async () => {
 const url = await gateway(); const { socket, sessionId } = await brief(url); created(socket);
 for (const claims of [{ sub: 'another_user' }, { sid: 'another_session' }]) {
  expect((await post(url, 'steer', { sessionId, text: 'Take over' }, claims)).status).toBe(404);
  expect((await post(url, 'brief', { ...state(), sessionId, brief: 'Take over', requestId: 'other' }, claims)).status).toBe(404);
  expect((await post(url, 'tool', { sessionId, callId: 'call_attempt', output: { status: 'complete' } }, claims)).status).toBe(404);
 }
 expect(socket.sent).toHaveLength(1);
});

it('closes upstream and forgets ownership when the SSE client disconnects', async () => {
 const url = await gateway(); const { socket, reader, sessionId } = await brief(url);
 await reader.cancel(); await vi.waitFor(() => expect(socket.readyState).toBe(3));
 expect((await post(url, 'steer', { sessionId, text: 'After disconnect' })).status).toBe(404);
});

it('does not dispatch unauthenticated, missing-key or hosted requests', async () => {
 for (const options of [{ key: '' }, { env: { VERCEL: '1', APP_ORIGIN: 'http://127.0.0.1:5173', VERCEL_URL: 'booth-preview.vercel.app' } }]) {
  // Hosted auth requires an allowed HTTPS audience.
  const url = await gateway(options); const claims = 'env' in options ? { azp: 'https://booth-preview.vercel.app' } : {};
  expect((await post(url, 'brief', {}, claims)).status).toBe(503);
  expect((await fetch(`${url}/api/session/brief`, { method: 'POST' })).status).toBe(401);
  expect(await (await fetch(`${url}/api/status`)).json()).toMatchObject({ session: { available: false } });
 }
 const url = await gateway();
 for (const path of ['brief', 'steer', 'tool']) expect((await fetch(`${url}/api/session/${path}`, { method: 'POST' })).status).toBe(401);
 expect(FakeWebSocket.instances).toHaveLength(0);
});

it('rejects malformed, oversized and out-of-range bodies before creating an upstream connection', async () => {
 const url = await gateway(); const headers = { Authorization: `Bearer ${sessionToken()}` };
 expect((await fetch(`${url}/api/session/brief`, { headers })).status).toBe(405);
 expect((await fetch(`${url}/api/session/brief`, { method: 'POST', headers })).status).toBe(415);
 expect((await fetch(`${url}/api/session/brief`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400);
 expect((await post(url, 'brief', { text: 'x'.repeat(17000) })).status).toBe(413);
 for (const extra of [{ brief: 'x'.repeat(1001) }, { requestId: '' }, { effort: 'high' }, { decks: { A: { rate: 9 } } }]) {
  expect((await post(url, 'brief', { ...state(), brief: 'Plan', requestId: 'brief-1', ...extra })).status).toBe(400);
 }
 expect((await post(url, 'steer', { sessionId: 'unknown', text: 'x'.repeat(501) })).status).toBe(400);
 expect((await post(url, 'tool', { sessionId: 'unknown', callId: 'call', output: { status: 'complete', entryError: 999999 } })).status).toBe(400);
 expect((await fetch(`${url}/api/session/unknown`, { method: 'POST', headers })).status).toBe(404);
 expect(FakeWebSocket.instances).toHaveLength(0);
});

it('contains upstream failures without raw errors or key leakage and releases the session', async () => {
 const url = await gateway(); const { socket, next, sessionId } = await brief(url);
 socket.emit({ type: 'error', error: { message: 'test-only-secret private-provider-details' } });
 const error = await next(); expect(error.t).toBe('error');
 expect(JSON.stringify(error)).not.toContain('test-only-secret'); expect(JSON.stringify(error)).not.toContain('private-provider-details');
 expect(socket.readyState).toBe(3);
 expect((await post(url, 'steer', { sessionId, text: 'After failure' })).status).toBe(404);
});

it('ignores idle expiry while an attempt is pending, then closes when the review is idle', async () => {
 const onEvent = vi.fn(); const onClose = vi.fn();
 const core = createAstraSession({ key: 'test-only', WebSocketImpl: FakeWebSocket, onEvent, onClose, idleMs: 20 });
 await core.brief({ state: {}, brief: 'Watch my attempt' }); const socket = FakeWebSocket.instances.at(-1)!;
 created(socket); toolCall(socket); completed(socket);
 await new Promise(resolve => setTimeout(resolve, 55)); expect(socket.readyState).toBe(1);
 core.toolOutput({ callId: 'call_attempt', output: { status: 'timeout' } });
 created(socket, 'resp_review'); completed(socket, 'resp_review');
 await vi.waitFor(() => expect(socket.readyState).toBe(3)); expect(onClose).toHaveBeenCalledTimes(1);
});

it.each(['unknown function', 'malformed arguments', 'oversized arguments', 'wrong model', 'incomplete response', 'malformed event'])('closes safely on %s', async mode => {
 const url = await gateway(); const { socket, next } = await brief(url); created(socket); await next();
 if (mode === 'wrong model') socket.emit({ type: 'response.completed', response: { id: 'resp_first', model: 'another-model' } });
 else if (mode === 'incomplete response') socket.emit({ type: 'response.incomplete', response: { id: 'resp_first', incomplete_details: { reason: 'max_output_tokens' } } });
 else if (mode === 'malformed event') socket.dispatchEvent(new MessageEvent('message', { data: '{' }));
 else socket.emit({ type: 'response.output_item.done', response_id: 'resp_first', item: { type: 'function_call', name: mode === 'unknown function' ? 'move_control' : 'watch_attempt', call_id: 'call_forbidden', async: true, arguments: mode === 'oversized arguments' ? 'x'.repeat(2001) : '{' } });
 expect(await next()).toMatchObject({ t: 'error' }); expect(socket.readyState).toBe(3);
});

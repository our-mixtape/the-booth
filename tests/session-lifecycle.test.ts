import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
// @ts-expect-error The gateway runs directly as Node ESM.
import { createSessionRoute } from '../server/session.mjs';
// @ts-expect-error The session core runs directly as Node ESM.
import { createAstraSession } from '../server/session-core.mjs';

type Json = Record<string, unknown>;
class Socket extends EventTarget {
 static instances: Socket[] = [];
 readyState = 0;
 sent: Json[] = [];
 closeCalls = 0;
 constructor() { super(); Socket.instances.push(this); }
 open() { this.readyState = 1; this.dispatchEvent(new Event('open')); }
 send(data: string) { this.sent.push(JSON.parse(data)); }
 emit(data: Json) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) })); }
 // Intentionally silent: shutdown must not depend on a subsequent socket event.
 close() { this.closeCalls++; this.readyState = 3; }
}
class Response extends EventEmitter {
 statusCode = 0;
 writableEnded = false;
 destroyed = false;
 backpressure = false;
 chunks: string[] = [];
 writeHead(status: number) { this.statusCode = status; }
 write(chunk: string) { this.chunks.push(chunk); return !this.backpressure; }
 end(chunk?: string) { if (chunk) this.chunks.push(chunk); this.writableEnded = true; this.emit('close'); }
 disconnect() { this.destroyed = true; this.emit('close'); }
 events(): Json[] { return this.chunks.filter(chunk => chunk.startsWith('data: ')).map(chunk => JSON.parse(chunk.slice(6))); }
}
const closures: (() => void)[] = [];
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
 closures.splice(0).forEach(close => close());
 Socket.instances.splice(0);
 vi.useRealTimers();
});
const identity = { userId: 'user_dj', sessionId: 'clerk_session' };
const body = { crossfader: 0, requestId: 'brief_one', brief: 'Watch my attempt.' };
const request = (path = 'brief', input: Json = body) => ({ url: `/api/session/${path}`, method: 'POST', headers: { 'content-type': 'application/json' }, body: input });
function route() {
 const value = createSessionRoute({ key: 'test-only', env: {}, stateSchema: z.object({ crossfader: z.number() }), WebSocketImpl: Socket });
 closures.push(value.close);
 return value;
}
function core() {
 const events: Json[] = [], onClose = vi.fn();
 const value = createAstraSession({ key: 'test-only', WebSocketImpl: Socket, onEvent: (event: Json) => events.push(event), onClose });
 closures.push(value.close);
 return { value, events, onClose };
}
const created = (socket: Socket, id = 'resp_plan') => socket.emit({ type: 'response.created', response: { id } });
const completed = (socket: Socket, id = 'resp_plan') => socket.emit({ type: 'response.completed', response: { id, model: 'gpt-6-astra' } });
const watch = (socket: Socket) => socket.emit({ type: 'response.output_item.done', response_id: 'resp_plan', item: { type: 'function_call', name: 'watch_attempt', call_id: 'call_attempt', async: true, arguments: '{"reason":"Wait for the performed attempt"}' } });
async function connected() {
 const result = core();
 const started = result.value.brief({ state: { crossfader: 0 }, brief: 'Watch my attempt.' });
 const socket = Socket.instances.at(-1)!; socket.open(); await started;
 return { ...result, socket };
}

it('settles a connecting brief immediately on cancellation without requiring a socket close event', async () => {
 const { value, onClose } = core();
 const started = value.brief({ state: {}, brief: 'Plan' });
 const rejected = expect(started).rejects.toThrow('closed');
 const socket = Socket.instances.at(-1)!;
 value.close(); await rejected;
 expect(socket.closeCalls).toBe(1);
 expect(onClose).toHaveBeenCalledTimes(1);
 expect(vi.getTimerCount()).toBe(0);
 socket.open();
 expect(socket.sent).toEqual([]);
 await expect(value.brief({ state: {}, brief: 'Again' })).rejects.toThrow('closed');
});

it('forgets a disconnected browser while its upstream socket is still connecting', async () => {
 const handle = route(), res = new Response();
 const started = handle(request(), res, identity);
 const sessionId = res.events()[0].sessionId;
 res.disconnect();
 await expect(started).resolves.toBe(true);
 expect(Socket.instances[0].readyState).toBe(3);
 expect(vi.getTimerCount()).toBe(0);
 const rejected = new Response();
 await handle(request('steer', { sessionId, text: 'After disconnect' }), rejected, identity);
 expect(rejected.statusCode).toBe(404);
});

it('closes every owned stream on shutdown, including connecting sessions, and stops new admission', async () => {
 const handle = route(), first = new Response(), second = new Response();
 const firstStarted = handle(request(), first, identity);
 Socket.instances[0].open(); await firstStarted;
 const secondStarted = handle(request(), second, { ...identity, sessionId: 'second_clerk_session' });
 handle.close(); handle.close();
 await expect(secondStarted).resolves.toBe(true);
 expect(first.writableEnded).toBe(true); expect(second.writableEnded).toBe(true);
 expect(Socket.instances.map(socket => socket.closeCalls)).toEqual([1, 1]);
 expect(vi.getTimerCount()).toBe(0);
 for (const path of ['brief', 'steer', 'tool']) {
  const rejected = new Response(); await handle(request(path), rejected, identity);
  expect(rejected.statusCode).toBe(503);
  expect(rejected.chunks.join('')).toContain('Manual playback continues');
 }
 expect(Socket.instances).toHaveLength(2);
});

it('does not admit a request whose streamed body finishes after shutdown', async () => {
 const handle = route(), res = new Response();
 let supplyBody!: (chunk: string) => void;
 const delayed = new Promise<string>(resolve => { supplyBody = resolve; });
 const req = { ...request(), body: undefined, async *[Symbol.asyncIterator]() { yield await delayed; } };
 const started = handle(req, res, identity);
 handle.close(); supplyBody(JSON.stringify(body)); await started;
 expect(res.statusCode).toBe(503);
 expect(Socket.instances).toHaveLength(0);
 expect(vi.getTimerCount()).toBe(0);
});

it('releases first-event backpressure without starting a socket or leaving heartbeat timers', async () => {
 const handle = route(), res = new Response(); res.backpressure = true;
 await handle(request(), res, identity);
 expect(res.writableEnded).toBe(true);
 expect(Socket.instances).toHaveLength(0);
 expect(vi.getTimerCount()).toBe(0);
});

it('keeps an attempt pending past 30 seconds and the idle boundary, then routes one measured review', async () => {
 const { value, socket, onClose } = await connected();
 created(socket); watch(socket); completed(socket);
 await vi.advanceTimersByTimeAsync(31000);
 expect(socket.readyState).toBe(1);
 await vi.advanceTimersByTimeAsync(60000);
 expect(socket.readyState).toBe(1); expect(onClose).not.toHaveBeenCalled();
 const output = { status: 'retry', entryError: 0.34, tolerance: 0.25 };
 value.toolOutput({ callId: 'call_attempt', output });
 expect(socket.sent[1]).toMatchObject({ type: 'response.create', previous_response_id: 'resp_plan', input: [{ type: 'function_call_output', call_id: 'call_attempt', output: JSON.stringify(output) }] });
 expect(() => value.toolOutput({ callId: 'call_attempt', output })).toThrow('already resolved');
 created(socket, 'resp_review'); completed(socket, 'resp_review');
 await vi.advanceTimersByTimeAsync(59999);
 expect(socket.readyState).toBe(1);
 await vi.advanceTimersByTimeAsync(1);
 expect(socket.readyState).toBe(3); expect(onClose).toHaveBeenCalledTimes(1);
});

it('retains the 150-second bound on an unanswered attempt', async () => {
 const { value, socket, events, onClose } = await connected();
 created(socket); watch(socket); completed(socket);
 await vi.advanceTimersByTimeAsync(149999);
 expect(socket.readyState).toBe(1);
 await vi.advanceTimersByTimeAsync(1);
 expect(socket.readyState).toBe(3); expect(onClose).toHaveBeenCalledTimes(1);
 expect(events.at(-1)).toMatchObject({ t: 'error', message: expect.stringContaining('attempt wait expired') });
 expect(() => value.toolOutput({ callId: 'call_attempt', output: { status: 'timeout' } })).toThrow();
 expect(vi.getTimerCount()).toBe(0);
});

it('retains the 90-second response timeout even when transport events continue', async () => {
 const { socket, events } = await connected(); created(socket);
 for (let index = 0; index < 2; index++) { await vi.advanceTimersByTimeAsync(30000); socket.emit({ type: 'future.keepalive' }); }
 await vi.advanceTimersByTimeAsync(29999); expect(socket.readyState).toBe(1);
 await vi.advanceTimersByTimeAsync(1); expect(socket.readyState).toBe(3);
 expect(events.at(-1)).toMatchObject({ t: 'error', message: expect.stringContaining('response timed out') });
});

it('retains the 55-minute maximum connection lifetime despite continued activity', async () => {
 const { socket, events } = await connected(); created(socket); completed(socket);
 for (let index = 0; index < 109; index++) { await vi.advanceTimersByTimeAsync(30000); socket.emit({ type: 'future.keepalive' }); }
 await vi.advanceTimersByTimeAsync(29999); expect(socket.readyState).toBe(1);
 await vi.advanceTimersByTimeAsync(1); expect(socket.readyState).toBe(3);
 expect(events.at(-1)).toMatchObject({ t: 'error', message: expect.stringContaining('session ended') });
 expect(vi.getTimerCount()).toBe(0);
});

it('counts automatic native-steering successors toward the 64-response session limit', async () => {
 const { value, socket, events } = await connected(); created(socket);
 let previous = 'resp_plan';
 for (let index = 2; index <= 65; index++) {
  value.steer('Delay B one bar');
  socket.emit({ type: 'response.steer.accepted' });
  socket.emit({ type: 'response.incomplete', response: { id: previous, incomplete_details: { reason: 'steered' } } });
  const successor = `resp_${index}`; created(socket, successor);
  if (index <= 64) {
   expect(socket.readyState).toBe(1);
   expect(events.at(-1)).toEqual({ t: 'created', responseId: successor, successorOf: previous });
  }
  previous = successor;
 }
 expect(socket.sent.filter(message => message.type === 'response.create')).toHaveLength(1);
 expect(socket.readyState).toBe(3);
 expect(events.at(-1)).toMatchObject({ t: 'error', message: expect.stringContaining('limit reached') });
 expect(vi.getTimerCount()).toBe(0);
});

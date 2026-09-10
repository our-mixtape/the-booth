import { afterEach, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { authEnv, sessionToken } from './auth-fixture';
import { compactState } from '../src/agent/hints';
import { Session, TrackSchema } from '../src/domain/session';
import type { AudioEngine } from '../src/audio/engine';
// @ts-expect-error Node ESM gateway.
import { createGateway } from '../server/index.mjs';
// @ts-expect-error Node ESM configuration.
import { gatewayConfig, validateGatewayCredentials } from '../server/config.mjs';

const origin = 'https://booth.example';
const env = { ...authEnv, GATEWAY_MODE: 'persistent', APP_ORIGIN: origin };
type Json = Record<string, unknown>;
class Socket extends EventTarget {
 static all: Socket[] = [];
 readyState = 0;
 sent: Json[] = [];
 constructor() { super(); Socket.all.push(this); queueMicrotask(() => { this.readyState = 1; this.dispatchEvent(new Event('open')); }); }
 send(data: string) { this.sent.push(JSON.parse(data)); }
 emit(data: Json) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) })); }
 close() { this.readyState = 3; }
}
const servers: Server[] = [];
afterEach(async () => {
 await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); })));
 Socket.all.splice(0);
});
async function gateway() {
 const server: Server = createGateway({ key: 'test-only', env, WebSocketImpl: Socket }); servers.push(server);
 await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
 const address = server.address(); if (!address || typeof address === 'string') throw Error('Missing address');
 return { server, url: `http://127.0.0.1:${address.port}` };
}
const headers = () => ({ Origin: origin, Authorization: `Bearer ${sessionToken({ azp: origin })}`, 'Content-Type': 'application/json' });
function briefState() {
 const session = new Session(TrackSchema.array().parse(JSON.parse(readFileSync('public/audio/manifest.json', 'utf8'))));
 return { ...compactState({ context: { currentTime: 0 }, snapshot: () => session.snapshot(0) } as AudioEngine), brief: 'Watch my attempt', requestId: 'hosted-brief' };
}
const post = (url: string, path: string, body: unknown) => fetch(`${url}/api/session/${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });

it('uses explicit production origins/ports and rejects unsafe startup configuration', () => {
 expect(gatewayConfig({})).toMatchObject({ port: 8787, host: '127.0.0.1', production: false });
 expect(gatewayConfig({ ...env, PORT: '9000', ALLOWED_ORIGINS: 'https://preview.example' })).toMatchObject({ port: 9000, host: '0.0.0.0', origins: new Set([origin, 'https://preview.example']) });
 expect(gatewayConfig({ ...env, PORT: '9000', GATEWAY_PORT: '9001' }).port).toBe(9001);
 for (const APP_ORIGIN of ['http://booth.example', 'https://booth.example/path', 'https://user:secret@booth.example', '*', 'null', 'https://booth.example?query', 'https://booth.example#fragment']) expect(() => gatewayConfig({ ...env, APP_ORIGIN })).toThrow();
 for (const PORT of ['0', '-1', '65536', 'abc', '80.5']) expect(() => gatewayConfig({ ...env, PORT })).toThrow();
 expect(() => gatewayConfig({ GATEWAY_MODE: 'persistent' })).toThrow();
 expect(() => gatewayConfig({ ...env, VERCEL: '1' })).toThrow();
 expect(() => validateGatewayCredentials({})).toThrow('OPENAI_API_KEY');
 expect(() => validateGatewayCredentials({ OPENAI_API_KEY: 'test-only' })).toThrow('CLERK_SECRET_KEY');
 expect(() => validateGatewayCredentials({ OPENAI_API_KEY: 'test-only', ...authEnv })).not.toThrow();
});

it('answers exact-origin CORS preflights without auth, then requires a correctly signed authorized-party token', async () => {
 const { url } = await gateway();
 for (const path of ['brief', 'steer', 'tool']) {
  const response = await fetch(`${url}/api/session/${path}`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization, content-type' } });
  expect(response.status).toBe(204); expect(response.headers.get('access-control-allow-origin')).toBe(origin);
  expect(response.headers.get('access-control-allow-credentials')).toBeNull(); expect(response.headers.get('vary')).toBe('Origin');
 }
 const invalidPreflights: Record<string,string>[] = [{ Origin: 'https://attacker.example' }, { 'Access-Control-Request-Headers': 'x-user-id' }, { 'Access-Control-Request-Method': 'DELETE' }];
 for (const invalid of invalidPreflights) {
  expect((await fetch(`${url}/api/session/brief`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', ...invalid } })).status).toBe(403);
 }
 expect((await fetch(`${url}/api/session/brief`, { method: 'POST', headers: { Origin: origin } })).status).toBe(401);
 expect((await fetch(`${url}/api/session/brief`, { method: 'POST', headers: { ...headers(), Authorization: `Bearer ${sessionToken()}` } })).status).toBe(401);
 expect((await post(url, 'brief', {})).status).toBe(400);
 expect(Socket.all).toHaveLength(0);
});

it('does not expose the local private collection in persistent mode and keeps hint fallback authenticated', async () => {
 const { url } = await gateway();
 expect(await (await fetch(`${url}/healthz`)).json()).toEqual({ ok: true });
 expect(await (await fetch(`${url}/api/status`, { headers: { Origin: origin } })).json()).toMatchObject({ session: { available: true }, auth: { configured: true } });
 expect(await (await fetch(`${url}/api/library`)).json()).toMatchObject({ tracks: [] });
 expect((await fetch(`${url}/api/exercise`)).status).toBe(503);
 expect((await fetch(`${url}/api/library/private/manifest.json`)).status).toBe(404);
 expect((await fetch(`${url}/api/hint`, { method: 'POST' })).status).toBe(401);
 expect((await fetch(`${url}/api/hint`, { method: 'POST', headers: headers(), body: '{}' })).status).toBe(400);
});

it('keeps a real HTTP/SSE connection pending beyond 30 seconds and routes its result only on its owner', async () => {
 const { url, server } = await gateway(); const other = await gateway();
 const response = await post(url, 'brief', briefState());
 expect(response.status).toBe(200); expect(response.headers.get('access-control-allow-origin')).toBe(origin);
 expect(server.timeout).toBe(0);
 const reader = response.body!.getReader();
 const first = new TextDecoder().decode((await reader.read()).value);
 const { sessionId } = JSON.parse(first.split('\n').find(line => line.startsWith('data: '))!.slice(6));
 await vi.waitFor(() => expect(Socket.all[0]?.sent).toHaveLength(1)); const socket = Socket.all[0];
 socket.emit({ type: 'response.created', response: { id: 'resp_pending' } });
 socket.emit({ type: 'response.output_item.done', response_id: 'resp_pending', item: { type: 'function_call', name: 'watch_attempt', call_id: 'call_long_attempt', async: true, arguments: '{"reason":"Wait for this attempt"}' } });
 socket.emit({ type: 'response.completed', response: { id: 'resp_pending', model: 'gpt-6-astra' } });
 const started = performance.now();
 await new Promise(resolve => setTimeout(resolve, 31000));
 expect(performance.now() - started).toBeGreaterThan(30000); expect(socket.readyState).toBe(1);
 const result = { sessionId, callId: 'call_long_attempt', output: { status: 'retry', entryError: 0.5, tolerance: 0.25 } };
 expect((await post(other.url, 'tool', result)).status).toBe(404);
 expect((await post(url, 'tool', result)).status).toBe(202);
 expect(socket.sent[1]).toMatchObject({ previous_response_id: 'resp_pending', input: [{ type: 'function_call_output', call_id: 'call_long_attempt' }] });
 expect((await post(url, 'tool', result)).status).toBe(409);
 await reader.cancel(); await vi.waitFor(() => expect(socket.readyState).toBe(3));
 expect((await post(url, 'tool', result)).status).toBe(404);
}, 40000);

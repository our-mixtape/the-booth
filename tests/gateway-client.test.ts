import { afterEach, expect, it, vi } from 'vitest';
import { gatewayOrigin, sessionAvailability } from '../src/agent/gateway';
import { sessionFetch } from '../src/auth/session';
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it('pins every session request to the configured origin while hints and voice keep their same-origin contract', async () => {
 vi.stubEnv('VITE_ASTRA_GATEWAY_ORIGIN', 'https://gateway.example');
 const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
 for (const path of ['/api/session/brief', '/api/session/steer', '/api/session/tool', '/api/hint', '/api/voice/session'] as const) {
  await sessionFetch(async () => 'test-token', path, { method: 'POST', body: '{}' });
  const [url, options] = fetch.mock.calls.at(-1)!;
  expect(url).toBe(path.startsWith('/api/session/') ? `https://gateway.example${path}` : path);
  expect(options).toMatchObject({ redirect: 'error', credentials: 'same-origin' });
  expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer test-token');
 }
});

it('checks external session readiness without forwarding a bearer token or cross-origin cookies', async () => {
 vi.stubEnv('VITE_ASTRA_GATEWAY_ORIGIN', 'https://gateway.example');
 const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ session: { available: true } })));
 expect(await sessionAvailability(new AbortController().signal)).toBe(true);
 expect(fetch).toHaveBeenCalledWith('https://gateway.example/api/status', expect.objectContaining({ credentials: 'same-origin', redirect: 'error' }));
 expect(fetch.mock.calls[0][1]?.headers).toBeUndefined();
});

it('fails closed for unsafe destinations and permits HTTP loopback only in development', () => {
 vi.stubEnv('DEV', false);
 expect(gatewayOrigin('')).toBe(''); expect(gatewayOrigin('https://gateway.example/')).toBe('https://gateway.example');
 for (const value of ['http://127.0.0.1:8792', 'http://gateway.example', '//gateway.example', 'https://key@gateway.example', 'https://gateway.example/api', 'https://gateway.example?key=secret', 'https://gateway.example#x']) expect(() => gatewayOrigin(value)).toThrow();
 vi.stubEnv('DEV', true); expect(gatewayOrigin('http://127.0.0.1:8792')).toBe('http://127.0.0.1:8792');
 expect(() => gatewayOrigin('http://elsewhere.example')).toThrow();
});

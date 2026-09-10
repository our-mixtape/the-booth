import { afterEach, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { authEnv, sessionToken } from './auth-fixture';
// @ts-expect-error The gateway runs directly as Node ESM.
import { createGateway } from '../server/index.mjs';
const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }))); });
async function gateway(env: Record<string, string> = authEnv) {
 const upstream = vi.fn(async () => ({ ok: false, status: 503 }));
 const server: Server = createGateway({ env, key: 'test-only-model-key', request: upstream }); servers.push(server);
 await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
 const address = server.address(); if (!address || typeof address === 'string') throw Error('Missing address');
 return { url: `http://127.0.0.1:${address.port}`, upstream };
}
const endpoints = ['/api/hint', '/api/voice/session'];
it('rejects anonymous, forged and expired sessions on both paid endpoints before upstream calls', async () => {
 const { url, upstream } = await gateway();
 const valid = sessionToken();
 const now = Math.floor(Date.now() / 1000);
 const invalid = [undefined, 'fake-client-user-id', valid.replace(/\.[^.]+$/, '.Zm9yZ2Vk'), sessionToken({ exp: now - 60 }), sessionToken({ nbf: now + 120 }), sessionToken({ iat: now + 120 }), sessionToken({ azp: 'https://attacker.example' }), sessionToken({ azp: undefined }), sessionToken({ iss: 'https://other.clerk.accounts.dev' }), sessionToken({ sts: 'pending' }), sessionToken({ sid: undefined }), sessionToken({ sub: undefined }), sessionToken({}, { cat: 'm2m' })];
 for (const endpoint of endpoints) for (const token of invalid) {
  const response = await fetch(url + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-User-Id': 'user_booth_test' }, body: '{}' });
  expect(response.status, `${endpoint}: case ${invalid.indexOf(token)}`).toBe(401);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('www-authenticate')).toBe('Bearer');
  expect(await response.json()).toMatchObject({ code: 'sign_in_required' });
 }
 expect(upstream).not.toHaveBeenCalled();
});
it('ignores cookies and forged Vercel identity headers without a bearer session', async () => {
 const { url, upstream } = await gateway();
 for (const endpoint of endpoints) expect((await fetch(url + endpoint, { method: 'POST', headers: { Cookie: `__session=${sessionToken()}`, 'X-Vercel-Id': 'fake', 'X-Vercel-Protection-Bypass': 'fake' } })).status).toBe(401);
 expect(upstream).not.toHaveBeenCalled();
});
it('accepts verified sessions without Origin, but rejects hostile Origin even with a valid session', async () => {
 const { url, upstream } = await gateway();
 for (const endpoint of endpoints) {
  const response = await fetch(url + endpoint, { method: 'POST', headers: { Authorization: `Bearer ${sessionToken()}` } });
  expect(response.status).toBe(415); // Reached input validation after real signature/session checks.
  expect((await fetch(url + endpoint, { method: 'POST', headers: { Authorization: `Bearer ${sessionToken()}`, Origin: 'https://attacker.example' } })).status).toBe(403);
 }
 expect(upstream).not.toHaveBeenCalled();
});
it('fails closed without auth configuration while public status and local playback assets remain usable', async () => {
 const { url, upstream } = await gateway({});
 expect(await (await fetch(url + '/api/status')).json()).toMatchObject({ auth: { required: true, configured: false } });
 for (const endpoint of endpoints) {
  expect((await fetch(url + endpoint, { method: 'POST' })).status).toBe(401);
  expect((await fetch(url + endpoint, { method: 'POST', headers: { Authorization: `Bearer ${sessionToken()}` } })).status).toBe(503);
 }
 expect(upstream).not.toHaveBeenCalled();
});
it('optionally restricts verified users to a server-side beta access list', async () => {
 const { url, upstream } = await gateway({ ...authEnv, ASTRA_ALLOWED_USER_IDS: 'user_invited' });
 for (const endpoint of endpoints) {
  expect((await fetch(url + endpoint, { method: 'POST', headers: { Authorization: `Bearer ${sessionToken()}` } })).status).toBe(403);
  expect((await fetch(url + endpoint, { method: 'POST', headers: { Authorization: `Bearer ${sessionToken({ sub: 'user_invited' })}` } })).status).toBe(415);
 }
 expect(upstream).not.toHaveBeenCalled();
});

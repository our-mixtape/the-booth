import { afterEach, expect, it, vi } from 'vitest';
import { sessionFetch, SignInRequiredError } from '../src/auth/session';
afterEach(() => vi.restoreAllMocks());
it('does not dispatch a request without a token', async () => {
 const request = vi.spyOn(globalThis, 'fetch');
 await expect(sessionFetch(async () => null, '/api/hint', {})).rejects.toBeInstanceOf(SignInRequiredError);
 expect(request).not.toHaveBeenCalled();
});
it('cancels before dispatch when sign-out happens during token retrieval', async () => {
 const request = vi.spyOn(globalThis, 'fetch'); const abort = new AbortController();
 let finish: (token: string) => void = () => {};
 const token = new Promise<string>(resolve => { finish = resolve; });
 const pending = sessionFetch(() => token, '/api/hint', { signal: abort.signal });
 abort.abort(); finish('no-longer-authorized');
 await expect(pending).rejects.toMatchObject({ name: 'AbortError' }); expect(request).not.toHaveBeenCalled();
});
it('sends a fresh bearer token while preserving same-site Vercel protection cookies', async () => {
 const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
 await sessionFetch(async () => 'session-only', '/api/voice/session', { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: 'offer' });
 const [path, options] = request.mock.calls[0];
 expect(path).toBe('/api/voice/session'); expect(options).toMatchObject({ credentials: 'same-origin', redirect: 'error', body: 'offer' });
 expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer session-only');
 expect(new Headers(options?.headers).get('Content-Type')).toBe('application/sdp');
});
it('does not retry a rejected session or follow an authentication redirect', async () => {
 const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
 await expect(sessionFetch(async () => 'expired', '/api/hint', {})).rejects.toBeInstanceOf(SignInRequiredError);
 expect(request).toHaveBeenCalledTimes(1);
});

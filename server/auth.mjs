import { createClerkClient } from '@clerk/backend';

/** A browser session is required even when deployment protection is enabled. */
export function createSessionAuth({ env, origins }) {
 const publishableKey = env.CLERK_PUBLISHABLE_KEY || env.VITE_CLERK_PUBLISHABLE_KEY;
 // Clerk publishable keys encode the instance's frontend API hostname, terminated by '$'.
 const frontendApi = Buffer.from((publishableKey || '').split('_')[2] || '', 'base64').toString('utf8');
 const issuer = /^[a-z0-9.-]+\$$/i.test(frontendApi) ? `https://${frontendApi.slice(0, -1)}` : null;
 const configured = !!(issuer && env.CLERK_SECRET_KEY && origins.size);
 const allowedUsers = new Set((env.ASTRA_ALLOWED_USER_IDS || '').split(',').map(id => id.trim()).filter(Boolean));
 let client;
 const denied = { status: 401, code: 'sign_in_required', error: 'Sign in to The Booth to use Astra and voice.' };
 return {
  configured,
  async authorize(req) {
   // Require an explicit bearer token. Cookies, client user IDs and Vercel headers are not app authentication.
   const authorization = req.headers.authorization;
   if (typeof authorization !== 'string' || authorization.length > 8192 || !/^Bearer [^\s]+$/i.test(authorization)) return denied;
   if (!configured) return { status: 503, code: 'auth_unavailable', error: 'Sign-in is temporarily unavailable. You can keep mixing.' };
   try {
    client ??= createClerkClient({ publishableKey, secretKey: env.CLERK_SECRET_KEY, jwtKey: env.CLERK_JWT_KEY, telemetry: { disabled: true } });
    // Use a configured origin, never an untrusted Host/X-Forwarded-Host header. The SDK checks the token's azp.
    const request = new globalThis.Request(new URL(req.url, [...origins][0]), { headers: { Authorization: authorization } });
    const result = await client.authenticateRequest(request, { authorizedParties: [...origins], acceptsToken: 'session_token' });
    const auth = result.toAuth({ treatPendingAsSignedOut: true });
    if (!auth?.isAuthenticated || !auth.userId || !auth.sessionId || auth.sessionClaims.iss !== issuer) return denied;
    if (allowedUsers.size && !allowedUsers.has(auth.userId)) return { status: 403, code: 'access_denied', error: 'This account does not have Astra access yet. You can keep mixing.' };
    return { userId: auth.userId, sessionId: auth.sessionId };
   } catch {
    // Never echo tokens, provider errors or configuration details to the browser.
    return denied;
   }
  },
 };
}

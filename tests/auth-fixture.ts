import { generateKeyPairSync, sign } from 'node:crypto';

// Ephemeral keys for real SDK signature verification; never written to disk or used by the app.
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
export const authEnv = {
 CLERK_SECRET_KEY: "sk_test_not_a_credential_offline_verification_only",
 CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from('booth-test.clerk.accounts.dev$').toString('base64')}`,
 CLERK_JWT_KEY: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
};
export function sessionToken(claims: Record<string, unknown> = {}, header: Record<string, unknown> = {}) {
 const now = Math.floor(Date.now() / 1000);
 const payload = { iss: 'https://booth-test.clerk.accounts.dev', sub: 'user_booth_test', sid: 'sess_booth_test', azp: 'http://127.0.0.1:5173', iat: now, nbf: now - 1, exp: now + 60, v: 2, sts: 'active', ...claims };
 const encode = (data: unknown) => Buffer.from(JSON.stringify(data)).toString('base64url');
 const data = `${encode({ alg: 'RS256', typ: 'JWT', kid: 'ephemeral-test-key', ...header })}.${encode(payload)}`;
 return `${data}.${sign('RSA-SHA256', Buffer.from(data), keys.privateKey).toString('base64url')}`;
}

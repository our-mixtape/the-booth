# Booth accounts and API access

Production configuration checkpoint, September 10, 2026. Andrew added `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in Vercel. Deployment `dpl_4vXvVK8bSj27UooQYEfLuvx9E3EE` now reports `auth.configured: true`; the built publishable key identifies a Clerk development instance. Real account sign-in and an authenticated model request remain unverified. Existing Vercel protection remains in place; no DNS or existing Mixtape authentication changes were made. Configuration presence is not proof of a completed login or matching-key token verification.

## What is implemented

Visitors can use the instrument without an account. The header and Astra panel offer sign-in. A configured Clerk application opens its managed sign-in/sign-up modal, styled in the Booth palette. Email verification, Google sign-in, account recovery and other methods follow the settings of that Clerk application. The account sheet provides account management and sign-out. Without configuration, the UI explicitly says sign-in is being set up and keeps free play available.

Clerk owns credentials and sessions; this project stores no passwords. The browser obtains a session token just before each model request and sends it in `Authorization: Bearer …`. Same-origin cookies remain enabled so Vercel deployment protection can coexist. The gateway authenticates the bearer token independently of cookies, `Origin`, user IDs or Vercel headers. Tokens and account details are not added to Astra's input, URLs, local storage or logs by application code.

| Request | Application access |
| --- | --- |
| `POST /api/hint` | Verified Clerk session required before parsing state or contacting OpenAI |
| `POST /api/voice/session` | Same verification before exchanging an SDP offer |
| `GET /api/status` | Public readiness only; includes `auth.required` and `auth.configured` |
| Instrument, original fixtures and local controls | No application login required |

Missing/invalid/expired tokens return **401** with `sign_in_required`. The verifier checks signatures, timing, the exact Clerk instance issuer, authorized site origins and a completed user session. Machine tokens and pending sessions are rejected. Missing server auth configuration fails closed. Optional `ASTRA_ALLOWED_USER_IDS` restricts both model routes to selected verified users; other accounts receive **403**. Otherwise all signed-in users have access.

Sign-out immediately aborts pending hints and closes the voice peer and microphone. A changed/expired client session does the same. Late hint responses are discarded. Voice checks client session availability every 30 seconds and retains its existing two-minute client timeout. Manual playback and camera ownership remain independent. Same-site sign-in completion uses history navigation to preserve the mounted instrument; Google uses a popup. A full browser navigation/reload still loses in-memory track selections, as before.

## Connect a provider

1. Sign in to the [Clerk dashboard](https://dashboard.clerk.com/) and create a separate application named **Mixtape — The Booth**. Start with email verification codes; enable Google if desired. Do not reuse or alter charity-jukebox authentication. For a restricted trial, use Clerk's restricted sign-up/invitations and/or the server user-ID list below.
2. For local integration testing, use a Clerk development instance. Add its public key and server secret to an ignored local `.env` if local real-login testing is wanted. **No local OpenAI key is needed or requested.** Real email/Google delivery must be tested with that provider; the repository's browser identity fixtures are not a real login.
3. In the Booth Vercel project's environment settings, configure the keys for the intended deployment environment. Set **`VITE_CLERK_PUBLISHABLE_KEY`** to the public publishable key, **`CLERK_SECRET_KEY`** to the corresponding server secret (Sensitive), and **`APP_ORIGIN`** to the exact site origin. The server normally reads the same public key; `CLERK_PUBLISHABLE_KEY` is an optional server override and must identify the same instance. Keep the existing `OPENAI_API_KEY` exclusively server-side. Never send secret keys in chat or use a `VITE_` prefix for a secret.
4. A real Clerk production instance requires an owned domain, the provider's DNS verification/certificates and production OAuth credentials for Google. That setup is separate from this local iteration and needs coordination with the Booth's eventual domain. Development keys are for protected development/staging validation, not a completed production login. Changing Vite's publishable key requires a new build/deployment.
5. Keep Vercel **All Deployments** protection enabled while verifying sign-up, email code delivery, existing-user sign-in, Google popup completion, refresh/session persistence, sign-out, expired sessions and anonymous API rejection on the hosted application. Vercel protection still restricts who can reach the site before app login. Broader public access is a later explicit deployment decision.

Optional server configuration:

```dotenv
# Comma-separated verified Clerk user IDs; empty permits any authenticated user.
ASTRA_ALLOWED_USER_IDS=user_first,user_second
# Optional PEM public verification key from the same instance, to avoid a JWKS lookup.
# The installed backend SDK still requires CLERK_SECRET_KEY.
CLERK_JWT_KEY=
```

Allowed `azp` origins are the explicit `APP_ORIGIN`, Vercel's deployment and project production URLs, and localhost/127.0.0.1:5173 only outside Vercel. Do not replace this with a wildcard. No custom domain has been configured by this task.

## Boundaries and verification

Authentication limits who can begin a model call; it is not a distributed quota or budget cap. The existing five-second per-process guards remain. Before opening sign-up broadly, add durable per-user quotas and a global spend limit, or restrict the beta to selected accounts. A signed-in user can call their authorized endpoint directly. A short-lived JWT may remain usable until expiry after provider-side revocation, and a request already sent upstream cannot be undone by signing out. Existing WebRTC sessions are closed by the client; the current two-minute timer is not an enforceable server-side spending cap.

`pnpm test` exercises real SDK verification using fresh RSA keys generated only in test memory. Both authorized gateway payloads and rejected anonymous, forged, expired, future, wrong-origin, wrong-issuer, machine and pending-session requests are covered without a paid call. `tests/auth-client.test.ts` checks cancellation while obtaining a token and preservation of Vercel cookies. Browser tests intercept only the frontend provider module to supply an explicitly simulated identity; there is **no runtime test-login flag** or server authentication bypass. The fixture modules under `tests/` are not part of the Vite production bundle. These checks establish application behavior, not Clerk email/OAuth delivery or a live model conversation.

Current evidence and exact run outcomes are recorded in [BUILD_LOG](BUILD_LOG.md) and [the account screenshots](evidence/auth/README.md).

References checked September 10, 2026: [Clerk React setup](https://clerk.com/docs/react/getting-started/quickstart), [server request authentication](https://clerk.com/docs/reference/backend/authenticate-request), [managed sign-in](https://clerk.com/docs/react/reference/components/authentication/sign-in), [production requirements](https://clerk.com/docs/guides/development/deployment/production). Installed SDK source/types were also checked; in particular, backend 3.17.2 requires a secret key even when a public JWT verification key is supplied.

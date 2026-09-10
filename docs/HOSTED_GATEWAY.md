# Persistent Astra gateway

The app remains on **https://mixtape-the-booth.vercel.app**. The user selected a portable gateway on September 10, 2026 and subsequently provided signed-in access to Andrew's Render workspace. The app was [redeployed to Vercel](evidence/hosted-gateway/vercel-release.json) at the user’s request. Render service configuration is in progress; this is **not deployed remote-session evidence**. See [verification](evidence/hosted-gateway/README.md).

## Deployment shape

The browser sends `/api/session/brief`, `/steer`, and `/tool` directly to one configured HTTPS origin. The initial POST owns the SSE response; the same Node process owns its OpenAI Responses WebSocket, Clerk user/session identity, pending calls, and subsequent requests. Authenticated HTTP/SSE bodies and event types are unchanged. The browser retrieves a fresh Clerk bearer token for every action. No cookies or tokens are sent to a new origin discovered from page input; the destination is a validated build-time setting.

The original `/api/hint` and optional `/api/voice/session` still use the Vercel app origin. Gateway readiness is independent of HTTP-hint readiness, and gateway failure cannot issue mixer commands. No mix audio is sent to Astra. Production library routes return no private tracks; the container only includes server code and locked dependencies.

**Run exactly one gateway process and one replica.** Do not use PM2 cluster mode, autoscaling, round-robin upstreams, or overlapping blue/green replicas on the same hostname. All session requests must reach the process that accepted the stream. A request reaching another process returns 404 and is not replayed or migrated. A restart ends sessions; the DJ may brief again while manual playback continues. No shared-state or reconnect-resume claim is made.

Vercel currently supports [WebSockets](https://vercel.com/docs/functions/websockets) and [Services on Fluid compute](https://vercel.com/kb/guide/vercel-services-fluid-compute). These do not establish process affinity for separate HTTP steer/tool requests. Function instances can vary, and connections have duration limits. A Vercel-only adaptation of these contracts would need a shared message relay and its own verification; simply increasing `maxDuration` is insufficient. The existing Vercel stateless adapter intentionally does not expose live sessions.

## Required account and host information

To activate remote sessions, provide:

1. An approved existing VM/container service, account/project/service ID, region, and deployment access (SSH or provider CLI). It must permit **one always-running Node 25.5.0 process**, inbound HTTPS streams longer than 150 seconds and up to the 55-minute session cap, and outbound HTTPS/WSS to OpenAI and Clerk. No sleep-to-zero or arbitrary request reassignment during a session.
2. An approved gateway hostname with TLS routing to that service. This task has made no DNS changes. Do not use the charity-jukebox server or change its origin/authentication.
3. Server-side `OPENAI_API_KEY` with verified `gpt-6-astra` access; the existing Booth `CLERK_SECRET_KEY` and matching `CLERK_PUBLISHABLE_KEY` (or `VITE_CLERK_PUBLISHABLE_KEY`). Supply secrets through the host's secret store, not chat, Git, build args, browser URLs, or `VITE_` secret names.
4. The exact browser origins permitted by Clerk and CORS: production app origin, plus each deliberately allowed preview origin. No wildcard preview suffix. The Clerk application must support sign-in on those origins. Optionally restrict access with `ASTRA_ALLOWED_USER_IDS`.
5. Access to Vercel's Booth project to set the public `VITE_ASTRA_GATEWAY_ORIGIN` and rebuild. Keep deployment protection. A real signed-in browser session is then needed for the remote acceptance run.

## Run without containers

Prerequisites: Node **25.5.0**, pnpm **10.27.0**, an HTTPS reverse proxy, and one process supervisor. This exact Node version preserves the already-verified built-in WebSocket request-header behavior; do not assume another runtime behaves identically.

```sh
pnpm install --frozen-lockfile
pnpm start:gateway
```

`start:gateway` reads an optional ignored `.env.gateway` and always enables persistent mode. Put the following in the host secret store or that file (mode 600), using real approved values in place of the examples:

```dotenv
APP_ORIGIN=https://mixtape-the-booth.vercel.app
ALLOWED_ORIGINS=https://the-explicitly-approved-preview.example
GATEWAY_HOST=127.0.0.1
PORT=8787
OPENAI_API_KEY=use-the-host-secret-store
CLERK_SECRET_KEY=use-the-host-secret-store
CLERK_PUBLISHABLE_KEY=the-matching-Booth-publishable-key
```

Omit `ALLOWED_ORIGINS` if no preview is allowed. `GATEWAY_PORT` overrides `PORT`; under `pnpm dev`, `PORT` remains the frontend port. Persistent mode defaults the listener to `0.0.0.0`, allowing container ingress. For a proxy on the same machine, explicitly bind `127.0.0.1`. Keep the plaintext Node port private. Invalid origins/ports or missing production credentials stop startup. `/healthz` is a no-secret liveness probe; `/api/status` reports configuration readiness, **not verified model access**.

## Docker with Caddy HTTPS

`Dockerfile.gateway` and Caddy are pinned to the locally checked image digests. Docker Desktop is sufficient for local image validation; use the approved host for publication. Make an ignored `.env.gateway` with the values above, and add `GATEWAY_DOMAIN=the-approved-hostname` (without a URL scheme). The compose file fixes one private gateway port and exposes only Caddy on ports 80/443.

```sh
docker build -f Dockerfile.gateway -t booth-astra-gateway:local .
docker compose --env-file .env.gateway -f deploy/gateway.compose.yaml config --quiet
docker compose --env-file .env.gateway -f deploy/gateway.compose.yaml up -d --build
```

Run `up` only on the approved host after its hostname resolves there. Caddy obtains TLS certificates and redirects HTTP to HTTPS. Its [SSE behavior](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#streaming) flushes `text/event-stream` immediately. We keep `flush_interval 0`: negative low-latency mode can prevent upstream cancellation on early client disconnect. Do not add buffering or a 30-second response timeout at an outer proxy/CDN. Access logs are disabled in the supplied proxy configuration; infrastructure logs must never capture Authorization, request bodies, or raw model events.

`SIGTERM` closes streams, upstream sockets and timers, rejects new session work, and permits at most 10 seconds for other HTTP requests to finish. Compose allows 15 seconds before forced termination. Restart only between demonstrations or explicitly accept session termination; audio runs independently in the browser.

## Connect the Vercel app

### Render account setup

The user provided signed-in Render workspace access after the Vercel release. `render.yaml` prepares one Docker web service named `mixtape-astra-gateway`, in Virginia, on the `0.5c-512mb` plan ($7/month base compute at the checked September 10 pricing). It uses the existing pinned gateway image build and `/healthz`; Render supplies the HTTPS endpoint. No Caddy container, database or disk is needed there. This file is a proposed configuration, not evidence that a service was created or billing approved.

Use the selected workspace's **New Blueprint** flow with this repository and the `codex/hosted-astra-sessions` branch until PR #2 is merged. Review the single service and cost, then supply the existing Booth OpenAI/Clerk credentials in Render's secret fields. `sync: false` keeps their values out of Git. Leave one instance and automatic deploys off. First verify its assigned `onrender.com` HTTPS endpoint, then add the proposed exact `astra.ourmixtape.org` custom domain and the provider-specified DNS record. `booth.ourmixtape.org` belongs to the Vercel app; neither the root charity site nor a wildcard is part of this configuration.

The signed-in dashboard can also use **New Web Service → Public Git Repository** without connecting a Git provider. This form has been prepared with the same branch, Docker runtime, `./Dockerfile.gateway`, root build context `.`, Virginia, $7/month compute, `/healthz`, automatic deploys off, and seven non-secret environment values from `render.yaml`. Deployment has not been submitted. Creating paid compute and transferring the existing local OpenAI/Clerk credentials are awaiting explicit approval; automatic approval review rejected the credential transfer until that destination-specific authorization is given. No credentials were transferred. After creation, verify the instance count and set the shutdown delay to 15 seconds (these were not exposed in the creation form).

**Subsequent Render updates require a maintenance window.** Render's normal deploy process sends new HTTP requests to the replacement instance before terminating the old one, which can separate an existing SSE stream from its later steer/tool requests. Before deploying, restarting or changing runtime settings, enable Render's paid [maintenance mode](https://render.com/docs/maintenance-mode) to block public gateway requests. Treat existing Astra sessions as ended. Keep maintenance enabled until Render reports the deploy complete and the old instance is terminated; its [documented sequence](https://render.com/docs/deploys#zero-downtime-deploys) includes 60 seconds before SIGTERM plus our bounded shutdown. Then disable maintenance, check readiness, and brief a new session. The Vercel instrument remains independent. Do not claim uninterrupted session migration, use automatic deploys, or increase the replica count.

The [Blueprint fields](https://render.com/docs/blueprint-spec), [Docker behavior](https://render.com/docs/docker) and [pricing](https://render.com/pricing) were checked against Render's documentation. Provider-side validation and the real remote acceptance run are still required before declaring Render deployment complete.

### Frontend connection

After the gateway passes HTTPS readiness and authentication checks, set **only** the public origin in the Booth Vercel project and rebuild the relevant environment:

```dotenv
VITE_ASTRA_GATEWAY_ORIGIN=https://the-approved-gateway-hostname
```

The build rejects HTTP production endpoints, embedded credentials, paths, queries, and fragments. When empty, the existing same-origin development contract and Vercel HTTP-only behavior remain. The app does not proxy the session stream through Vercel's 30-second API functions.

## Local verification and remote acceptance

```sh
pnpm typecheck
pnpm lint
pnpm test
VITE_CLERK_PUBLISHABLE_KEY='' PORT=5177 GATEWAY_PORT=8791 pnpm exec playwright test tests/session.browser.ts tests/ask.browser.ts tests/auth.browser.ts tests/experience.browser.ts tests/layout.browser.ts tests/mixer.browser.ts tests/waveforms.browser.ts
pnpm build
```

Use free test ports. The browser suite uses mocked identity/model events; unit tests also use ephemeral signed JWTs and scripted WebSocket events. The new real HTTP/SSE regression holds a simulated tool pending for 31 seconds and verifies that a second gateway cannot accept its result. Fake-clock tests cover the full lifecycle limits. These are distinct from a real sign-in/model rehearsal.

For the actual **local cross-origin** flow, with the existing server-only `.env`:

```sh
VITE_ASTRA_GATEWAY_ORIGIN=http://127.0.0.1:8792 PORT=5178 GATEWAY_PORT=8792 pnpm dev
```

Open `http://127.0.0.1:5178/#advanced/play` and sign in. HTTP loopback is allowed only in development. For remote acceptance, use the final Vercel app and real approved HTTPS gateway instead:

- Use the original generated fixtures. Brief Astra, send **Delay B one bar** during its actual response, and observe accepted → steered → automatic successor.
- Keep `watch_attempt` pending longer than 30 seconds before performing the attempt. Enter B at the chosen time and hand over. The fixed challenge still scores 8 ± 0.25 seconds; delaying to 10 seconds should require a retry. Compare the review with the engine's measurement.
- Stop the live session while a fixture is playing; verify playhead advancement and audible output. Repeat with an interrupted gateway. Simulated model-failure tests do not establish a real provider-failure run.
- Check the independent HTTP hint. Save redacted lifecycle/measurement evidence, transport timings and actual model; omit keys, bearer tokens, account email, private filenames and audio.
- Complete a 60-second screen-and-system-audio recording, audition and inspect the encoded audio/video, then supply a shareable URL for the README. Internal master-bus capture alone is insufficient.

Bounds remain: 15-second upstream connect, 90-second response, 120-second browser attempt wait, 150-second server attempt safety limit, 60 seconds of actual idle, 55-minute connection lifetime, 64 responses including automatic successors, 32 recorded calls, 16 total streams and two per Clerk user/session pair. SSE heartbeats occur every 15 seconds. Sign-out closes the stream; each separate request reauthenticates. JWT expiration does not prematurely cut the 120-second watch window; initial SSE authentication remains bounded by disconnect/idle/lifetime cleanup.

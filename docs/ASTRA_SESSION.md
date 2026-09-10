# Astra live session

Gateway companion for Mixtape — The Booth. The latest [portable deployment configuration](HOSTED_GATEWAY.md) and [recorded cross-origin rehearsal](evidence/hosted-gateway/README.md) extend the local verification below; no persistent gateway is deployed yet. The instrument stays manual: Astra reads compact operational state, never audio, and cannot move a control. The existing HTTP `/api/hint` and voice paths remain separate.

## Run and verify

Use Node 25.5.0 (the verified built-in WebSocket runtime) and pnpm 10.27.0. Install with `pnpm install --frozen-lockfile --prefer-offline`. In an ignored `.env`, configure `OPENAI_API_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` and the matching `CLERK_SECRET_KEY`. Keep the file mode 600. Never use a `VITE_` prefix for a secret.

```sh
PORT=5176 GATEWAY_PORT=8790 pnpm dev
```

Open <http://127.0.0.1:5176/#play>. Sign in with the existing Booth account. The panel appears only when `/api/status` reports `session.available: true`; readiness means the local key is configured, not that a request has succeeded. With no external gateway setting, hosted Vercel builds keep the stateless HTTP hint path and hide the live-session panel. `VITE_ASTRA_GATEWAY_ORIGIN` connects the unchanged session contracts directly to the approved persistent gateway; see [deployment instructions](HOSTED_GATEWAY.md).

```sh
pnpm typecheck
pnpm lint
pnpm test
VITE_CLERK_PUBLISHABLE_KEY='' PORT=5177 GATEWAY_PORT=8791 pnpm exec playwright test tests/session.browser.ts tests/ask.browser.ts tests/auth.browser.ts tests/experience.browser.ts tests/layout.browser.ts tests/mixer.browser.ts tests/waveforms.browser.ts
pnpm build
node --env-file=.env scripts/astra-session-check.mjs
```

Use free test ports 5177/8791 for the browser suite; the signed-in preview can remain on 5176/8790. The anonymous-account/import tests require an unconfigured browser provider; the explicit empty publishable-key override applies only to the test server and does not edit `.env`. Playwright reuses an already-running server on the selected test port, which would ignore that startup override.

The last command makes real model calls and saves a redacted transport log. Its numeric attempt result is a **synthetic test fixture**, not browser performance or an audition. Browser tests use mocked identity/API streams; server tests separately verify signed JWTs and scripted WebSocket events. The [real signed-in rehearsal](evidence/astra-session/real-session.md) is a distinct evidence item: it passed with a measured retry, using actual Clerk authentication, visible controls and genuine Astra responses.

## Session contract

`POST /api/session/brief` takes the existing compact hint state plus a brief, request ID and optional low/medium effort. The first request opens a bearer-authenticated SSE stream and a Responses WebSocket. Later briefs include the returned `sessionId`, reuse that socket and stream, and receive HTTP 202. A new brief cannot interrupt an in-flight response or unresolved attempt.

`POST /api/session/steer` sends native `response.steer` against the in-flight response. The stream reports accepted/pending/failed and, when applied, a steered termination followed by an automatically created successor. The earlier text stays visible. A steer is queued on the same response and applied automatically; it is not a replacement prompt.

`watch_attempt` is an asynchronous function call. The browser waits for the engine's attempt to move from running to complete/retry, then submits the corresponding call ID and measured entry error. A result observed during the current brief is retained by its audio-clock `startedAt` identity if the tool call arrives later; older briefs and superseded attempts cannot supply that result. If generation is active, the gateway queues the result until it can create a review with the latest response ID. Duplicate and foreign-session results are rejected. After 120 seconds, the browser returns timeout. Stopping the session or signing out releases the stream without stopping manual audio.

The existing engine has no structured exact `handoffAt` field. The browser therefore omits that optional value instead of presenting its 100 ms render observation as an exact audio-clock measurement. Entry error and tolerance remain measured/defined by the existing engine. The transport fixture includes a synthetic handoff time only to exercise the optional wire field.

A session is owned by both Clerk user ID and Clerk session ID. The gateway retains no transcript on disk. It closes on SSE disconnect, 60 seconds of actual idle time, response timeout, failure, or its bounded connection lifetime. Waiting for an attempt is active work, so the 60-second idle rule does not shorten the 120-second attempt window. Credentials, private track names/paths and raw provider errors are not forwarded to the model or client.

## Rehearsal

1. Start audio with the original fixtures and select **Plan the handoff**, then **Brief Astra ↗**.
2. While a response is in flight, choose **Delay B one bar**. Point to the actual lifecycle: steer queued, steered, revised plan. Say: “That update was queued on the same response and applied automatically. No re-prompt.”
3. When Astra asks to watch, start practice and perform an attempt. The fixed practice goal still expects B at 8 seconds and the handoff by 16 seconds. A verbal request to delay does not change the engine's scoring boundary.
4. Show the engine result and Astra review. Say: “The engine returned the result later through an async tool call, while Astra could keep coaching.” Explain any retry honestly; the result does not establish artistic quality or audible smoothness.
5. For steering Q&A, show the redacted real-API log. Avoid exclusivity claims about all other models. Use the actual latency on this run rather than promising a fixed response time.

A [60-second local rehearsal with actual system audio](evidence/hosted-gateway/booth-demo-60s.mp4) is now recorded. See [capture/encoding evidence](evidence/hosted-gateway/README.md) and [exact recording commands](DEMO_RECORDING.md). This is not remote deployment, human audition or event-eligibility evidence.

## Stage beat: 0:50–1:25

Use this in the local signed-in booth after the session change is merged. Latency varies; leave time for the actual lifecycle rather than narrating a scheduled outcome.

- **Brief:** “Plan the handoff and watch my attempt.” While the response is in flight, choose **Delay B one bar**: “I changed my mind.”
- **Show the real steer:** point to Steer queued → Steered → Revising: “That update was queued on the same response and applied automatically. No re-prompt.”
- **Perform and review:** “Astra asked to watch my attempt.” Start practice, enter B and move the crossfader. Once the actual review arrives: “The engine returned this measured entry error later through an async tool call. Astra kept coaching while it waited.”

The one-bar delay intentionally conflicts with the fixed 8-second entry target. Explain the resulting retry; do not present it as a passed timing exercise. If the review is still pending, show that state and continue when it arrives.

For “Is that native steering?”: “Yes: `response.steer`, accepted, then a steered termination and an automatic successor. Here is the redacted September 10 event log.” For quality claims: “Astra reads engine measurements. It does not hear the mix or grade musical taste.”

## Sources and authorship

[Official steering documentation](https://developers.openai.com/api/docs/guides/steering) and [async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling), retrieved September 10, 2026, plus the user's account-verified kickoff informed the adapter. New session code was authored by Codex with separate server/client agents and integrated in the parent task. No new dependencies or draft Claude patches were used. The optional README template and draft patches mentioned in the kickoff were not present in the supplied attachment directory; this guide was authored independently. The user later supplied the README opening in chat, which was adapted with the evidence and provenance qualifications above.

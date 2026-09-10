# Portable gateway verification — September 10, 2026

**Implementation and real local rehearsal completed; persistent gateway not deployed.** The user selected “Finish portable gateway; keep app on Vercel.” No approved persistent hosting account/server or gateway hostname was available. The existing [Vercel app](https://mixtape-the-booth.vercel.app/#play) keeps the authenticated HTTP hint. Its deployment protection was not changed. The [deployment runbook](../../HOSTED_GATEWAY.md) gives the exact missing host/access, TLS hostname, secrets and origins.

Work starts from `origin/main` / PR #1 merge `72a3662`, on `codex/hosted-astra-sessions`. The original [real-session evidence](../astra-session/real-session.md), native Responses WebSocket protocol and browser HTTP/SSE contracts are preserved.

## Real local, signed-in run

The final recorded take completed at **17:26:45 EDT**. The in-app browser used `http://127.0.0.1:5178/#advanced/play` with its real Clerk sign-in and a separate origin, `http://127.0.0.1:8792`, for live sessions. OpenAI responses used **gpt-6-astra**. Neither identity nor model traffic was mocked. Codex operated ordinary visible controls; only original generated fixtures were loaded. This is cross-origin development verification, not public HTTPS/proxy verification.

| Time from brief | Observed lifecycle |
|---|---|
| 0.0 s | Brief: plan the timed handoff and watch the attempt |
| 0.9 s | Native steer queued: Delay B one bar |
| 6.1 s | Steered termination |
| 6.2 s | Automatic successor / revised plan |
| 15.6 s | Waiting for attempt |
| 52.5 s | Measured tool result returned; review starts |
| 54.5 s | Review completed |

The visible waiting interval was **36.9 seconds**, conservatively measured from the completed plan rather than the earlier tool dispatch. The model continued coaching after requesting the async watch. Practice was started at about 42 seconds into the take. B entered **2.263 seconds late** against the unchanged **8 ± 0.25-second** target; the engine returned **retry**. Astra cited the measured error and tolerance and declined to infer beat alignment, handoff completion or musical quality. A one-bar delay intentionally conflicts with the fixed practice target. This is a performed failed attempt, not a passing exercise or evidence of learning.

- [60-second screen-and-system-audio video](booth-demo-60s.mp4) · [public MP4 download](https://raw.githubusercontent.com/our-mixtape/the-booth/a8407dad5c86d1b6b1be807576ea132305449143/docs/evidence/hosted-gateway/booth-demo-60s.mp4) (HTTP 200 checked; GitHub serves it as a download)
- [Actual lifecycle and practice observation](recorded-session.json)
- [Measured review screenshot](recorded-review.png)
- [Four-player booth frame](booth-ready.png)

The UI abbreviates IDs using a shared prefix. Screenshots alone do not prove distinct full response identities; the preserved [real API transport log](../astra-session/check-1789071731.md) separately verifies those identities with synthetic numeric tool results.

The unchanged same-origin HTTP hint also returned a genuine gpt-6-astra response using real Clerk sign-in: [observation](real-http-hint.json). It correctly distinguished elapsed practice time from source position. Timings here are rehearsal observations, not controlled latency benchmarks; API cost, memory and input latency were not newly measured.

## Actual system audio and disconnect

`scripts/record-demo.swift` captured the selected app window with **ScreenCaptureKit system audio**, H.264 and stereo 48 kHz AAC. Microphone capture was disabled. The user enabled Screen & System Audio Recording permission. Raw full-window recordings stay in `/tmp`; shared videos contain only the Booth browser pane, excluding sidebar/conversation and account details. The take is continuous; only spatial cropping, encoding and trimming were applied. No replacement soundtrack, simulated response overlay or speed-up was added.

[Capture metrics](capture.json): 1,766 complete frames, 3,005 audio buffers, zero reported dropped frames/buffers, system RMS **−31.29 dBFS**, peak **−14.66 dBFS**. [Encoded-file check](system-audio-check.json): video **60.000 seconds**, container **60.013 seconds** including AAC timing, stereo audio RMS **0.02723**, peak **0.18552**. Every full one-second audio window is non-silent. The final instrument and review frames were visually inspected. These digital checks verify captured output and encoding; Andrew's musical audition and physical-speaker listening remain unperformed.

Separately, the task's actual local gateway was terminated with SIGTERM while fixtures played. Both decks continued advancing and B's manual filter changed from 100% to 99%. The next brief reported “Astra session ended … Your mix keeps playing.” A [10-second system-audio recording](disconnect-10s.mp4), [capture metrics](disconnect-capture.json), [encoded audio check](disconnect-audio-check.json), [controls after termination](disconnect.json), [offline request](gateway-unavailable.json) and [manual booth screenshot](manual-after-disconnect.png) document this. The brief response had completed before termination; this checks interruption of its still-open session stream and a subsequent failed request, not a real provider safety termination. Restarting the development supervisor reloads Vite's page; that development reload is separate from the observed stable playback while the gateway was offline.

Provider errors are covered with **simulated** WebSocket/SSE events. The new browser regression changes the manual filter and decodes actual Web Audio master-bus capture after a simulated model failure: [last-second RMS 0.02708](simulated-failure-audio.json). It is not a real upstream outage or system-audio recording.

## Regressions and deployment configuration checks

- Typecheck, lint, production build: passed. Existing large JS chunk warning remains (about 1,194 kB / 325 kB gzip).
- **109 unit/integration tests** passed. A real local HTTP/SSE connection holds a **simulated** attempt for 31 seconds, accepts its result only on the owning process, rejects a second process and duplicates, and closes on disconnect. Ephemeral signed test JWTs verify CORS/Clerk boundaries. Fake-clock tests cover 91-second pending work, idle/response/attempt/lifetime limits, native successor response cap, shutdown races and connecting-socket cancellation.
- **28 distinct browser checks** passed across the selected suite and focused runs: real controls/audio routing, A–D player order, clockwise exported/fallback knobs, layout continuity, auth and Astra panels. The first combined run passed 26/27; voice-stop timed out during scrolling. Its unchanged focused rerun passed. The latest session suite passed 4/4, including the additional model-failure/audio check. Do not describe this as one clean 28-test run.
- New regression measurements/audio are copied into [regressions](regressions/); historical tracked evidence was restored unchanged.
- Pinned Node gateway image built locally and ran as the non-root `node` user. Dummy-credential smoke check: health 200, unauthenticated brief 401, private library empty. No `.env`, private tracks, frontend audio or evidence were in the image. This does not verify real model credentials inside the container.
- Compose configuration and the pinned Caddy configuration validated locally. No remote server, TLS issuance, DNS routing, production origin setting or gateway publication was performed.

Exact commands and prerequisites: [deployment/testing](../../HOSTED_GATEWAY.md), [recording/rehearsal](../../DEMO_RECORDING.md). No model writes, raw audio uploads, practice-tolerance changes, library dependencies, charity-jukebox or DNS changes were introduced. Real remote sign-in → steer → successor → >30-second wait → measured review, remote disconnect/fallback checks and public TLS routing are still required after an approved host is available.

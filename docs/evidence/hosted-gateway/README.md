# Portable gateway verification — September 10, 2026

**Portable gateway deployed and real hosted rehearsal verified.** The [Vercel app](https://mixtape-the-booth.vercel.app/#advanced/play) connects to [the Render gateway](https://mixtape-astra-gateway.onrender.com/healthz). [Deployment evidence](hosted-release.json) records the actual source, releases, one-instance configuration, public HTTPS/CORS/authentication checks and inspected frontend bundle. Real user-completed Clerk sign-in and genuine gpt-6-astra calls then verified the flow below. Existing Vercel protection remains enabled; the user-approved private one-hour test link was revoked after testing, with no tokens in evidence. The [earlier Vercel-only release](vercel-release.json) remains as historical evidence.

Work starts from `origin/main` / PR #1 merge `72a3662`, on `codex/hosted-astra-sessions`. The original [real-session evidence](../astra-session/real-session.md), native Responses WebSocket protocol and browser HTTP/SSE contracts are preserved.

## Real hosted, signed-in run

The final hosted recording completed at **18:47:16 EDT** on September 10, 2026. Both production services ran source `6d4f50af21f75a20a308a77b445ecfe34c3c80aa`. The browser used the canonical Vercel origin and directly authenticated its HTTP/SSE requests to the single Render gateway. The gateway retained its Responses WebSocket to OpenAI. No identity, response stream, attempt result or audio was mocked. Only original synthesized fixtures were used; Astra received measured state and no audio.

| Time from brief | Recorded hosted lifecycle |
|---|---|
| 0.9 s | Native steer queued: Delay B one bar |
| 2.5 s | Steered termination and automatic successor |
| 8.1 s | Plan complete, attempt watch pending |
| 48.9 s | Actual engine result returned; review starts |
| 51.7 s | Genuine gpt-6-astra review complete |

The visible pending interval is **40.8 seconds**, measured conservatively from the completed plan. Codex used ordinary visible controls to start practice, enter B and move the crossfader. The engine measured **+2.368 seconds** entry error and returned **retry** against the unchanged **±0.25-second** target. Astra cited these measurements and declined to infer a completed handoff, beat alignment or musical quality. The engine's UI separately reported a handoff at about 10.62 seconds; the tool does not claim that exact timestamp is available to Astra. The requested one-bar delay intentionally misses the fixed exercise target.

- [60-second hosted demonstration](booth-hosted-demo-60s.mp4) · [public MP4](https://raw.githubusercontent.com/our-mixtape/the-booth/ba68aa1027fd65811b7fbe8d8d7557e6c83d9e89/docs/evidence/hosted-gateway/booth-hosted-demo-60s.mp4)
- [Recorded hosted lifecycle and actual practice result](hosted-recorded-session.json) · [review screenshot](hosted-final-review.png)
- [Capture-time region and system-audio metrics](hosted-capture.json) · [encoded audio check](hosted-system-audio-check.json)
- [Earlier hosted acceptance run](hosted-session.json), with a **74.0-second** pending watch, review at **89.7 seconds**, and **+5.363-second** entry error · [screenshot](hosted-review.png)

The shared take is continuous, with only encoding and trimming to 60.000 seconds of video (60.019 seconds of container/AAC timing). ScreenCaptureKit captured the Booth pane directly at `[955, 86, 699, 934]` window-local points; surrounding conversation, tabs and the private access URL were excluded before encoding. Output is 808×1080 with stereo 48 kHz AAC, decoded RMS **0.02717**, peak **0.18399**, and non-silent audio in all 60 full one-second windows. Capture reported 1,771 frames, 3,004 audio buffers and zero reported drops. Full-instrument and final-review frames were visually inspected. No replacement soundtrack, overlay, time compression or narration was used. Earlier framing/timing rehearsals remain temporary; they are not substituted for this final take. A rehearsal-control script needed correction, but the saved stream and recording remained real throughout.

### Actual remote disconnect, fallback and recovery

Stopped one real session while both decks played; B's filter remained usable. Then opened a new pending watch, enabled Render maintenance and issued `render restart srv-dahiqq6k1f9s73ffj0k0 --confirm --output json`. The old stream ended about **71 seconds after the restart command**, with the visible error “Astra session ended. Brief again to retry. Your mix keeps playing.” This was earlier than the watch's 120-second browser timeout. The Render instance list showed the replacement before the old stream ended; maintenance stayed enabled until stream termination was observed.

The decks continued advancing across the actual disconnect and B's filter was changed to 97%. [DOM observations](hosted-disconnect.json) and a separate [10-second recording after the disconnect](hosted-disconnect.mp4) document the manual instrument. Its actual system audio remained non-silent, encoded RMS **0.02648**: [capture](hosted-disconnect-capture.json), [signal check](hosted-disconnect-system-audio-check.json). This recording verifies output after the outage; it does not claim continuous audio measurement across the entire replacement interval.

The independent same-origin Vercel HTTP hint returned genuine gpt-6-astra advice while Render was in maintenance: [response](hosted-http-hint.json). Maintenance was disabled, public health returned 200, and subsequent fresh live sessions succeeded, including the final recorded take. There is no session migration claim. Real upstream provider failures were not deliberately induced remotely; simulated provider-error regressions below cover that case while verifying actual manual audio.

Remaining limits: one gateway process and maintenance windows for changes; no remote 55-minute soak or capacity test; existing Clerk development instance and Vercel deployment gate; no custom-domain/DNS changes; no physical-speaker listening, Andrew's musical audition, narration or event-eligibility claim. The displayed response IDs are abbreviated; the original separate transport logs below preserve their original scope.

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
- Compose configuration and the pinned Caddy configuration validated locally. Those local proxy checks did not establish public routing. The subsequent Render deployment separately verifies public HTTPS and the production gateway-origin setting; DNS/custom domains remain unchanged.

Exact commands and prerequisites: [deployment/testing](../../HOSTED_GATEWAY.md), [recording/rehearsal](../../DEMO_RECORDING.md). No model writes, raw audio uploads, practice-tolerance changes, library dependencies, charity-jukebox or DNS changes were introduced. Real remote sign-in → native steer → successor → >30-second wait → measured review, actual remote disconnect/fallback/recovery and public HTTPS routing are now verified above. Simulated tests retain their separate scope.

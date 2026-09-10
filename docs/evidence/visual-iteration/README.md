# Editable mixer / living sleeve evidence

Local work on 2026-09-10, `/Users/misawa/booth-mixtape`, branch `codex/phase-1-playable`. The starting application was entirely untracked; no reset, commit, new checkout or deployment was performed.

- `mixer-review.png`: two-player in-app browser inspection. `sleeve-desktop.png`, `sleeve-static.png`, `sleeve-mobile.png`: original static sleeve; mobile document width checked at 390px.
- `mixer-after.png`: exported Blender mixer in the actual four-player browser scene. `mixer-before.png` is the retained procedural fallback under matched test conditions.
- `mixer-controls-changed.png` and `control-routing.json`: all 21 exported hit regions exercised with pointer drags. Commands and effective Web Audio EQ, cutoff and gain parameters were inspected after smoothing. The asset unit test also moves actual exported surfaces and checks that binding does not mutate the session.
- `mixer-fallback.png`: GLB fetch deliberately failed; manual mixer and layout switching remained usable. A separate browser test holds a crossfader while a delayed GLB arrives and verifies that replacement waits for release.
- `camera-denied.png`: deliberate permission denial, with original sleeve retained and playback continuing.
- `sleeve-synthetic-video.png`: **synthetic canvas feed**, showing the live VideoTexture crop/halftone renderer. It is not a photograph or physical-camera verification.
- `camera-voice-lifecycle.json`: combined camera/voice test. Synthetic video and microphone tracks, mocked voice peer/SDP. Camera off leaves microphone and peer active; voice off leaves video active. Camera generated no POST; the only POST was `mock-offer` to the mocked voice endpoint; only audio tracks reached the peer.
- `camera-voice-manual-audio.webm`: **actual booth master-bus recording of original synthesis fixtures** while camera/voice lifecycle controls were exercised. No camera, microphone, voice-model output, private song or system-audio recording. Its decoded RMS, peak and duration are in the lifecycle JSON.
- `performance-before.json` / `performance-after.json`: paired samples on an Apple M4 Pro, headless Chromium 153, 1440×1000 viewport, 1267×518 booth canvas at DPR 1, four fixture decks playing. The same application is used with the procedural fallback and the Blender model, respectively. Statistics cover the latest 120 rendered frame intervals, CPU update/render submission time, draw calls and triangles. They do not measure GPU completion, input-to-speaker delay or long-session dropouts.

The preliminary unmatched runs had other browser rendering active and varied substantially. A paired focused run measured 33.4 ms median frame intervals for both mixers; the later full-suite paired run measured 33.3 ms procedural and 49.9 ms Blender (p95 50.0 and 66.7 ms). The latest raw pair is retained. Fewer draw calls do not establish an FPS improvement; profile longer sessions before increasing visual/tracking load. Run `pnpm exec playwright test tests/visual-performance.browser.ts` with unrelated rendering idle to regenerate both files; the existing 33 ms render throttle remains.

No physical camera frames were recorded or uploaded. Human audition, actual hardware camera/microphone concurrency and genuine spoken Astra/Realtime conversation remain unverified. Gesture tracking and its loss/reacquisition behavior are not implemented in this checkpoint.

Local review: `pnpm dev`, then [mixer](http://127.0.0.1:5173/#play) or [optional sleeve](http://127.0.0.1:5173/?livingSleeve=1#play). The sleeve starts static and requests video only on its button. Production builds omit its UI and shader.

## Hosted review prerequisite

There is no existing production flag to enable the sleeve. Both `src/App.tsx` (lazy import) and `src/camera/feature.ts` require `import.meta.env.DEV`. After local review, an explicitly authorized follow-up could replace both guards with `DEV || import.meta.env.VITE_ENABLE_LIVING_SLEEVE === '1'`, retain the `livingSleeve=1` URL opt-in, and set that new flag only in an intentionally protected Preview environment. This is a proposed future configuration, **not implemented or configured here**. A normal staging/build/deployment cannot expose the present prototype; production remains unchanged.

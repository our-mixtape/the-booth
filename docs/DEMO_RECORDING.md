# 60-second Booth recording

The [recorded rehearsal](evidence/hosted-gateway/booth-demo-60s.mp4) uses real local Clerk authentication, genuine gpt-6-astra responses and original synthesized fixtures. [Evidence and limits](evidence/hosted-gateway/README.md) distinguish this from deployment and simulated regressions. No microphone or raw mix audio is sent to Astra. This recording is not a claim of hackathon eligibility; earlier work provenance is preserved.

## Exact recording commands

Prerequisites: macOS 14+, installed Swift compiler, ffmpeg/ffprobe, Python 3 and Screen & System Audio Recording permission for the launching app. The selected-window filter captures that app's system output; silence other content in the same app and prepare the window before recording. No microphone permission is needed.

```sh
swiftc -module-cache-path /tmp/booth-swift-module-cache -parse-as-library scripts/record-demo.swift -o /tmp/booth-record-demo
/tmp/booth-record-demo list --app ChatGPT
/tmp/booth-record-demo record --window 2599 --output /tmp/booth-demo-take5-full.mp4 --duration 60
```

`2599` was the observed window ID for this run. Run `list` again and substitute the current ID; the helper refuses to overwrite an existing recording. The OS application name was ChatGPT, despite the Codex interface. The initial permission failure and WindowServer initialization issue were resolved before the successful take; the helper initializes AppKit and fails promptly when capture permission is absent.

The recorded app window was 1820×1080. The browser pane occupied the rectangle below. **Inspect the current window and change the crop if its geometry differs.** Never share the raw full-window recording, which can contain unrelated app content.

```sh
ffmpeg -v error -i /tmp/booth-demo-take5-full.mp4 -vf 'crop=782:990:1038:90' -t 60 -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart docs/evidence/hosted-gateway/booth-demo-60s.mp4
python3 scripts/check-recording.py docs/evidence/hosted-gateway/booth-demo-60s.mp4 > docs/evidence/hosted-gateway/system-audio-check.json
ffmpeg -v error -ss 59 -i docs/evidence/hosted-gateway/booth-demo-60s.mp4 -frames:v 1 /tmp/booth-demo-review-frame.png
```

The Swift helper writes adjacent `.capture.json` metrics for actual captured system audio. The Python helper verifies video/audio streams, decodes AAC and measures full-scale peak, RMS and one-second windows. It does not establish musical quality or absence of brief glitches. Inspect video frames, play the exported file, and confirm the intended fixture music by listening before a human presentation. The checked file contains a 60.000-second video and about 13 ms of container/AAC timing overhead.

## Rehearsal beats

Start with audio enabled, A playing Amber Current, B cued to zero with Afterglow Steps, crossfader left, and original fixture practice selected. Sign in before recording. Keep both speech and microphone capture off.

| Recording time | Action / optional live narration |
|---|---|
| 0–3 s | Brief “Plan the timed handoff and watch my attempt.” Click **Delay B one bar** while responding. This preset sends the steer immediately; do not also submit Queue steer. |
| 3–16 s | Show the actual queued → steered → revised lifecycle. “I changed my mind while Astra was responding.” Wait for the real pending watch, not a scripted timer label. |
| 16–24 s | Show the full four-player booth and audible manual playback. “The instrument owns the sound and timing.” |
| 24–40 s | Switch to turntables; bring the full instrument into view. Playback continues with the same mixer state. |
| About 42 s | Return to digital players and start practice. The watch must remain pending for more than 30 seconds before the result is returned. |
| About 52 s | Start B about 10 seconds after retry and move the crossfader to B. The requested delay intentionally misses the fixed 8 ± 0.25-second target. |
| 53–60 s | Bring the actual attempt review into view. “The engine measured the late entry. Astra received that result asynchronously and suggested a retry.” |

Real model timing varies. If the watch or review arrives too late, preserve its true state and rehearse another take; never substitute fabricated output. A readable completed review and full instrument need deliberate scrolling in the narrow browser pane. The new response-history behavior follows a new review inside its own scroll area without moving the page.

The next stage step is Andrew's audition and narration, then repeating the same flow on the approved HTTPS gateway. The current video has fixture system audio and no spoken narration.

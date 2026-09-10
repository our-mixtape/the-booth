# Mixtape — The Booth

A browser DJ instrument you perform in: a four-channel Web Audio mixer, crossfader, filter, EQ, tempo, stems and a Three.js booth, with **GPT-6 Astra as a read-only practice companion**. Four CDJs and their mixer strips now read **A, B, C, D from left to right** ([verified controls and audio](docs/evidence/deck-order/)).

- **Live:** [Mixtape — The Booth](https://mixtape-the-booth.vercel.app/#play) — free play needs no Booth account; Astra hints need Booth sign-in. Existing Vercel deployment protection is separate.
- **Video (60 s):** pending a shareable recording URL.
- **Repo:** [our-mixtape/the-booth](https://github.com/our-mixtape/the-booth) · developed September 10, 2026, and prepared for the OpenAI GPT-6 Astra Hackathon NYC. [Provenance](docs/PROVENANCE.md) distinguishes work completed before the 10:30 AM hacking start; the whole repository is not claimed as event-built.

## What runs where

Playback, timing, every control and the practice result run locally in the browser. Astra never receives the mix audio. It reads measured deck state: positions, BPM with provenance, gains, filter, EQ, tempo, available stem routing and the last eight commands. Hosted HTTP hints use the Responses API with strict Structured Outputs; the local live session streams plans and reviews over a Responses WebSocket. The domain layer rejects every agent-origin command: Astra can point, you play. Optional microphone conversation uses a separate speech model.

## Native Astra capabilities, verified on this account today

- **Mid-turn steering:** a changed brief is queued through `response.steer`; `response.steer.accepted` is followed by an incomplete response with reason `steered` and an automatic successor. A steer is queued on the same response and applied automatically, with no re-prompt. Text already streamed remains visible.
- **Async tool calling:** Astra calls `watch_attempt` (`async: true`) and continues coaching while it is pending. The browser returns the engine's result later using the original call ID; Astra reviews the measured numbers in a successor response.
- **Real signed-in rehearsal:** brief → steer → manual fixture attempt → review completed in **56.6 seconds**, including the time spent operating the booth. The engine measured B **6.9013 seconds late**, so the attempt correctly required a retry. Astra cited that error and the **0.25-second** tolerance, and explicitly declined to infer musical quality. This was browser automation through real controls, real Clerk authentication and real `gpt-6-astra` responses; no mocked identity or model stream. [Screenshots, timings and limits](docs/evidence/astra-session/real-session.md).

[Redacted API event logs](docs/evidence/astra-session/) separately verify response/call identities with synthetic numeric results; the latest transport run took **16.88 seconds**. Live sessions run on the local gateway; the hosted build keeps its HTTP hint. [Runbook](docs/ASTRA_SESSION.md) · [official steering](https://developers.openai.com/api/docs/guides/steering) · [async tools](https://developers.openai.com/api/docs/guides/async-tool-calling).

## Developed with Codex on gpt-6-astra — evidence in 30 seconds

- **Blender → GLB → live DSP:** [the original mixer generator](assets/blender/create_mixer.py) first ran through the community `ahujasid/blender-mcp` bridge. Later revisions and optimized exports used Blender CLI. The resulting [GLB](public/models/mixtape-mixer.glb) and [bindings](public/models/mixtape-mixer.bindings.json) connect 21 controls and real RMS meters through [the asset adapter](src/scene/mixer-asset.ts). [Original render](docs/evidence/blender-mixer.png) · [runtime visual evidence](docs/evidence/visual-iteration/).
- **Human keeps control:** [the domain layer](src/domain/session.ts) rejects agent writes; [Ask Astra](src/AskAstra.tsx) discards feedback when the semantic deck-state revision changed while Astra was thinking. [Browser regressions](tests/ask.browser.ts).
- **Tests exposed real timing failures:** earlier browser runs entered B 0.51 s late under parallel graphics load and 0.30 s late after scrolling. The unchanged ±0.25 s mechanic rejected the attempts; the harness was corrected without relaxing the musical target. [Build records](docs/BUILD_LOG.md).
- **Traceable authorship:** Codex authored and revised the implementation; [PROVENANCE](docs/PROVENANCE.md) records code, dependency and asset origins. Planning documents and the first playable implementation predate the hacking start; [BUILD_LOG](docs/BUILD_LOG.md) preserves those timestamps.

Hosted demo tracks are original generated fixtures: synthesized drums, bass and melody, not source separation. The private library was prepared locally with this project's Demucs adapter and is not in the repository. This rehearsal does not establish human audition or system-audio capture.

## Run and verification

Use Node **25.5.0** and pnpm **10.27.0**:

```sh
pnpm install --frozen-lockfile --prefer-offline
PORT=5176 GATEWAY_PORT=8790 pnpm dev
```

Open [the local booth](http://127.0.0.1:5176/#play). Configure the existing Booth Clerk keys and `OPENAI_API_KEY` in an ignored server-side `.env` with mode 600 for live sessions. Manual mixing needs no credentials. Default ports remain 5173/8787.

For the latest mixer changes, typecheck, lint, **92 unit tests**, **27 browser tests**, and the production build passed. These include left/right knob input and clockwise indicators on both mixer versions, physical CDJ routing, all 21 mixer controls, layout/audio continuity, accounts, Kids/Afterhours and both Astra panels. [Knob-direction evidence](docs/evidence/knob-direction/). The real signed-in live session and existing HTTP hint both returned genuine `gpt-6-astra` feedback. Exact commands and test prerequisites are in [the runbook](docs/ASTRA_SESSION.md). No dependencies were added for live sessions, and this iteration made no deployment or DNS changes. A system-audio demo recording and its video URL remain outstanding.

## Earlier checkpoints

The chronological sections below preserve earlier results. The current session and verification sections above supersede their statements that native steering, local keys or signed-in rehearsal are unavailable.

Production design update, September 10: Afterhours now follows Andrew's **Booth v4 – Astra** reference: light Archivo typography, an indigo glow, dark equipment surfaces and cool preparation screens. “Follow the mix” and the CDJs share lavender, cyan, periwinkle and lilac deck accents. [Open production](https://mixtape-the-booth.vercel.app), deployment `dpl_GjrAUo8YEqjibkr4JkcxWtKmAULi`. Build/lint, 61 unit tests and all 14 selected browser checks passed, including a focused retry after a local server restart interrupted an evidence download. Hosted page/bundle/style checks passed; the stylesheet matches the tested build. Existing Vercel protection and Clerk configuration remain. See [release evidence](docs/evidence/production-astra-palette/verification.json). Local preview: `pnpm dev` at [the landing page](http://127.0.0.1:5173/).


## Kids / Afterhours production release — September 10, 2026

Run `pnpm dev`, then open [Kids](http://127.0.0.1:5173/#kids) or [Afterhours](http://127.0.0.1:5173/#advanced). **Afterhours is the main landing page and default design**, with **KIDS** linking to a distinct experience. Afterhours retains **Upload → Analyze → Create stems → Recommend → Playlist → Play**. Kids uses **DJ name → choose two songs → play**, with large simple controls and three built-in sound discoveries. Afterhours users can enter their own name or create a goofy mascot + pasta name, remix it, or edit it. The accepted name, music and audio state are shared; naming and coaching are optional.

Local import, real technical metadata, demo/prepared-track selection, a disclosed local tempo-pairing rule, and playlist ordering/loading work. Automatic BPM/key analysis, stem creation from new browser uploads, and crate-wide Astra recommendations are **not connected yet**. Original audio can skip preparation. Crate/playlist reset on page reload; only the accepted alias survives in this tab's sessionStorage. These flows, the Afterhours wording and shared Mixtape footer are included in the latest production release above. Earlier release evidence is preserved in `docs/evidence/production-afterhours/verification.json` and `docs/evidence/production-clerk/verification.json`.

Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test` (61 tests), `pnpm exec playwright test tests/experience.browser.ts tests/design.browser.ts tests/auth.browser.ts tests/layout.browser.ts` (12 checks across the run and focused correction), and `pnpm build`. Local test processes must be permitted to bind/reach loopback ports. See [integration assessment](docs/REDESIGN_INTEGRATION.md) and [evidence/build log](docs/BUILD_LOG.md) for scope, limitations, audio measurements and the recommended preparation-worker integration.


## Current account integration — September 10, 2026

The deployed app has a Booth account flow and server authentication on both `/api/hint` and `/api/voice/session`. Andrew added the Clerk settings in Vercel, and a subsequent production rebuild now reports `auth.configured: true`. The browser build contains a Clerk **development-instance** publishable key. Real sign-in and an authenticated Astra request remain to be verified. Missing app sessions receive 401 before any OpenAI request. Keep the existing Vercel All Deployments protection during the test. See [the account setup guide](docs/AUTH.md); `pnpm dev` remains usable without credentials. No DNS or existing Mixtape account changes were made.

The historical deployment/auth descriptions below are superseded by this account section and the latest BUILD_LOG entry.

## Live deployment — September 10, 2026

Open https://mixtape-the-booth.vercel.app/#play . Production secret is configured and one genuine gpt-6-astra hint has been verified through the hosted gateway. Voice conversation remains unverified. Original fixtures are hosted; the private prepared collection is not. Existing ourmixtape.org DNS was not changed.

For another deployment, run `node scripts/prepare-deploy.mjs`, then `vercel deploy --cwd <printed-directory> --prod --scope efficient-frontier-labs`. The script stages only explicit application/build inputs and project IDs; it never copies environment secrets or private tracks. Do not deploy directly from this checkout: its negated `.vercelignore` patterns were not honored as intended by CLI59.9.1. The notes below preserve the earlier setup checkpoint.

## Hosted Ask checkpoint — September 10, 2026

Ask supports text, helper prompts, and opt-in WebRTC voice. Helpers fill an editable request; **Ask Astra** submits it. The separate `gpt-realtime-2.1` speech model calls the same read-only `gpt-6-astra` hint gateway used by text. Microphone audio goes to OpenAI only after starting voice; stop releases the microphone/peer, and the client ends the session after two minutes. The mixer master bus is not connected to voice; headphones are recommended. This client timer is not a server-enforced spending limit.

Astra uses low reasoning effort with a bounded output and timeout. Edited requests and changed deck state reject stale feedback. HTTP cancellation/replacement is implemented; native mid-turn steering and WebMCP are not. The “Two minutes left” helper supplies a user constraint, not automatic remaining-track detection or a measured deadline planner. Real voice, model latency/cost and musical usefulness remain unverified until the cloud secret is configured.

Created and linked **efficient-frontier-labs/mixtape-the-booth**, project ID `prj_ZZ3gQTYQwcPd9jQHrc9mZmVUskV7`. Add **OPENAI_API_KEY** in [Vercel environment variables](https://vercel.com/efficient-frontier-labs/mixtape-the-booth/settings/environment-variables), mark it Sensitive, and select Preview and Production. Leave Development unset; no local API key is needed or requested. A subsequent deployment is required to use the secret. No application deployment or domain connection has happened yet. Keep the initial preview protected while the gateway lacks application authentication and distributed quotas.

`vercel.json` selects Vite, pnpm and the production build. Explicit Node function routes reuse the gateway, including Vercel-parsed JSON/SDP. `.vercelignore` permits only build/application inputs; private tracks, exports, source art, documentation and captures are excluded. Hosted library/exercise routes cannot read the private local collection. Only original demo fixtures are bundled. `.vercel/` is ignored. The Vercel CLI automatically generated an OIDC `.env.local` during linking; that generated file was immediately removed without reading its token.

## Current local exercise — September 10, 2026

Run `pnpm dev` from `/Users/misawa/booth-mixtape`, then open [the booth](http://127.0.0.1:5173/#play). Choose **Start audio → Load prepared exercise → Start practice**. The prepared pair is private and requires the ignored local library; a fresh checkout still has **Fixture practice**.

A is **I can't go for that (Amine Edge Edit)** at source 16.34818644s, 118 BPM. B is **Do U Wanna Get Down** at source 2.050s, 117 BPM, rate 118/117. Start B **8.13559s after starting practice**, then move the crossfader fully to B before **16.27119s**. The engine accepts entry within ±0.25s and checks an enabled incoming route, gain and filter. This measures handoff mechanics, not artistic quality. Pausing, seeking, changing tempo, loading tracks or using extra decks invalidates a running attempt; free play continues.

**Retry** restores the saved track/preparation identities, source positions, rates, stem states, gains, EQ, filters and crossfader, clears ownership/assistance, stops C/D and starts A from a fresh audio-clock origin. Checkpoint buffers stay resident across track replacement. **Use loaded pair** saves paused downbeat cues only inside an audio-checked rhythm window (or an explicitly verified grid); **Fixture practice** selects the generated regression checkpoint. Local pair configuration is `local-tracks/exercise-pair.json`.

Always-visible A/B controls include transport, gain, filter, three-band EQ, stem mutes, exported cue buttons, crossfader and ±16% tempo. **Tempo changes pitch; no key lock.** Cue markers seek immediately, preserving play/pause state; reset stops and returns to zero. Loop markers seek to their start and do not enable a loop. Layout changes preserve rates and playback.

Both exercise tracks now have four validated local stems. Source and output SHA-256, common sample counts/rate/channels, relative stem levels, recombination headroom and coarse time origin pass. Drum onset checks cover only the exercise windows: A has median -51.58ms / p90 absolute 55.67ms; B -3.04ms / 5.62ms, 32/32 matched beats each. Exported grids are unchanged and **global alignment remains unverified**. These onset measurements do not establish musical downbeat/phrase correctness or separation quality. Andrew's audition remains pending. Private comparison clips and listening instructions are in `local-tracks/audition/`; browser handoff recording and numeric results are in `local-tracks/evidence/` and remain Git-ignored.

Astra returns structured **one observation + one next action**, only through read-only `gpt-6-astra` Responses. Outgoing data excludes private titles, paths, hashes and the collection; only existing stems are described as available. **No server API key was available**, so genuine model behavior remains unverified. Configure `OPENAI_API_KEY` only in Vercel as described below, then test the hosted preview. Do not add a local key. Mocked gateway tests prove request/error handling, not model usefulness. Playback works without Astra.

Current verification: `pnpm typecheck`, `pnpm lint`, `pnpm test` (30 tests), `pnpm test:browser`, `pnpm build`; preparation checks: `local-tracks/.venv/bin/python scripts/test_validate_prepared.py`. Details and exact outcomes are in `docs/BUILD_LOG.md`. The JS bundle remains about 916 kB / 250 kB gzip; private full-length stems consume substantial memory. Seek discontinuities, long-session dropouts, device/system audio and human musical usefulness still need audition. Blender integration is deferred for this checkpoint.

The sections below describe the earlier foundation; this current checkpoint supersedes their fixture-only practice and unsupported-tempo statements.


A local, playable 3D DJ instrument. Equipment iteration: two or four digital players, a two-turntable ALT layout, one shared four-channel Web Audio mixer, and one repeatable handoff exercise.

## Run

Prerequisites: Node 22.12+ (tested with 25.5.0), pnpm 10 (tested with 10.27.0), a current browser with Web Audio and WebGL. Desktop pointer/keyboard is the primary tested surface.

```sh
cd /Users/misawa/booth-mixtape
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:5173. The launch script starts Vite and a loopback-only gateway on port 8787. No credentials are needed for the instrument. The task branch is `codex/phase-1-playable`; no remote, deployment, or initial commit has been created.

## Play one transition

1. Click **Start audio**, then **Start practice**. A begins at its original cue; B is cued, both levels are 80%, both filters open, all fixture stems enabled, and the crossfader is at A.
2. Watch the practice beat countdown. At **bar 5 / 8 seconds**, click B's 3D **PLAY**, or press **P** with the booth focused.
3. Drag the central crossfader right to B before **bar 9 / 16 seconds**. The exercise records B's actual start error (target ±0.25 seconds) and handoff time. It does not judge taste.
4. Read the observed result and click **Retry practice**. Original tracks, cues, stems, levels and filters return to the checkpoint; A starts from a fresh audio-clock origin.

For free play, use either deck's PLAY/CUE buttons. Drag EQ/filter knobs right to raise the value or left to lower it; their indicators increase clockwise. Vertical knob drags also work (up raises/opens, down lowers/closes), with the chosen axis held until release. Drag channel faders vertically and the crossfader horizontally. Jog rotation is a transport indicator only. Stop all decks leaves the app ready for another mix.

Keyboard: **Q/P** play/pause A/B, **W/O** cue A/B, **←/→** blend in 5% steps, **R** retry, **Space** stop all decks, **E/I** play/pause C/D, **Alt** switch digital/turntable layouts. Shortcuts do not intercept focused inputs/buttons; focus the booth or page first. The expandable **Track library & accessible controls** provides native keyboard sliders and the same commands.

The two 32-second, 120 BPM tracks loop continuously. The six drum/bass/melody buffers are original generated components, not source-separated recordings. Grid/cues are fixture-known. Local audio loading supports browser-decodable files up to 25 MB and 10 minutes. Imports are hashed and labeled analysis unknown; no guessed BPM, key, grid, or stems. Retry restores the fixture pair. Concurrent load results use replacement tokens.

**Capture mix** records the engine's actual master bus locally, without microphone permission. Finish capture and save the audio. This is an internal mix recording, not system-audio/video capture. The current UI does not persist sessions after a full page reload.

## Equipment layouts

Choose **2 CDJs** or **4 CDJs** for digital playback. **ALT · 2 turntables** (or the Alt/Option key) swaps to two Technics-inspired turntables and back to your previous digital count. The four CDJs run A / B / C / D from left to right, with the mixer between B and C. The central mixer always has four real channels, also ordered A / B / C / D. A+C route to the left crossfader bus; B+D route right. Each has level, low-pass filter and three-band EQ (±12 dB). Master level starts conservatively at 0.35; EQ boosts can increase peaks, so live meters should guide levels.

Tracks, source clocks, channel levels, EQ and stems survive switching; the engine is not recreated. C/D transport controls remain visible in two-player/vinyl mode, and their mixer channels remain live. A held 3D control locks layout switching until release/cancellation. Practice still uses A/B; using C/D during it invalidates the attempt, and retry stops/resets all four.

Click a player's **LOAD** or **LOAD VINYL** to open its library. In the turntable layout, **Record crate** selects a fixture for that platter; **Load vinyl audio** imports a local recording. Digital mode exposes the same sources as a digital library. Loading cues/stops only the target deck. This is file-backed vinyl playback, not a physical record reader or scratch emulator. Two demo compositions are reused on C/D; four independent decks does not mean four new tracks.

Geometry follows the user's supplied equipment references: separate black players, raised displays, silver jog rims, illuminated transport rings, and turntables with platter grooves, strobe rims and S-shaped tonearms. Screen amplitude previews use the loaded drum buffer (fixture) or original buffer (import), never fabricated waveform data. Jog/platter movement follows source position. Pitch sliders on the turntable geometry are labeled fixed speed; scratching, pitch/rate changes and key lock remain unsupported. Blender asset exports remain unavailable.

Evidence: `docs/evidence/four-cdjs.png`, `turntables.png`, and `layout-continuity.webm`. The layout regression captures the real output while C/D play, changes EQ, loads A in vinyl mode and returns to digital. It checks nonzero decoded signal and no near-silent run longer than 100 ms after the initial 0.5 seconds. This finite capture is not a long-session dropout guarantee.

## Astra

The server has a bounded, read-only `POST /api/hint` integration for exactly `gpt-6-astra` using HTTPS Responses, native Node fetch, a 25-second timeout and compact state. It cannot execute mixer commands. No API key was present in this session: the UI accurately shows unavailable, and no genuine model response or account access is claimed.

Configure `OPENAI_API_KEY` **server-side in Vercel**, not in this checkout. Never use a `VITE_` variable for the key. Request a hint to verify account access. Success reports the returned model and response ID; errors leave playback alone. A hint generated against changed controls is labeled an earlier snapshot. The client sends track IDs, timing, controls and bounded recent history—not raw audio or imported filenames.

[Official model documentation](https://developers.openai.com/api/docs/models/gpt-6-astra) and [Responses reference](https://developers.openai.com/api/reference/typescript/resources/responses/methods/create) informed the adapter. [Native steering](https://developers.openai.com/api/docs/guides/steering) requires a Responses WebSocket flow; feasibility is documented, but no live steering experiment was possible without credentials. This HTTP hint path is not native steering. No automatic plan or write tools exist in this checkpoint.

## Verification

These commands were run successfully during development:

```sh
pnpm fixtures        # regenerate two mixes, six aligned WAV stems, content hashes
pnpm typecheck
pnpm lint
pnpm test            # 12 tests: domain, fixture alignment/hash/headroom
pnpm test:browser    # 6 tests: controls/reset, offline DSP, recorded handoff, import, layout/audio continuity
pnpm build
```

Browser tests use Playwright Chromium; if absent on a new machine, install it with `pnpm exec playwright install chromium`. `pnpm test:browser` starts the development server if needed. Fixture generation should reproduce the committed manifest inputs; generated WAV files are included locally. Only one package lockfile is used.

Evidence in `docs/evidence/`:

- `booth-ready.png`: inspected in-app browser booth and explicit missing-Astra state.
- `controls-changed.png`: pointer-operated 3D controls reflected in accessible state.
- `practice-complete.png`: actual automated timed handoff completed.
- `mobile-booth.png`: responsive 390px inspection; no horizontal overflow. Small 3D controls need accessible alternatives on phones.
- `offline-booth-transition.wav` / `audio-check.json`: 12-second offline render through the real channel factory, six decoded stems, crossfade and filter sweep. Gain-zero RMS is 0; 4 kHz low-pass test attenuated RMS from 0.5657 to 0.0010; fixture render peak 0.3119.
- `live-booth-handoff.webm` / `live-capture-check.json`: actual browser engine master-bus capture from a successful exercise; decoded output is nonzero and below clipping. Exact measured values are in the JSON.

Open `/tests/audio.html` on the development server to reproduce the offline routing verification and download/play the render. It is a development harness, excluded from the production entry.

**Manual listening procedure still needed:** use moderate speaker/headphone volume; play A, close/open its filter, mute its channel, then cue A; start practice, introduce B at bar 5, move the crossfader through center to B, and retry. Listen for musical distinction, harsh transients, boundary clicks, effect changes, headroom and continuity. Capture a mix and listen back. Andrew's musical audition, device speaker output, long-session dropout behavior, and end-to-end system-audio recording remain unverified. Offline output and internal capture do not establish those claims.

## Scope and structure

`src/domain`: commands, ownership/provenance, audio-time mapping, practice checkpoint/history. `src/audio`: persistent AudioContext, buffer groups, routing, decoding and meters. `src/scene`: original named Three.js geometry and raycast controls. `src/App.tsx`: shared accessible inputs and small practice/status UI. `server`: read-only Astra gateway. No scene-owned playback or model-timed audio.

Current equipment uses an editable Blender mixer across two/four digital-player and turntable layouts; players remain procedural. Bounded playback rate/seek, local preparation and Rekordbox metadata import are implemented (see later build-log entries). Rate changes pitch. Gestures, scratching, key lock, native mid-turn steering, automatic mixing and durable session persistence remain unsupported. A production deployment and genuine Astra hints predate the visual iteration; this iteration is local only. The production JS bundle is approximately 1,008 kB / 275 kB gzip, with the existing large-chunk warning. Bounded local frame measurements are recorded below; no long-session performance budget is established.

Next iteration: Andrew auditions one transition and gives Phase 2 feedback on control readability, feel and musical usefulness. Preserve this loop while verifying real Astra access. See `docs/BUILD_LOG.md` and `docs/PROVENANCE.md`.

## Private local track library

Put tracks in `local-tracks/originals/` (Git-ignored). Nothing here is copied into `public/` or the production bundle. Install the local preparation environment once:

```sh
brew install ffmpeg
uv venv --python 3.11 local-tracks/.venv
uv pip install --python local-tracks/.venv/bin/python -r scripts/preparation-requirements.txt
local-tracks/.venv/bin/python scripts/prepare_tracks.py --scan
```

The scan creates 32 kHz stereo float-WAV playback copies and atomic manifests under `local-tracks/prepared/`, preserving originals. These are resampled working copies, not bit-identical source masters. Each content-hash folder contains a manifest with its track ID. Separate one full track using that ID:

```sh
OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 local-tracks/.venv/bin/python scripts/prepare_tracks.py --separate local-<64-character-source-sha256>
```

Preparation uses Demucs htdemucs locally, downloading only model weights. No tracks are sent to Astra or an external separation service. Four stems are validated for finite samples, identical length/sample rate/channel count; one shared gain factor limits stem/recombination peaks. Failed preparation retains original playback. The supplied pre-existing `stem_splitter.py` is not executed or redistributed.

Run `pnpm dev`, then open **Track library & accessible controls** (or a player's LOAD control). Each deck selector includes the private library and preparation status. The list refreshes every 15 seconds. Select a prepared track to load drums/bass/vocals/other; no original is routed alongside those stems. **Reload prepared version** explicitly loads a newer preparation; background completion never replaces a live deck. Successful loading cues only its destination; current audio continues during decoding. Retry restores the original exercise fixtures.

No BPM/key/downbeat analysis for these tracks yet. Four-stem playback consumes considerably more memory than an original; unused local buffers are released when tracks are replaced. Preparation is a CLI worker, not a browser queue; no resumable in-app job controls yet. Re-run a failed separation explicitly. Browser integration test `tests/library.browser.ts` requires a local prepared track and skips without one. Private music must remain out of shared evidence recordings.

### Rekordbox metadata

`python3 scripts/import_rekordbox.py mixtape-booth.xml` imports unique filename + byte-size matches with a duration sanity check into local manifests. It preserves exported grid anchors, BPM, key, cue and loop markers, and the export hash. Review ambiguous matches in `local-tracks/rekordbox-review.md`; no newest-entry or title-only guessing. Both XML and reports are private/Git-ignored. Reload a selected track to adopt imported metadata. Waveforms draw supported 4/4 anchors piecewise, label beat 1 and cue/loop starts; markers do not trigger seeks or loops. Other meters are retained but not rendered. Rekordbox alignment is unverified until auditioned; the export does not establish which grids were manually corrected. Import does not implement tempo adjustment or sync.

The current private demo selection is `local-tracks/demo-selection.json` (`trackIds` array). Library listings and file routes honor it; omitted tracks remain stored locally. Without this optional file the local library lists all prepared originals. The two generated practice fixtures remain separate from the selected local collection.


## Editable mixer and living sleeve — local review

Run `pnpm dev`, then open [the mixer](http://127.0.0.1:5173/#play). Start audio, play a fixture, and drag the mixer’s EQ, filter, levels or crossfader. The same mixer loads in every layout. A missing/invalid model leaves the procedural mixer playable; an asset arriving during a grab waits until release. Layout changes retain the audio engine, loaded tracks, stems and effective values.

For the optional camera prototype open [the development sleeve preview](http://127.0.0.1:5173/?livingSleeve=1#play). It starts with original static artwork. **Put me in the mix** explicitly requests video only; **Turn camera off** releases its tracks. **Still artwork** stops video and is initially selected under reduced motion. Voice retains its independent microphone button. The camera UI/shader are excluded from production builds. No gesture tracking is enabled, and no camera frames enter mix capture or model requests.

Rebuild the editable source and browser export with installed Blender 5.2.1 LTS:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python assets/blender/create_mixer.py
```

Optional generator arguments after `--`: `--blend PATH --glb PATH --public-dir PATH --render PATH`. Defaults are repository-relative; `.blend` preserves editable details and constraints, while `.glb` consolidates surfaces by material/control. Runtime bindings live in `public/models/mixtape-mixer.bindings.json`; the `.blend1` file is Blender’s retained backup of the earlier uncommitted source.

Verified commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and focused browser checks with `pnpm exec playwright test tests/mixer.browser.ts tests/camera.browser.ts tests/layout.browser.ts tests/visual-performance.browser.ts`. Unit gateway tests and browser tests need permission to bind/access localhost in sandboxed environments. Existing private-library/exercise tests require the prepared local data; they skip when their prerequisites are absent.

Screenshots, control-to-DSP observations, paired frame measurements and actual master-bus fixture audio are indexed in [the visual evidence record](docs/evidence/visual-iteration/README.md). Synthetic camera/microphone lifecycle tests are distinct from real-device or genuine voice-conversation evidence. Andrew’s audition and a real simultaneous camera/microphone session remain pending. Next: review mixer readability and the living sleeve before separately arming a single crossfader gesture.

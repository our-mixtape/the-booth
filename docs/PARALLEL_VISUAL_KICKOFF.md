# Kickoff: editable mixer and living sleeve

Continue Mixtape — The Booth in `/Users/misawa/booth-mixtape`. Read `AGENTS.md`, `docs/BUILD_PLAN.md`, and the latest entries in `docs/BUILD_LOG.md`. Implement a reviewable local visual iteration while the existing task tests the deployed voice module. Do not stop at a plan.

## Current state and boundaries

- Production is https://mixtape-the-booth.vercel.app/#play . Its server-side OPENAI_API_KEY is configured only in Vercel Production. A genuine Astra hint is verified; live spoken conversation is not yet verified. Never download secrets or request a local key.
- Keep the existing TypeScript/Three.js/Web Audio runtime, shared four-channel session, digital/turntable layouts, direct controls, and repeatable practice. Inspect actual code for current behavior; older documentation may describe earlier checkpoints.
- Preserve the warm editorial palette, oversized typography and equipment composition. The proposed visual direction is “step into your own mixtape,” with an optional living record sleeve. Do not assume a realistic listening-bar room is the desired direction.
- The voice-testing task owns `server/`, `api/`, `src/AskAstra.tsx`, `src/agent/`, their tests, and deployment. Do not change those files or publish anything from this task. Do not change DNS or the existing charity jukebox.
- Inspect the dirty checkout before editing. Do not reset or clean it. Worktrees based only on HEAD may omit this project's uncommitted application; verify the complete starting state before isolating work.

## Parallel work and integration ownership

Use two bounded development subagents if available. These are development helpers, not new runtime agents. Give each exclusive file ownership. The coordinator owns shared UI integration, dependencies/lockfile, regression tests and documentation. Do not let multiple agents edit the same scene or App file.

### A. Blender mixer — first required checkpoint

Own `assets/blender/`, new `public/models/` assets, and a new scene asset-loader/binding module. The coordinator alone integrates into `src/scene/booth.ts`.

Blender 5.2.1 LTS is installed. Existing `assets/blender/mixtape-mixer.blend`, `.glb`, and `create_mixer.py` are real but not integrated. The GLB audit found about 2.24 MB, 393 meshes, 39,684 triangles, and 25 control-tagged nodes; four channels already exist in C/A/B/D order.

1. Inspect and repair the generator: parameterize export paths; parent indicators, knurling and fader marks to their moving controls; define pivots, travel limits, and exported Y-up transform bindings.
2. Preserve stable control IDs such as `A.high`, `A.filter`, `A.gain`, and `crossfader`. Add explicit hit regions. Remove or disable cosmetic trim until it has a real command/DSP implementation.
3. Consolidate static details where practical; record exported size, triangle count and runtime draw calls. Avoid tiny decorative details at the expense of legibility.
4. Export editable `.blend`, browser `.glb`, and a small control-binding manifest. Inspect the exported model in the browser; a Blender render alone is insufficient.
5. Replace only the mixer geometry across the existing layouts. Use the current validated command and effective-state paths. Preserve the procedural mixer as a load-failure fallback. Leave players and audio architecture intact.

### B. Living sleeve — independent optional prototype

Own a new `src/camera/` module and isolated component/style files. Do not edit App or shared theme directly; provide an integration contract to the coordinator.

1. Build one optional “Put me in the mix” camera treatment: a cropped live portrait in the sleeve/circular artwork, using the established ivory/oxblood/amber palette and a restrained halftone treatment.
2. Request video only after explicit user action. Camera and voice microphone controls must remain independent. Keep camera frames out of API calls, analytics and recordings; verify network behavior. Stop all owned video tracks on disable/unmount. No automatic microphone access.
3. Start with a video texture/shader. Defer segmentation, face tracking, avatars and a floating crate. Verify any new library's current official API and license before adopting it; let the coordinator own dependency changes.
4. Provide static/no-camera and reduced-motion alternatives. Camera failure must leave the instrument playable. No emotion, taste, room-scanning or enjoyment inference.
5. Keep this prototype behind an opt-in development feature switch until it passes review.

## Later checkpoint: one deliberate gesture

Only after mixer integration and the camera treatment are independently reviewable, add a separately armed pinch/grab controlling the crossfader. Run tracking off the main thread where supported and verify frame-transfer overhead on the actual laptop. Do not run segmentation, face tracking and hand tracking together by default.

Hovering or dancing must not move audio controls. Require an explicit target/grab; release or tracking loss holds the last value and requires a fresh grab. Pointer/keyboard remain available. Use the same ownership/command layer. No scratch claim. Do not expand this into general gesture control before Andrew tests the single blend.

## Keep Astra and timing honest

Camera rendering, tracking, gestures and audio scheduling run locally. No model call belongs in a per-frame or beat-scheduling loop. Astra receives bounded semantic state, not a continuous webcam stream. Visual-plan generation and native mid-turn steering are future companion work: the current Ask uses HTTP cancellation/replacement, which must not be presented as native steering. Do not fabricate available tracks, instrumental readiness, annotations, voice success or visual-plan APIs.

Blender is the asset-authoring tool for this iteration. Houdini is optional later for one baked sleeve-fragment effect if justified. Do not install Unity/Unreal, provision GPUs, purchase services or replace the runtime in this task.

## Acceptance and handoff

- Mixer controls visibly follow effective state; each grab changes the intended audible parameter.
- Layout changes preserve loaded tracks, playback position, stem routing and mixer values.
- Failed model loading, camera denial, camera stop and tracking loss preserve manual playback.
- Capture browser screenshots and actual audio evidence separately. Measure frame timing before/after on the same hardware and report observations, not invented budgets or unperformed listening checks.
- Verify microphone/camera independence alongside the voice-testing task when ready; do not claim a combined test from separate tests alone.
- Run appropriate existing typecheck, lint, unit, browser and production-build checks. Add focused tests for asset binding/fallback and camera lifecycle rather than implementation-mirroring snapshots.
- Update BUILD_LOG and PROVENANCE with exact changes, tool/version use, evidence, limitations and next action. Report the first mixer checkpoint promptly; do not wait for every camera/gesture idea to finish.
- Hand back a local preview, changed-file list, screenshots, audio evidence and one recommended next iteration. No production deployment from this task.

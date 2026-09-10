# Mixtape - The Booth: playable-first build plan

Prepared 2026-09-10. Proposed execution sequence, not a record of completed work.

Read [AGENTS.md](../AGENTS.md) first. Run the [kickoff prompt](../KICKOFF_PROMPT.md) to begin Phase 1. The numbered phases are reviewable iterations; they are not an instruction to disappear until the entire roadmap is complete.

## The development method we are borrowing

The user supplied Little Ritual's eight-part build process. Its first step creates a playable game; subsequent passes develop visual character, editable Blender assets, richer content, controls, and final optimization. We are adapting that ordering and feedback method to an instrument. We are not copying its world, characters, code, artwork, or game mechanics. Source: [Little Ritual](https://developers.openai.com/showcase/little-ritual), checked 2026-09-10.

**Our method:** build a small experience -> run it -> inspect the image and listen to the audio -> get feedback -> change one meaningful layer -> repeat. Preserve working controls and actual sound on every pass.

The first checkpoint is deliberately smaller than the completed submission. Model access, audio, and hand-tracking feasibility should be tested early in parallel with that checkpoint, not deferred until final polish. A brief feasibility result should not turn into a week of framework research.

## Phase 0: establish the working environment

This is a short preflight, not a separate infrastructure project.

Inspect the actual repository, instructions, package manager, existing changes, operating environment, browser automation, audio capture, Blender/Blender MCP, and available model credentials. Do not print secrets. Record what is available and choose the smallest viable implementation. Do not assume an app, domain deployment, API key, or GPU exists because the planning packet mentions it.

For an empty repo, use the defaults in AGENTS.md unless a concrete constraint favors another choice. Preserve an existing compatible stack. Establish local development and a minimal build/test command before adding abstractions.

Check Astra with the actual account using a small, bounded request where authorized. Verify tool execution and transport support before claiming native steering or async behavior. If credentials are unavailable, proceed with local playback and explicit unavailable-assistant state; do not present a fixed reply as Astra. A development fixture may test the parser, but must remain labeled and excluded from model evidence.

The supplied stem splitter is reference material, not a green light to copy old code. Start with original audio fixtures or rights-cleared local assets so model and separation compute do not block the instrument.

**Deliverable:** a working checkout, recorded implementation defaults and prerequisites, plus an initial capability check. Do not pause here just to ask whether you should start coding.

## 1. Build the playable mixing loop

### Phase brief

Build an original single-player 3D browser DJ experience called Mixtape - The Booth. Put the player at a compact, inviting club booth with a central mixer and two digital media players. Make the scene itself playable: controls should start actual audio, move actual channel levels and crossfader values, and change an audible filter or EQ parameter. Start with two short musical fixtures whose timing is known and whose use is cleared. Give the player one musical objective, a clear starting point, and a retry button. Keep the modules small so we can replace the equipment, inputs, audio source, and coaching behavior without rebuilding the instrument. Begin with a usable version and improve it through observed interaction.

### Build in this order

1. Establish a persistent audio engine and deck state. Verify two distinguishable audio signals reach the output before detailed scene work.
2. Add source position, play/pause, cue/reset, channel gains, a crossfader, and a filter/EQ control. Smooth parameter changes and use the audio clock for scheduled actions.
3. Render a simple but recognizable CDJ-style booth. Bind visible controls to the shared command API. Pointer and keyboard input are the first reliable controls.
4. Add known fixture beat/phrase metadata and readiness labels. Optionally accept a local file for basic playback with unknown analysis. Fixture metadata must not leak onto a newly loaded file.
5. Add one short challenge and a deterministic reset. Capture the beginning state and meaningful actions, not just a score.
6. When access works, let Astra inspect a compact session and give one state-grounded hint. A request such as "What should I adjust next?" must refer to an actual control or event. No agent writes or full automation are necessary yet.

### Suggested first challenge

Start A at a known point. Cue B from a known point. Begin B at the indicated phrase boundary and move from A to B within the defined exercise window. The application records the entry point, control actions, and result. Feedback is limited to those facts; it does not claim to assess artistic quality.

Use fixture-known tempo and structure. A loop with drum, bass, and accompaniment components can exercise stems. Vocal-over-instrumental claims require actual vocal content with permission; a synthesized lead is not a vocal.

### Acceptance gate

A new user can start audio, identify both decks, manipulate the actual 3D controls, hear the difference, complete an attempt, and reset to the same source state. The engine survives rerendering and a missing model connection. Tests cover gain bounds, source position, cue/reset, and routing. Capture visual evidence and audio evidence separately. Document unsupported analysis and fixture origin.

**Feedback checkpoint:** show this version to Andrew before treating the visual style, challenge, or engine as settled. Do not complete the second booth and all later phases first.

## 2. Give the booth a tactile visual identity

### Phase brief

Make the working booth feel warm, musical, and inviting. Improve proportions, material contrast, lighting, labels, and control affordances. Give the mixer and players readable silhouettes and generous hit targets. Use physical depth to organize the controls, while keeping the working surface easy to see from a performer's camera angle. The aesthetic should support an instrument, not a floating collection of dashboard cards.

### Scope

A proposed starting direction is dark equipment, warm wood or a neutral tabletop, clear illuminated states, and restrained club lighting. This is a visual default for review, not a locked brand palette. Avoid copying commercial logos. Prefer a stable close performance camera, with optional inspect/orbit mode that cannot steal a fader drag.

Show hover, focus, grab, and release states. Do not rely on color alone. Provide readable labels and conventional controls for users who cannot operate the 3D interaction. A deck display should show actual loaded content and state, never a decorative waveform disconnected from playback.

### Acceptance gate

The first challenge still works and sounds unchanged. Screenshots at the actual demo viewport show legible controls. Input targets do not overlap or disappear behind geometry. Selection/camera movement does not alter audio. Check reduced-motion behavior and text contrast. Record visual revisions rather than asserting the scene is polished without inspecting it.

## 3. Create editable Blender assets with named moving parts

### Phase brief

Replace provisional geometry with an original, editable Blender equipment kit. Create one shared mixer plus a digital player and a turntable. Name and separate every part that needs to move or receive input. Set sensible pivots, local axes, material groups, and animation limits. Export compact browser assets and verify that the exported control names still bind to the running instrument.

### Asset contract

Maintain source `.blend` files, exported `.glb` files, and a small control-binding manifest. The manifest maps stable application control IDs to named scene nodes, allowed movement, hit regions, and display bindings. It must not embed independent audio state. Use reproducible scripts or recorded export steps; record actual Blender version and dependencies when established.

Example semantic IDs are `mixer.crossfader`, `deck.A.channelGain`, `deck.B.filter`, and `deck.A.play`. These illustrate the naming approach; choose a consistent schema and test it rather than creating dozens of unused controls.

Include turntable platters and pitch controls, but do not model tiny screws before the shared mixer works. Record motion must reflect playback. Scratching is excluded until real audio behavior exists. Use original construction and permitted materials, not ripped commercial assets.

Blender MCP can assist authoring, but verify it first. Headless Blender scripting is another route. If neither works, retain provisional geometry, provide the authored generation source when useful, and clearly mark export/visual QA incomplete. Do not claim a generated `.blend` if only a script exists.

### Acceptance gate

Source files open, exports load, required node IDs exist, pivots work, controls bind correctly, and the audio challenge remains functional. Inspect source and browser render when tools permit. A schema test alone is not visual verification. Measure exported size and draw-call/frame behavior rather than assuming low poly guarantees performance.

## 4. Expand the instrument: the second rig and prepared tracks

Implement 4A and 4B as separate small changes. They do not need to ship simultaneously.

### 4A. Switch between the two club setups

Add the turntable-style rig using the same mixer and command bindings. Preserve deck identity, loaded tracks, source playheads, loops, gains, stems, assistance mode, and accepted plans. Preload the second layout. A restrained swap animation is optional; stable audio is mandatory.

Do not switch while a pointer/hand holds a control without explicitly resolving that grab. Do not silently change sync, key lock, difficulty, or playback tone when changing appearance. State clearly that this is turntable-inspired interaction, not a faithful mechanical emulation.

**Gate:** switch during a blend, inspect state before/after, and hear no restart or unintended level jump. Test repeated switches and the held-control case. Capture the full uninterrupted passage.

### 4B. Turn a dropped track into a prepared instrument

Add an ingestion job around rights-cleared local audio. Decode and identify content, retain the original, then run eligible separation/analysis tools. Build a versioned manifest, progressive readiness, confidence/provenance, and explicit failures. Keep long-running processing out of the live UI/audio thread.

Start with the conventional four stems: vocals, drums, bass, other. Use synchronized lossless files internally. Verify output completeness, common timing, sample rate/count, gain behavior, and recombination. Do not include both original and reconstructed sources in the output unintentionally.

Add BPM/beat/key estimation through verified dependencies or import of prepared results; check licenses before distribution. Human corrections and fixture-known metadata are first-class sources. Downbeats, vocal regions, phrases, and tempo drift require separate work; do not infer certainty from a whole-track BPM or key.

Use content/version identifiers and bounded job execution. Preserve useful completed work without allowing a result for a replaced track to modify the current deck. A stem job is not complete because the acapella file exists. No arbitrary shell text supplied by the model may reach a worker.

**Gate:** process one new eligible test file with visible progress and inspect the output. Keep live playback usable while processing. Show capability-specific availability. If separation hardware is unavailable, show a prepared manifest accurately and mark live separation blocked, not complete.

## 5. Add Astra's performance and practice companion

### Phase brief

Give Astra access to the actual musical map and live instrument through bounded tools. Let it help choose and prepare the next transition, accept corrections while working, and explain one relevant moment of an attempt. Its suggestions should become inspectable actions in the same booth. Preserve performer ownership and use the engine for exact execution.

### Minimum state and tool surface

Expose reads for session, track analysis, capability readiness, control ownership, relevant history, and challenge conditions. Add preparation requests, validated plan proposals, explicit arming/cancellation, and practice checkpoint operations as needed. Human gestures and tools must use the same domain commands.

A proposal carries track IDs, analysis versions, relevant state revision, prerequisites, supported operations, parameter bounds, timing boundaries, and expiry. Readiness and authority are checked at validation and again before execution. Missing data should yield a smaller plan or a focused question, never invented metadata.

Keep at most one active plan affecting the same controls initially. Distinguish proposed, validated, armed, scheduled, applied, cancelled, and failed. Commands are idempotent. The agent cannot approve its own actions. Track replacement, loop changes, and manual takeover must invalidate the affected future work, including already queued engine automation.

### Astra-specific experiment

Request: "Keep A's vocal over B's rhythm section and leave the bass handoff to me."

During the actual response, revise: "Keep A for another phrase, and give me a hint instead of doing the handoff."

Test native mid-turn steering with the documented Responses WebSocket events and actual account. The revised plan should preserve the remaining constraint and respect the new assistance level. This is not evidence of native steering if implemented as a second ordinary request. References: [S2-S4] in the source appendix.

Use async tools for preparation only after verifying application job handling, call identities, and compatibility. Musical action timing remains local. Reasoning-effort changes are optional after the main loop works; do not introduce incompatible history management merely to advertise another feature.

### Practice loop

Store a replayable checkpoint and action history. Astra can identify a supported issue, suggest one change, and generate a focused retry. "Show me" plays a labeled demonstration only on request. "Let me try" restores the same starting state and gives controls back. "Challenge me" changes one relevant condition instead of randomizing the whole problem.

A useful example is distinguishing repeated phase nudges from a persistent tempo mismatch, provided the engine data supports it. Do not judge a learner on a technique the software automatically performed. Do not score general musical taste as if it were a deterministic invariant.

### Acceptance gate

Two different user constraints yield meaningfully different valid assistance, not only different wording. Show a real correction during a live response where supported. Verify manual takeover and stale/late plan rejection. Demonstrate one checkpoint/retry with known state, assistance labels, and an observed result. Have Andrew audition usefulness; obtain a second-user interaction when feasible. Leave unverified claims unverified.

## 6. Give Mixtape an original place to inhabit

### Phase brief

Create original Mixtape signage, record labels, a small wall treatment, and a distinctive but quiet booth environment. Keep the visual language consistent with the equipment. Let spatial feedback help the performer understand selection, preparation, and musical handoffs without becoming a distracting animation show.

This phase translates Little Ritual's identity-art pass, not its specific mural. Original assets need documented sources and permissions. Generated artwork is optional, and decorative art must never delay the core audio/model demonstration.

Optional details: a crate of prepared tracks, labels that identify real source material, lighting that follows measured output, and a satisfying completion flourish. No full club crowd, explorable venue, inventory economy, or extra instruments unless separately authorized.

**Gate:** branding is legible, the equipment remains the focus, art does not conceal controls, performance is still within observed device limits, and source/licensing records are complete. Under deadline, skip this phase rather than compromise sound.

## 7. Refine hand controls, accessibility, and camera behavior

### Phase brief

Add camera-based hand control as another way to operate the existing instrument. Make selection, grab, movement, and release predictable. Keep the pointer and keyboard fully usable. Refine the camera and interface so a performer can act without hunting for controls or accidentally moving the world.

Begin with a small mapping: pinch-drag a fader; select then vertically adjust a filter; select/confirm a track for the idle deck. Test one before adding the others. Visual feedback should show when a gesture is armed, recognized, applied, or lost. Hover alone cannot change audio.

Prefer local tracking, permission-based camera use, confidence thresholds, dead zones, and smoothing. Avoid long-running landmark inference on the render path. When tracking disappears, leave values stable and release the grab without allowing automation to seize it. An explicit request returns control to automation.

Mobile layout/readability is a useful refinement, but a polished mobile hand-performance mode is optional. Desktop performance and keyboard access are the first target. Add reduced motion and camera-reset controls. Headphone preview/output routing should be tested separately; without it, describe the stage experience as a prepared mix rather than a full live-DJ replacement.

**Gate:** the performer can make repeatable audible changes, lose/recover tracking safely, switch to a mouse, and operate either rig. Record false activations and input responsiveness on the actual machine. Do not promise tactile scratch precision or gesture recognition for every user.

## 8. Optimize, evaluate, and record the working product

### Phase brief

Optimize the complete playable loop and capture it as an honest demonstration. Preserve modular editable assets, responsive controls, stable audio, and useful assistance. Resolve the failures that damage the experience before adding more features.

Run focused domain and integration regressions plus actual browser/audio checks. Test both layouts, pending preparation, lost model connection, replaced tracks, held controls, duplicate tool results, missed deadlines, and checkpoint restoration. Check memory after repeated load/switch/reset. Separate offline DSP tests from live dropout observations. Test system-audio recording before producing the final video.

Use the official 25% categories: Astra in development, Astra in product, live demo, and technicality. Record a model-to-code/asset-to-verification development example. Score only observed work. Judge hypotheses help prepare answers about capability, repeat use, and the initial user; they do not change the rubric.

### One-minute submission proposal

Start with audible performance. Show one useful request, a real change of direction, and the resulting action or focused retry. Briefly show the shared-state booth switch only if it works reliably. Identify the work built during the event and one concrete Astra development contribution. Preserve actual timing or disclose edits. The existing guide requires a public repository and accessible video; signed-out checks are part of release preparation.

A cinematic trailer is optional after the functional capture. It cannot substitute for the required working demo. Do not auto-publish or submit; follow the user's authorized release instructions.

**Gate:** a fresh checkout can reproduce the documented supported scope; public artifacts contain no secrets or uncleared tracks; claims match code and evidence; remaining limitations are explicit. The manual instrument remains useful without the assistant.

## Acceptance priorities and scope cuts

### Keep

Actual sound; one complete transition challenge; direct reliable controls; a shared two-deck session; stem-aware data/contracts; one genuine Astra assistance path; human takeover; honest evidence; editable assets as their phase completes.

### Complete next as iterations permit

Second rig; actual ingestion/separation; native steering; hand controls; richer replay; one stem-aware transition with real vocal material. These are intended product features, but must not be represented as complete before testing.

### Cut first

Room decoration, broad mobile support, cinematic trailers, many lessons, arbitrary catalog imports, paid integrations, faithful scratch physics, a third rig, automatic crowd judging, orchestras, and custom model training.

Do not trade away the only working model feature to polish the scene, and do not trade away the working instrument to build elaborate agent infrastructure.

## What to record after each phase

Update the implementation build log with the phase, actual branch/commit, changed components, tested commands, failures corrected, current limitations, and screenshots/audio evidence. Maintain asset/code/music provenance. Record user feedback separately from your interpretation and list the single next iteration. Keep the root AGENTS.md focused on durable instructions rather than a growing daily diary.

# Kickoff prompt: Mixtape - The Booth

Paste the prompt below into the coding agent after placing this kit in the intended project. It authorizes local implementation of the first playable slice; it is not a claim that an application has already been built.

---

You are the lead product engineer and creative developer for **Mixtape - The Booth**, our new playable 3D DJ experience for the GPT-6 Astra Hackathon NYC. The intended destination is **booth.ourmixtape.org**. Start development now in the current project, following its actual instructions and preserving unrelated work.

Read the root **AGENTS.md**, then **docs/BUILD_PLAN.md** through Phase 1 and its acceptance gates. Consult **docs/CONTEXT_AND_SOURCES.md** and the historical event/rubric notes only where needed. Older references that call the name undecided or describe an orchestra, event operator, or three rigs are superseded. Do not restart product discovery.

## The product

Build an original browser instrument where a person can prepare tracks, mix them through a 3D booth, and learn from a focused attempt. We will ultimately support **a mixer with two CDJ-style players** and **the same mixer with two Technics-style turntables**, sharing one continuous session. Hand control is a later input adapter; pointer and keyboard performance must work first.

Astra is the performance/practice companion. It reasons over actual track information and live controls; the audio engine performs the timing. This is not a dashboard, a chatbot in front of a fake mixer, or a three-dimensional video of someone else mixing. Mixtape is our existing brand, but this is a new implementation isolated from the existing charity-jukebox product.

Use the method in OpenAI's **Little Ritual** example: begin with the smallest complete playable experience, then improve the look, editable assets, content, interactions, and performance through reviewable iterations. Borrow the method, not its characters, artwork, or code.

## First assignment: complete Phase 1, then hand off a playable result

Begin with a brief repository/environment inspection and a short implementation plan. Check existing instructions, git status, package manager, browser/audio tools, Blender availability, and Astra access without revealing secrets. Use a task branch or worktree if appropriate. Preserve existing compatible architecture; for an empty project, use the defaults in AGENTS.md and record any justified change.

Do not stop after planning. Build and run a first version with:

1. **One working digital booth.** A recognizable central mixer and two digital players in a compact, inviting 3D setting. Simple original geometry is acceptable at this stage. Make the visible controls interactive and bind them to one shared session. Do not start with a polished landing page.
2. **Real, continuous audio.** Two short cleared tracks or original generated fixtures. Implement user-initiated audio start, deck play/pause, cue/reset, channel levels, crossfader, and an audible filter or EQ control. Use the audio clock and keep the engine outside scene lifecycle. No fake meters, decorative faders, or model calls for beat timing.
3. **A track-state foundation.** Identify source content, duration, source position, known fixture tempo/grid, cue points, and preparation provenance. Prefer separately generated fixture stems where practical, and expose controls only for audio that actually exists. Label fixture-known information as such. Imported tracks, if supported now, may play with analysis unknown; never invent BPM, key, stems, or phrases.
4. **One playable challenge and retry.** Let the user introduce B at a known musical boundary and complete a handoff. Store the starting state and meaningful actions. Provide a clear objective, observation tied to actual events, and a reset to try again. Do not create a curriculum, universal taste score, or multiple game modes.
5. **One shared control interface.** Pointer, keyboard, future gestures, and future agent tools must call the same validated commands. Establish control ownership and action provenance. A user action must not be overwritten by a stale automated result.
6. **A minimal genuine Astra connection when available.** Verify the actual `gpt-6-astra` account and use a server-side Responses integration to inspect compact session state and produce one useful, grounded hint. Record the model used. Keep it read-only for this first slice. If access is unavailable, expose a clear unavailable-assistant state and continue the local instrument; do not fake a reply or claim integration success. Inspect native steering feasibility early, but do not implement the full automation system in this checkpoint.

Use editable Blender assets if the toolchain already works without blocking the first slice. Otherwise keep named modular geometry that can be replaced in Phase 3. Do not claim `.blend` exports or asset QA you did not perform.

## Boundaries for this iteration

Do not build the second booth, full live stem-separation service, Spotify login, multi-agent orchestra, model training, scratch physics, multiplayer, extensive room decoration, or production accounts yet. Do not copy our old stem splitter into the submission as new work. Do not modify ourmixtape.org, publish a repository, change DNS, purchase services, deploy, or submit the hackathon entry without the appropriate separate authorization.

Keep API keys on the server. Use cleared audio with recorded origin. A generated musical lead is not a separated vocal. Distinguish local playback, metadata preparation, and model reasoning in the interface and evidence. Model failures must not stop manual playback. Missing dependencies are a reason to narrow a claim or use an honest fallback, not to stop all authorized work.

## Verify before calling it playable

Run the actual type/build checks and focused tests for deck state, gain bounds, routing, cue/reset, and command handling. Open the browser, operate the 3D controls, inspect the rendered scene, and capture or audition the output. Verify that moving a control changes sound and that resetting restores the intended source state. Test missing model access and ordinary rerenders while playing.

If browser audio or human audition is unavailable in your environment, use appropriate technical checks, preserve a reproducible manual procedure, and mark the listening check unverified. A screenshot, mocked API response, or successful build is not evidence that the mix sounds good.

Write a short README with exact tested commands, prerequisites, and limitations. Maintain **docs/BUILD_LOG.md** for observed progress and **docs/PROVENANCE.md** for dependencies, fixtures, assets, and event-built work. Record a concrete Astra development contribution when there is one. Do not generate an elaborate planning bureaucracy.

## Finish this checkpoint with

- The working branch/path and exact launch command.
- A concise account of the complete loop that can be played now.
- Tests run, actual outcomes, screenshots and audio evidence where available.
- Clear distinctions among working, provisional, unavailable, and untested behavior.
- One recommended next iteration, normally Phase 2 visual refinement based on Andrew's feedback, while preserving the critical model/audio feasibility work.

Make routine reversible choices and keep moving. Ask only for genuinely missing information that blocks a consequential action. **End this assignment at the first playable feedback checkpoint, not after implementing the whole roadmap. The result should be an instrument we can use and improve, not just a plan or rendered mockup.**

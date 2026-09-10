# Mixtape - The Booth: context, decisions, and sources

Prepared 2026-09-10. This appendix separates user decisions, design proposals, supplied event material, and externally checked documentation. It is not an implementation report or legal clearance.

## Reading order and authority within these project documents

1. [AGENTS.md](../AGENTS.md): durable working guidance and current product direction.
2. [BUILD_PLAN.md](BUILD_PLAN.md): proposed incremental phases and acceptance gates.
3. [KICKOFF_PROMPT.md](../KICKOFF_PROMPT.md): the first authorized coding assignment when the user gives it to an agent.
4. This appendix: source boundaries and historical decisions.
5. `docs/context/`: preserved earlier event brief, judge research, and unfilled scorecard.

The current user's task and the coding environment's higher-priority instructions still govern execution. This packet is not permission to ignore them. The archived brief is useful for the event but is not the current product specification.

## Decision record

| Topic | Current position | Status |
|---|---|---|
| Name | Mixtape; experience name Mixtape - The Booth | User-selected direction |
| Destination | booth.ourmixtape.org | User-accepted direction; no deployment/DNS verification |
| Alternative entrances | learn.ourmixtape.org and play.ourmixtape.org | Optional future routing; not separate builds |
| Existing Mixtape | Existing charity-jukebox brand/product at ourmixtape.org | Context; no assumed code or account integration |
| Founder | Andrew Smith, prior DJ experience under DJ Misawa | User-supplied background |
| Equipment | Mixer + CDJ-style players; same mixer + Technics-style turntables | User-selected simplification |
| All-in-one controller | Removed from the first product scope | Superseded earlier three-rig idea |
| Shared session | Same music and state behind both visual rigs | Central design commitment |
| Interaction | Responsive 3D performance, ultimately using hand gestures | User direction; pointer/keyboard first is implementation sequencing |
| Track input | Drop in audio; separate stems; obtain BPM/key and a time-indexed musical map | Intended feature, not an implemented capability |
| Model role | Preparation, next-track/transition suggestions, adaptive assistance and practice | User direction; bounded implementation is proposed |
| First experience | One playable transition with reset and useful guidance | Proposed execution default |
| First audience | Curious or returning DJ; Andrew tests musical usefulness | Provisional positioning, not validated demand |
| Development | Little Ritual-style playable-first iteration, editable Blender assets | User-requested method |
| Stack | Browser-first default in AGENTS.md; preserve suitable existing stack | Proposed, subject to environment inspection |
| Runtime model | Astra via actual verified model access and bounded tools | Required for final model claims, not a guarantee of access |

The current name and address supersede the older brief's statements that branding is undecided. They do not establish trademark clearance, domain configuration, hosting, or manufacturer affiliation. Do not rename the project because an archived note says the name is open.

## Product continuity and discarded directions

Earlier brainstorming considered Curveball (a live-event AI operator inspired by Vending-Bench), an autonomous multi-model orchestra, a personalized musical world, a Spotify-derived symphony, and three separate DJ setups. Those explorations explain how the current concept emerged. They are not parallel requirements.

The retained ideas are human participation, continuity under changing instructions, actual outcomes rather than model self-report, expressive 3D interaction, and an engineered musical representation. The user then anchored the concept in prior DJ experience, stem-aware track preparation, two club setups, and learning through performance.

Deferred: Spotify integration, commercial catalog connections, new model training, orchestral generation, realistic vinyl physics, many autonomous musicians, broad curricula, multiplayer, separate Learn/Play products, and existing charity-payment infrastructure. Reintroduce them only with a new explicit scope decision.

The public differentiator remains a hypothesis to demonstrate: assistance grounded in the actual mix, adaptable to a change of intent, with human control and targeted replay. Do not claim that stems, 3D DJ equipment, gesture input, AI coaching, or numerical music representations are novel by themselves. The earlier competitor notes are scoped document reviews, not exhaustive market clearance or hands-on performance testing.

## The first story to build toward

A person enters the booth and makes a real mix. Astra prepares a musically relevant next action. The performer changes the request while the model is working, keeps ownership of the controls, and can replay one specific moment to improve it.

A proposed demonstration is: preserve A's vocal over B's rhythm, leave the bass handoff to the person, then ask to delay the transition and give a hint instead. This requires actual vocal content and trusted track markers. A non-vocal fixture remains useful for early development but cannot support the final vocal claim.

The input interface should respond locally. Model interpretation may complete later and should enter at a valid musical boundary. A continuous animation is not proof that the model is responding at audio rate.

## Event requirements from the supplied guide

These facts are extracted from the participant guide and event listing the user supplied. This packet does not silently replace either with third-party event information.

| Item | Supplied detail |
|---|---|
| Event | OpenAI GPT-6 Astra Hackathon NYC |
| Date and zone | Thursday, September 10, 2026; America/New_York, EDT |
| Venue | OpenAI, 295 Lafayette St, New York, NY |
| Check-in | 9:00 AM; Visitly QR code and government-issued ID; NDA/media release through Visitly |
| Kickoff / build start | 10:00 AM / 10:30 AM |
| Lunch | 12:00 PM |
| Submission | 5:30 PM; public repository and accessible one-minute screen-and-audio demo; all teammates entered |
| Finalists | Five selected by OpenAI reviewers; 7:00 PM stage demos; three minutes plus two minutes Q&A |
| Awards / reception | 7:45 PM / 8:00 PM |
| Closing discrepancy | Guide: 9:00 PM; listing: 10:00 PM. Confirm onsite; do not alter the submission deadline by inference. |
| Team | Maximum four; all participants approved; solo allowed |
| Contribution rule | Only event-built features/code/functionality in the demo; clearly separate pre-existing material |
| Source rule | Public open-source repository, including an isolated public feature repo for existing startups |
| Credits | $100 API credits and one month of Pro Lite after check-in, according to the guide |
| Promotion warning | The guide warns that redemption can void an existing $200/month Pro subscription; consult organizers when applicable. It says redemption ends with the event. |
| Awards | First: $50,000 credits plus DevDay tickets; second: $25,000 credits; third: $15,000 credits; finalists: one year of ChatGPT Pro |

The public listing's all-new-work wording and the guide's allowance for an isolated startup feature should be preserved, not treated as blanket permission to reuse old implementation. The supplied splitter is pre-existing. Standard dependencies and original contributions need provenance. Eligibility of a practice-led product under the education-chatbot ban is unresolved; a working game is not automatically approved merely because it is called a game.

The full anti-project list and detailed schedule remain in the archived [event brief](context/GPT6_ASTRA_NYC_AGENT_BRIEF.md). Event credentials, Visitly tokens, private signed forms, and registration data are deliberately absent.

## Rubric and judge lens

The official weights supplied by the user are equal: **Astra in development 25%; Astra in product 25%; live demo 25%; technicality 25%**. Initial screening and the stage panel are distinct in the supplied materials.

The named panel in the supplied listing is Avery Klemmer (Thrive Capital), Sriram Krishnan (listed as Kearney Jackson), and Adina Tecklu (Khosla Ventures). The earlier research records the firm's own spelling as Kearny Jackson and separates the relevant Sriram Krishnan from a namesake. Do not merge biographies or infer private musical tastes.

The archived [judge research](context/JUDGES_AND_EVALUATION.md) was supplied from the prior conversation and is preserved as a dated research snapshot, not freshly reverified in this packet. Its practical questions are:

- What useful decision depends on Astra, and what evidence separates it from fixed audio controls?
- Who returns after the novelty, and what does useful assistance cost?
- Whose task becomes easier, and what did a participant actually accomplish?

Those questions are our preparation hypotheses. They are not individual judges' declared scoring rules. Keep the archived [scorecard](context/BUILD_SCORECARD.md) unfilled until a real run exists; start an implementation-specific record rather than fabricating results in the snapshot.

## Supplied artifacts and their boundaries

### U1. Astra guide

User attachment: `Pasted markdown(20260910-114721).md`, titled "Using GPT-6 Astra."

It identifies async tool calling, mid-turn steering, and reasoning configuration updates; distinguishes existing capabilities; and gives prompting/migration guidance. It calls out the Responses requirement for tools, unsupported sampling parameters, no `none` reasoning, and checking compatibility when changing reasoning effort.

Use the current official documentation to confirm exact schemas. The attachment does not establish current account access or empirical musical judgment. Example prompts inside it are quoted documentation, not a new instruction hierarchy.

### U2. Stem splitter

User attachment: `stem_splitter.py`. Relevant functions: `process_track`, `encode`, `mix_instrumental`, and `main`.

The script runs Demucs, exports stems/acapella/instrumental, supports WAV, and selects `htdemucs` or the six-stem model. It does not implement BPM/key analysis or a live deck. Readiness inferred from an existing acapella can skip incomplete work. Non-vocal mixing disables normalization; level/headroom behavior requires checking. The file was reviewed as source context, not executed or patched here.

The code is not included in this starter kit. Its presence in the conversation does not establish a public license or eligibility as new event work. A future agent can inspect the original when available and establish proper treatment. Do not invent its path in another environment.

### U3. Earlier event packet

The three files under `docs/context/` preserve the prior brief, research, and scorecard. They contain source links and research caveats. A banner identifies them as historical context and points to the current instructions. Their contents are not proof the application has been created.

## External source register

Links below were consulted on 2026-09-10 unless explicitly marked as carried-forward reference only. Documentation can change. These references support API descriptions and borrowed development patterns; our musical design and acceptance tests remain proposals.

### S0. Repository guidance convention

[OpenAI: Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Codex recognizes uppercase `AGENTS.md`; combined project instructions have a default 32 KiB limit. Keep this root file focused and ensure important guidance is actually loaded. Supporting files are read explicitly, not assumed to be auto-loaded.

### S1. Little Ritual

[OpenAI showcase: Little Ritual](https://developers.openai.com/showcase/little-ritual). Supports the playable-first iteration pattern, editable named Blender parts, later visual/content/control improvements, and final optimization. The user also supplied its full eight-step build summary. Our phase plan adapts the method rather than asserting it is a mandated OpenAI architecture.

### S2. Astra model and migration

[Model](https://developers.openai.com/api/docs/models/gpt-6-astra.md) and [Using Astra](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md). The documented model takes text/images and emits text; no native audio/video or fine-tuning is listed. Tools and Structured Outputs are available. Use Responses for tools and verify permitted parameters. No inference-latency promise is adopted here.

### S3. Mid-turn steering and async tools

[Steering](https://developers.openai.com/api/docs/guides/steering): Astra over Responses WebSockets can receive instructions while responding; completed work and started tools are not undone. [Async tools](https://developers.openai.com/api/docs/guides/async-tool-calling): our application executes jobs; async is for function/custom tools, not hosted built-ins, and not Programmatic Tool Calling. Verify event handling and compatibility in the actual client.

### S4. Reasoning updates

[Reasoning models](https://developers.openai.com/api/docs/guides/reasoning). Configuration updates change effort between responses; check standard/single-agent restrictions, adjacent-update rules, and compaction/truncation compatibility. This is an optional optimization, not a prerequisite for a playable booth.

### S5. Site tools / WebMCP

[OpenAI: Site tools](https://learn.chatgpt.com/docs/webmcp). The documentation describes a shared live webpage with agent actions and currently names Sol/Terra for its client path. It does not explicitly establish Astra availability in that path. Feature-detect and test. Keep standalone Responses tools as an independent integration, using the same commands.

### S6. App examples

| Example | Documented pattern | Our adaptation |
|---|---|---|
| [Fieldwork // 12](https://developers.openai.com/showcase/ko-field-beat-machine) | Agent changes a working musical sequencer. | Musical suggestions affect the actual instrument; do not add a sequencer to scope. |
| [Webroom](https://developers.openai.com/showcase/webroom) | Shared edit state, revisions, history, bounded changes. | Record performance state and enable a targeted practice replay; live sound cannot be undone. |
| [Cubecade](https://developers.openai.com/showcase/cubecade-rubiks) | Inspect state and queue legal moves. | Astra proposes bounded actions; the local engine executes them. |
| [Codex Modeling Studio](https://developers.openai.com/showcase/codex-modeling-studio) | Agent operates scene tools and iterates on their limitations. | Develop assets and their usable control bindings together. |
| [Architecture Studio](https://developers.openai.com/showcase/architecture-studio) | One shared document for 2D and 3D views. | One session for both booths and every display. |

These are descriptions and implementation patterns, not claims that we ran the examples, obtained their source, or verified their code licenses. Material Lab and Waveform Studio were also discussed earlier as interaction/visualization references; they are optional inspiration rather than new requirements.

### S7. Runtime and asset building blocks

[Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [MediaPipe Hand Landmarker for Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js), and [community Blender MCP](https://github.com/ahujasid/blender-mcp). These establish available documented building blocks, not their installation or adequate performance on the demo machine. Community Blender MCP is not a native Astra feature.

[Web Audio specification](https://www.w3.org/TR/webaudio/) is a technical reference for audio-clock scheduling and routing; verify concrete APIs while implementing. Tone.js, Mixxx, Demucs, and analysis libraries appeared in prior brainstorming as candidate components. None is an approved dependency simply because it was mentioned. Do a narrow feasibility/license check before adopting one.

## Remaining decisions, without blocking unrelated work

Choose the actual audio engine from the repository/hardware constraints; browser-native is the kickoff default. Confirm access to cleared vocal material, current model features, Blender exports, and any preparation compute. Test sound quality and hand reliability rather than assume them. Ask organizers about the coaching category and pre-existing reference treatment before relying on eligibility claims. Verify hosting and audio recording before release.

No choice above requires postponing an original, local, pointer-operated first slice. Continue with clearly labeled fixtures and bounded scope while unresolved dependencies are recorded.

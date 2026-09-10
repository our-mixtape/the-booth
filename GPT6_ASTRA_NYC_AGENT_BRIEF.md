# GPT-6 Astra Hackathon NYC: Agent Brief

**Prepared:** September 10, 2026  
**Event timezone:** America/New_York (EDT)  
**Status:** Source-backed event brief and proposed product direction; not a completed implementation or frozen specification.  
**Project name:** Undecided. "DJ booth" is descriptive, not an approved product name.  
**Companions:** [Judges and evaluation](JUDGES_AND_EVALUATION.md) | [Build scorecard](BUILD_SCORECARD.md)

## 1. Read this first

We are exploring a playable, stem-aware 3D DJ experience for the GPT-6 Astra Hackathon NYC. Andrew Smith's prior DJ experience is the founder context. The latest user-selected direction is two familiar booths: a mixer with CDJ-style players and the same mixer with Technics-style turntables. A game or practice companion is under consideration alongside performance; it is not yet a final product-positioning decision.

The intended experience is to import a cleared track, prepare synchronized stems and a musical timeline, then perform using hand gestures or conventional controls. Astra would coordinate preparation, propose and revise musical actions, and potentially coach from the actual attempt. Precise playback and immediate controls belong to the application.

**The proposed proof:** the user performs a transition, changes their intent while Astra is preparing assistance, retains control of the mix, and can retry a specific moment with useful feedback. A booth switch is supporting evidence of shared state, not the whole product.

This brief creates context only. No application build, repository creation, deployment, organizer outreach, acceptance of terms, or public posting is authorized merely by the existence of this document. Follow the actual work assignment and repository instructions.

### Status vocabulary

| Label | Meaning |
|---|---|
| **EVENT SOURCE** | Supplied participant guide or public event listing. Keep their differences visible. |
| **USER DIRECTION** | Explicit preference or background supplied in this conversation. |
| **VERIFIED DOCS** | A capability or external fact checked in a named source on the preparation date. |
| **PROPOSED** | Our design or prioritization recommendation; not yet approved or implemented. |
| **OPEN** | Requires a decision, measurement, permission, or organizer clarification. |

Do not promote a proposal to an implementation claim. No current application repository, tests, user metrics, performance measurements, or deployed demo was inspected while preparing this packet.

## 2. Event reference

This section follows the supplied participant guide's organization. Its details come from that guide unless separately identified. The public listing is an additional source, not a replacement for the guide.[^U1][^E1]

### 2.1 Goal

Ship something novel, useful in the real world, and demonstrative of GPT-6 Astra's capabilities. The guide allows a new project or a feature for an existing startup. The work shown must be the work created during this hackathon.[^U1]

The listing's description of Astra as the "world's most intelligent and aligned model" is organizer marketing language, not a performance claim our project should assert as independently established.[^U1]

### 2.2 Getting ready and date reconciliation

| Item | Source-backed detail |
|---|---|
| Event | GPT-6 Astra Hackathon NYC; OpenAI and Cerebral Valley |
| Date | **Thursday, September 10, 2026**, according to the supplied listing and checked public page |
| Venue | OpenAI, 295 Lafayette St, New York, NY |
| Format | Fully in person; all attendees apply and must be approved |
| Entry | Visitly pre-registration, NDA and media release, unique QR code, government-issued photo ID |
| Public listing window | 9:00 AM-10:00 PM EDT |
| Participant guide closing time | 9:00 PM; this conflicts with the listing's end time |

**OPEN:** confirm the closing time with organizers. Neither closing time changes the guide's 5:30 PM submission deadline. Earlier conversational references to "tomorrow" must not be used to move the event to September 11. Use the absolute date until an organizer supplies a correction.[^U1][^E1]

Wi-Fi access details were supplied privately and are intentionally omitted from these repo-facing notes. Retrieve them from the participant guide or onsite staff. Do not commit credentials, Visitly QR codes, signed forms, API keys, private emails, or attendee records.

### 2.3 Community

The guide directs participants to Discord: `#intros` for introductions, `#team-search` for teammates, `#announcements` for updates, `#general` for discussion, `#questions` with `@CV` for organizer support, and `#openai` for technical help. Maximum team size is four; solo participation is allowed. No Discord invitation URL was supplied in this brief.[^U1]

### 2.4 Schedule

All times below are EDT on the event date, reproduced from the participant guide.[^U1]

| Time | Activity |
|---|---|
| 9:00 AM | Doors open and check-in |
| 10:00 AM | Welcome kickoff |
| 10:30 AM | Hacking starts |
| 12:00 PM | Lunch |
| **5:30 PM** | **Submissions due and dinner** |
| 7:00 PM | Finalist demos |
| 7:45 PM | Judging and awards |
| 8:00 PM | Reception |
| 9:00 PM | Doors close according to the guide; listing differs |

The interval from hacking start to submission is seven hours. Do not treat the 7:00 PM stage time as additional submission-development time without explicit organizer permission.

### 2.5 Rules and interpretation boundaries

**Source requirements:** public open-source repository; maximum four team members; demo only the specific features, code, and functionality created during the event; make original contributions unmistakable. The guide says unclear contribution attribution can result in immediate disqualification. Unauthorized code/data/assets and legal, ethical, or platform-policy violations are disqualifying.[^U1]

The public listing says all work must be built during the hackathon and existing product code does not qualify. The guide allows an existing-startup feature in an isolated public repository. These statements support a new, clearly separated contribution; they do not establish blanket permission to reuse private product code.[^U1][^E1]

**PROPOSED interpretation until clarified:** use a fresh isolated project, document dependencies and prior material, and claim only newly created functionality. Do not disguise old code by moving it to a new repository. Record organizer clarification before relying on the supplied splitter or other pre-existing product code as part of the deliverable.

The guide's anti-project list is: AI Mental Health Advisor; Basic RAG Applications; Basic Streamlit Applications; Image Analyzers; "AI for Education" Chatbot; AI Job Application Screener; AI Nutrition Coach; Personality Analyzers; any project using AI to generate and give medical advice; any project where a dashboard is the main feature; Sports analyzers or coaches.[^U1]

**OPEN eligibility question:** does a playable DJ practice simulation with embedded coaching fall outside the banned education-chatbot category? Ask the organizers; no approval has been established. The instrument and its audible operation must be real. Relabeling a chatbot as a game is not a solution.

### 2.6 Provided resources and redemption

The guide offers one month of ChatGPT Pro Lite and $100 in OpenAI API credits. Links go to the registration email after check-in. It says redemption is only available during the hackathon.[^U1]

**Preserve this warning:** the guide says redeeming the promotion while holding a $200/month ChatGPT Pro subscription will void the current subscription; it recommends using that subscription instead and asking for Codex credits if needed. This is the guide's warning, not a determination of Andrew's current plan. Confirm with CV before redeeming when relevant.[^U1]

Resources: [Codex](https://chatgpt.com/codex/), [latest-model guidance](https://developers.openai.com/api/docs/guides/latest-model), [migration quickstart](https://developers.openai.com/api/docs/guides/latest-model#gpt-6-astra-migration-quickstart). Verify actual model access, SDK support, available compute, and credits early. API credits do not establish access to a GPU for local stem separation.

### 2.7 Submission

Submit at [the NYC submission page](https://cerebralvalley.ai/e/openai-gpt-6-astra-nyc/hackathon/submit) by **5:30 PM EDT**. The guide requires a one-minute demo video with screen and audio, an accessible public video link, a public repository, and all team members added. Only event-built functionality should be highlighted.[^U1]

Check links in a signed-out browser. Verify the recording contains system audio as well as understandable narration. The submission page itself was not accessed or submitted as part of this work.

### 2.8 Judging

The guide says OpenAI judges first review submissions and select five finalists. Finalists receive three minutes for a live demo and two minutes for questions. The public listing names Avery Klemmer, Sriram Krishnan, and Adina Tecklu as stage-panel participants; it does not establish that those same people perform initial screening.[^U1][^E1]

| Official category | Weight | Guide's emphasis |
|---|---:|---|
| GPT-6 Astra in Development | 25% | How the model was used to build; efficient use of new capabilities; collaboration during development |
| GPT-6 Astra in Project | 25% | Runtime use; advanced capability; novel model integration |
| Live Demo | 25% | Novelty, presentation, watchability, actual working demonstration |
| Technicality | 25% | Implementation quality, technical use, sound engineering |

Judge-background hypotheses do not change these weights. Use [the companion research](JUDGES_AND_EVALUATION.md) to prepare questions, not invent secret criteria.

### 2.9 Prizes

First: $50,000 credits plus DevDay 2026 tickets. Second: $25,000 credits. Third: $15,000 credits. All finalists: one year of ChatGPT Pro. These are the guide's stated awards; do not describe credit prizes as cash.[^U1]

## 3. Product context and decisions

### 3.1 Latest user direction

| Topic | Current status |
|---|---|
| Founder context | **USER DIRECTION:** Andrew has prior DJ experience; this should guide musical judgments and the performance demo. |
| Equipment | **USER DIRECTION:** simplify to two booths, mixer + CDJ-style players and mixer + Technics-style turntables. |
| Interaction | **USER DIRECTION:** 3D, interactive, responsive, hand-performed experience; Blender with Astra is of interest. |
| Track preparation | **USER DIRECTION:** drop in a track, split stems, analyze BPM/key and relevant musical structure, connect analysis to playback. |
| Astra's role | **USER DIRECTION:** consider current-track analysis, next-track recommendations, performance assistance, and understanding beat/position/key information. |
| Product mode | **OPEN:** game/practice companion versus performance-first presentation; use one instrument underneath. |
| Primary user | **OPEN:** novice learning a first transition, returning DJ practicing, or experienced performer preparing/remixing. |
| Technology stack | **OPEN:** browser-native engine versus integration with an existing DJ engine; no choice is approved here. |
| Project/company name | **OPEN:** do not silently reuse Curveball, Mixtape, or "ASTA" as an approved brand. Model identifier is `gpt-6-astra`. |

Earlier directions included event operations, an autonomous orchestra, a personalized musical world, and three DJ rigs. They explain the exploration but are not parallel deliverables. Spotify login, training a new music model, realistic scratch physics, and a large model-musician ensemble are not prerequisites for this proposed build.

### 3.2 Proposed product statement

> A playable DJ booth that turns a track into controllable stems and a musical timeline, lets you mix with your hands, and uses Astra to prepare, adapt, and explain the next move.

For a practice-led version, the core loop is **perform -> inspect one meaningful moment -> receive a focused intervention -> retry**. For a performance-led version, it is **prepare -> propose -> approve -> perform -> revise**. Choose one to lead the video; do not promise a full curriculum and professional DJ suite in one day.

## 4. Proposed system boundaries

This is a conceptual contract, not an implemented API specification.

### 4.1 Track preparation

A background preparation job produces synchronized lossless working stems, beat information, key estimates, confidence/provenance, optional checked cue/phrase/vocal annotations, and a manifest identifying complete outputs. Four stems are an initial scope recommendation, not a claim about a chosen production model.

The supplied `stem_splitter.py` runs Demucs, exports stems/acapella/instrumental, defaults to `htdemucs`, supports a six-stem option, and can export WAV. It does not implement BPM/key analysis, a beat grid, a player, or an agent.[^U3]

Before adapting that design, note two concrete issues in the supplied code: readiness is inferred from an existing acapella even though other outputs may still be missing; non-vocal summation uses `amix` with normalization disabled. A future implementation should verify output completeness, alignment, and headroom rather than assume those properties. No defect has been patched in this packet.[^U3]

A track can be playable before its full analysis is ready. Show readiness by capability: original playback, rhythm map, checked structure, stems. Do not invent unavailable analysis or silently substitute cached stems for live processing.

### 4.2 Musical map and live state

| Data | Proposed representation |
|---|---|
| Source identity | Track/content ID, duration, source timing reference, preparation version |
| Rhythm | Beat positions, downbeat/phrase annotations, tempo estimate or map, confidence |
| Harmony | Estimated key, any local annotations, effective pitch/tempo treatment |
| Structure | Cue points, vocal-active regions, usable loops, annotation provenance |
| Stem state | Common sample rate/time origin, loaded buffers, gains, routing, readiness |
| Performance | Source playheads, master musical position, rate changes, loops, deck assignment |
| Authority | Human-owned controls, assistance mode, approved actions, cancellation state |

Distinguish source position from performance position after looping or seeking. Quantization means applying a specified action on a defined grid; it does not automatically mean rewriting the recording. BPM equality is not beat-phase alignment, and neither guarantees phrase alignment. A compatible key estimate is not proof of a good transition. Treat these as separate design concepts and test them separately.

Analysis is evidence with uncertainty. Do not invent a vocal endpoint from a title, or call a guessed downbeat verified. Human corrections must retain provenance.

### 4.3 Playback and 3D control

One transport/mixer state powers both booths. Switching the booth must preserve tracks, positions, loop state, audible mix, and valid pending plans. Appearance and assistance level are separate choices.

Hand tracking, selection, fader changes, audio scheduling, and emergency overrides run locally. Use deliberate grab/release behavior, keep values stable after lost tracking, and provide mouse/keyboard recovery. Do not route every frame, beat, or gesture through a model.

Use Blender with Astra for asset creation and inspection during development; use the selected runtime for rendering and interactions during performance. The community Blender MCP integration is a third-party tool bridge, not a claim of native Astra support for Blender.[^B1]

Brand-inspired shapes are not claims of licensed hardware emulation or endorsement. Create original assets or retain applicable third-party permissions. A rotating record is not evidence of implemented scratching.

### 4.4 Astra's bounded control

Astra consumes structured musical context and current performance state. It can propose a next track, stem treatment, transition, hint, replay, or exercise. The application validates the proposal before scheduling audible changes.

Suggested lifecycle: **proposed -> validated -> approved/armed -> scheduled -> executed**, with explicit cancelled, expired, and failed states. Plans identify tracks, relevant state versions, control ownership, target musical boundaries, and prerequisites. Replacing a track or changing a relevant cue invalidates affected future actions; ordinary playhead progression should not invalidate a correctly relative plan.

A human grabbing a control takes immediate ownership. A late model response cannot reclaim it. Track actual applied actions separately from suggested actions. An application-blocked mistake is a prevented mistake, not proof of flawless model judgment.

## 5. Astra-specific opportunities

The supplied model guide distinguishes async tools, mid-turn steering, and reasoning configuration updates from existing capabilities such as computer use and Structured Outputs.[^U2]

| Capability | Verified boundary | Proposed demonstration |
|---|---|---|
| Mid-turn steering | Available for Astra over Responses WebSockets; new direction does not undo earlier actions or cancel already-started tools.[^A1] | Revise an in-progress transition request: preserve the vocal, delay entry, and switch from automation to a hint. |
| Async tools | Application-run function/custom tools can remain pending while the model continues; the application still executes and tracks jobs. Do not combine async tools with Programmatic Tool Calling.[^A2] | Start separation/analysis and continue independent work; act on each result only once prerequisites are satisfied. |
| Reasoning configuration | `configuration_update` changes effort between responses while retaining the prompt prefix; standard single-agent mode, with compatibility restrictions.[^A3] | Use bounded live help, then spend more effort reviewing an attempt, if measured behavior supports it. |
| Structured outputs and tools | Supported, but not newly invented for this release.[^U2][^A4] | Produce validated musical-action proposals and observable results. |
| Model-assisted development | Guide highlights multistep work across code and software; actual outcomes must be demonstrated.[^U2] | Generate and inspect assets, wire controls, diagnose a real bug, and verify the correction. |

Current model documentation lists text/image input, no native audio/video input, and no fine-tuning support. Use analysis tools and meaningful state, not claims of raw-audio hearing or a newly trained Astra music model.[^A4]

Use Responses for tool calling; verify `gpt-6-astra` access, remove unsupported sampling parameters, and do not rely on a zero-reasoning setting. The supplied guide flags these migration requirements.[^U2] Recheck the current docs before coding exact request schemas. Documentation availability does not prove that a specific event account or SDK supports a feature successfully.

**Proposed technical priority:** steering first; async preparation second; reasoning-effort changes only after the core works. Do not add complexity just to mention another API feature. If steering is unavailable in the actual account, label an ordinary between-turn update honestly.

## 6. Proposed hackathon scope and evidence

### Minimum convincing loop

Two cleared tracks, a working shared mixer, reliable control input, checked timing information, real audible stem controls, and one useful Astra-assisted transition or practice intervention. Implement one booth end to end before finishing the second. If preparation is precomputed for the demo, disclose that and separately demonstrate any newly built preparation job.

A recommended demonstration request is: **"Keep A's vocal over B's rhythm section and leave the bass handoff to me."** While Astra prepares, change it to **"Keep A longer; give me a hint instead of doing the handoff."** The application should preserve human control and keep playback running. This is a test scenario, not an existing feature.

### Acceptance checks to implement

| Check | Evidence required |
|---|---|
| Audible performance | Screen/system-audio capture shows controls changing actual output. |
| Shared booths | Playback state remains continuous across a layout switch. |
| Stem alignment | Loaded stems follow the same timing and rate transformation. |
| Unfinished preparation | Unavailable stems cannot be used by a plan; errors are visible. |
| Changed intent | Earlier constraints survive the correction, unless explicitly superseded. |
| Human takeover | Manual ownership blocks stale automation on that control. |
| Stale results | Track replacement rejects obsolete analysis/plans; no duplicate consequences on retries. |
| Coaching | Feedback cites observed events and uncertainty; assisted attempts are labeled. |
| Resilience | Lost hand tracking or model connection does not unexpectedly change the mix. |
| Build provenance | New code/assets/model contributions are distinguishable from prior work and dependencies. |

Measure control responsiveness, audio dropouts, model-plan latency, analysis duration, and cost per successful assisted transition or practice attempt. No numerical target or observed value has been established. Do not claim learning gains from one rehearsal or fabricate a pass rate.

### Scope cuts

Cut catalog login, scratch physics, arbitrary long-track ingestion, extra booths, many runtime agents, generative composition, and a large curriculum before cutting reliable audio or useful model behavior. Preserve the two-booth direction where feasible; if only one works, disclose the second as unfinished rather than presenting a nonfunctional view as playable.

## 7. Public repository and artifact hygiene

Maintain an honest contribution record: component, prior/dependency/new status, origin or license, event-time work, evidence, and limitations. The supplied splitter is **pre-existing reference material**, not automatically eligible hackathon work. Its availability in this conversation does not establish a public open-source license.[^U3]

Keep credentials and private media out of code, logs, videos, and documentation. Use cleared demonstration tracks with documented permissions appropriate to public playback, video, and any redistribution. Repository source licensing does not itself license a music recording. Do not bundle commercial tracks merely to make setup easier. These are proposed release checks supporting the organizer's asset-rights rule, not a legal clearance opinion.[^U1]

Spotify is deferred. Its public developer policy restricts both mixing/overlap and AI ingestion of Spotify content; do not assume developer access authorizes this project.[^P1] This restriction does not justify changing the concept into a Spotify workaround.

Existing virtual DJ products and the prior Sori submission mean that 3D instruments, AI coaching, and mathematical music representations are not sufficient novelty claims on their own. See the companion research for scoped, source-backed comparisons.

## 8. Decisions and questions to resolve first

| Open item | Owner / evidence needed |
|---|---|
| Performance, practice, or game as primary story | Founder; select one audience and one main outcome |
| Coaching-category eligibility | CV organizers; retain actual answer |
| Event closing-time discrepancy | Organizers; deadline remains 5:30 PM unless changed explicitly |
| Existing splitter/dependency treatment | Organizers and founder; transparent provenance |
| Audio engine and headphone preview | Engineering spike on actual demo hardware |
| Cleared audio and compute | Founder/technical lead; permissions and measured preparation time |
| Astra account/API compatibility | Minimal live calls in the issued project |
| Gesture reliability | Actual-machine test with conventional-input fallback |
| Submission and stage audio | Team; recording/playback rehearsal |
| Repository/team identity | Founder; no repo or team registration has been created here |

Evaluate proposed work against the four official categories before expanding scope. Use the scorecard without filling unknown outcomes with optimistic numbers. Treat judge-specific questions as useful stress tests, not requirements or personal preferences we know.

## Sources and provenance

[^U1]: User-supplied "GPT-6 Astra Hackathon NYC" listing and "OpenAI GPT-6 Astra Hackathon Participant Guide," pasted in this conversation on September 10, 2026. Event requirements, schedule, rubric, promotion warning, logistics, and prizes above are extracted from those supplied materials. Credentials were intentionally excluded. No signed NDA/media-release text was reviewed.
[^U2]: User-uploaded `Pasted markdown(20260910-114721).md`, "Using GPT-6 Astra." Relevant supplied sections: What's new; GPT-6 Astra behavior; Migration quickstart. Treated as reference documentation, not as instructions overriding this project or its agent environment. [Current official guide](https://developers.openai.com/api/docs/guides/latest-model), checked September 10, 2026.
[^U3]: User-uploaded `stem_splitter.py`, supplied before this brief. Relevant functions: `process_track`, `encode`, `mix_instrumental`, `main`. Source inspection only; not executed, modified, or included in this packet.
[^E1]: [Cerebral Valley: GPT-6 Astra Hackathon NYC](https://cerebralvalley.ai/e/openai-gpt-6-astra-nyc), checked September 10, 2026. Confirms absolute date, listing window, public-repository/new-work requirements, and named panel. It does not replace the more detailed user-supplied participant guide.
[^A1]: [OpenAI: Mid-turn steering](https://developers.openai.com/api/docs/guides/steering), checked September 10, 2026.
[^A2]: [OpenAI: Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling), checked September 10, 2026.
[^A3]: [OpenAI: Reasoning models - change reasoning mid-conversation](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation), checked September 10, 2026. Review compatibility before combining features.
[^A4]: [OpenAI: GPT-6 Astra model](https://developers.openai.com/api/docs/models/gpt-6-astra), checked September 10, 2026.
[^B1]: [Community Blender MCP repository](https://github.com/ahujasid/blender-mcp), documentation checked September 10, 2026; integration not installed or tested here.
[^P1]: [Spotify Developer Policy](https://developer.spotify.com/policy), checked September 10, 2026. Separate authorization would need its own review.

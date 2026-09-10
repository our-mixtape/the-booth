# Build and Demo Scorecard

**Status:** Unfilled evaluation template; not a report of successful tests.  
**Basis:** [Agent brief](GPT6_ASTRA_NYC_AGENT_BRIEF.md) and [judges/rubric research](JUDGES_AND_EVALUATION.md).  
**Purpose:** Evaluate real work against the official four equal-weight categories without treating judge-profile hypotheses as hidden scoring rules.

## Run identification

| Field | Value |
|---|---|
| Date/time and timezone | Not recorded |
| Evaluator / performer | Not recorded |
| Commit / branch | Not recorded |
| Model ID / effort / API mode | Not recorded |
| Hardware / browser / input method | Not recorded |
| Tracks / preparation versions / permissions | Not recorded |
| Prepared annotations and prerecorded material | Not recorded |
| Assisted versus manual actions | Not recorded |
| Screen and system-audio recording | Not recorded |

## Eligibility gates

Mark each **Pass / Fail / Unverified** and attach evidence. These gates cannot be averaged away by a good demo score.

| Gate | Status | Evidence / next action |
|---|---|---|
| Team approved; no more than four members | Unverified | Obtain team confirmation |
| Public repository and applicable code license | Unverified | Signed-out access and license check |
| Event-built contribution clearly separated from prior code/assets | Unverified | Component provenance and commit record |
| Rights for code, models, music, and public video | Unverified | License/permission record |
| No secrets, attendee data, or private credentials in public materials | Unverified | Repository/log/video review |
| Practice/coaching eligibility clarified if that is the headline | Unverified | Actual organizer response |
| Working experience rather than prohibited dashboard/chatbot | Unverified | End-to-end use recording |
| One-minute video with accessible link, screen, and audible output | Unverified | Signed-out playback check |
| Team members entered and submission acknowledged by deadline | Unverified | Submission confirmation |

## Official categories; internal 0-5 evidence scale

0 = absent; 1 = assertion/mock; 2 = partial; 3 = working main path; 4 = repeatable with evidence; 5 = strong evidence across a meaningful variation or failure case. This scale is our rehearsal method, not a published organizer scale.

| Category | Weight | Score | Evidence | Next highest-value improvement |
|---|---:|---|---|---|
| Astra in Development | 25% | Not evaluated | Not recorded | Identify a concrete model-to-artifact-to-verification chain |
| Astra in Project | 25% | Not evaluated | Not recorded | Demonstrate changed intent producing a valid revised plan |
| Live Demo | 25% | Not evaluated | Not recorded | Demonstrate immediately audible, understandable interaction |
| Technicality | 25% | Not evaluated | Not recorded | Verify continuity, ownership, and stale-action handling |

**Internal total:** Not calculated. Once all four scores exist, total = 5 x their sum, out of 100. Do not treat an untested feature as a passing score.

## Behavioral checks

| Test | Expected observation | Result |
|---|---|---|
| Switch CDJ-style and turntable-style booths | Same loaded tracks, uninterrupted transport, accurate controls | Not run |
| Change instruction during model work | Relevant prior constraints preserved; new future plan | Not run |
| Human grabs an automated control | Immediate human ownership; stale automation cannot retake it | Not run |
| Replace a track while analysis/plan is pending | Obsolete result cannot affect the replacement | Not run |
| Stems pending or failed | Capability remains unavailable; no invented readiness | Not run |
| Loop/seek/rate change | Stem synchronization and position mapping remain correct | Not run |
| Drop hand tracking / disconnect model | Mix remains stable; fallback controls remain usable | Not run |
| Repeat the same request/result delivery | No duplicated audible action | Not run |
| Retry a targeted practice moment | Restored state is correct; assistance and outcome are recorded | Not run |

## Measurements, not estimates disguised as results

Record control latency separately from model latency. Record audio dropouts, plan validity, preparation time, and per-attempt model/tool cost. Record number of attempts, hidden/manual interventions, and failure cases. Small-sample observations are not established learning gains or retention.

## Contribution evidence

For each component record: prior/dependency/new; origin/license; event-time change; model used; commit/artifact; verification; remaining limitation. Never classify the supplied splitter or prepared third-party assets as new work simply because they were copied into the repository.

## Three rehearsal questions

**Technical capability:** What useful decision changed because of Astra rather than a fixed control mapping?

**Repeat use:** Who would return, for what task, and what actual evidence supports that hypothesis?

**User value:** What did the participant accomplish, and what remains only a future product claim?

## Decision after this run

Status: **Continue / simplify / record submission / block release** (not selected).

Record the single highest-value next action, owner, and time limit. Prefer a verified complete loop to another unintegrated feature.

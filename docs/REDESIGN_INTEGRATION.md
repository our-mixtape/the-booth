# Redesign integration — 2026-09-10

The four supplied concepts have a clean integration path through the existing React app, persistent Web Audio engine, shared command layer and prepared-track manifests. They should become two presentations of one session. Their `.dc.html` runtime, screenshot decks, simulated analysis, and scripted assistant replies should remain reference material.

## Design decisions in this local checkpoint

- **Afterhours is the main landing page and default site design**, as Andrew clarified. It has **KIDS**; the Kids screen has **Afterhours**. Afterhours also links back to Kids. These are presentation choices, not age verification, accounts, or separate engines.
- Kids has its own cream, purple, yellow and blue presentation and a distinct journey: DJ name → choose two songs → mixing playground. Large play/pause buttons, Volume, Muffled ↔ Clear and a prominent blend slider replace the detailed control surface. Musical parts and personal files are progressively disclosed.
- Andrew selected **Booth v4 – Astra** as the latest Afterhours visual direction: dark home, a diffuse indigo glow, oversized light Archivo titles, lavender accents and cool light preparation surfaces. This supersedes the warm serif treatment and the proposed constellation spiral. Signal remains an unused reference. Afterhours retains equipment selection, waveforms, EQ, tempo, prepared music, playlist and the timed handoff exercise. The deployed styling uses `src/afterhours-theme.css`; shared `src/booth-palette.ts` colors coordinate the waveform canvas, deck labels, CDJ rings/displays and graphite equipment finish. Functional flows use the existing React components.
- DJ identity is shared, with separate naming choices. Afterhours defaults to **Enter my name** (plain name or existing DJ alias), or offers **Create a name** from **high school mascot + favorite type of pasta**. Generated names can be remixed, edited or accepted. Kids retains nickname → favorite/inspiration → reveal. Both support skip and preserve an already accepted name. Only the accepted alias persists in sessionStorage for this browser tab; input drafts are cleared when leaving the naming flow. Naming makes no model request and is separate from Clerk authentication.
- Naming leads directly into the selected experience: the two-song picker for Kids, or the music preparation session for Afterhours. Returning to either mode retains the current crate, playlist, alias and live mix. Browser Back works through hash routes. Old `#play` links still work.
- Afterhours has the requested six distinct stages: **Upload music → Analyze music → Create stems → Recommend → Playlist → Play**. Kids does not expose this preparation navigation. The original advanced concepts combined analysis and stems in five stages; this implementation separates them.
- Preparation is optional. “Jump into free play” and “Keep current decks & play” reach the live instrument immediately. Stem unavailability never blocks original playback.

## What is actually connected

| Stage | Current behavior | Remaining integration |
|---|---|---|
| Upload music | Multi-file browser import; real decoding, SHA-256 identity, duration/sample rate/channel metadata; original demos and existing prepared local library can join the crate | Persistent file/session storage; server ingestion only if explicitly designed and authorized |
| Analyze music | Shows actual technical metadata, fixture-known tempo, or imported Rekordbox metadata; unknown BPM/key remain unknown | Real tempo/beat/key estimation and human corrections |
| Create stems | Shows original-only versus available components; local prepared stems are revalidated by the engine when loaded | Browser upload-to-worker job API, progress, cancellation, validated completion and prepared-version refresh |
| Recommend | Distinct known-tempo tracks within 4% can produce an explicitly labeled local-rule suggestion; no harmonic compatibility claim | Crate-wide, grounded Astra proposals using validated manifests and user intent |
| Playlist | Add, reorder and remove queued tracks; load the first pair into A/B, paused; the rest stay queued locally | Loading later tracks directly into a chosen idle deck, persistence, cue planning |
| Play | Existing real 3D booth, audio transport/mixer/stems, waveforms, practice and authenticated Astra hints | Further musical/usability feedback; additional short listening activities |

The crate is limited to 12 tracks, 25 MB and 10 minutes per file, and 100 MB combined input files. File objects and metadata remain in memory; reloading clears crate/playlist. Decoded inspection buffers are not retained by the crate. Loading a local track into a deck uses the existing engine import path and decodes again. Browser navigation does not reload the app or replace its audio context.

## Integration boundaries

`src/experience/` owns presentation routes, the name flow, crate and playlist. `src/App.tsx` supplies the existing engine/library and loads an explicitly selected pair through existing engine methods. No second mixer or model-only state was added. The instrument remains mounted while preparation is shown; hidden scene and waveform renderers skip drawing. Keyboard performance commands are inactive on naming/preparation screens. User actions that load a pair can replace A/B, as stated beside the button; viewing or changing mode cannot.

The supplied concept promise “Astra listens” was not copied: current Astra hints inspect structured deck state. DJ aliases, imported filenames and raw music are not added to model payloads. Existing login, gateway authentication, camera opt-in and voice boundaries remain intact.

## Kids discoveries

The optional built-in activity introduces three experiential concepts: a deck starts a song; a filter softens bright sounds like a blanket; the mix slider makes room for two songs. Progress requires a fresh manual command and measured output from the relevant channel. Silent changes, old history and agent-origin commands do not earn progress. Tracks/preparation identity changes restart the activity; returning from Afterhours keeps completed observations only for the same pair and discards actions from off-screen time. “Try the discoveries again” restarts observation targets without moving the user's audio playhead.

Kids uses a two-player or two-record presentation of the same engine. Extra Afterhours C/D channels are never silently stopped: when playing, Kids shows a pause control for them. Full EQ, tempo, analysis, waveforms and timed practice stay in Afterhours. Shared Astra has simpler Kids prompt starters; its authentication and explicit voice opt-in stay intact. Built-in coaching is labeled and does not claim to be Astra or to score musical taste.

## Next implementation slice

Connect a bounded preparation job around the existing local worker: select an eligible file, preserve original playback, publish capability-specific job state, validate aligned outputs, then explicitly load the prepared version. Add BPM/key estimation as separate capabilities. That supplies the evidence needed for useful Astra crate recommendations. The same endpoint contracts need a separately selected hosting/worker strategy before this can run on a hosted deployment; the existing private local library is deliberately unavailable there.

The Booth v4 visual update and coordinated waveform/equipment palette were deployed on September 10, 2026 to `https://mixtape-the-booth.vercel.app` as `dpl_GjrAUo8YEqjibkr4JkcxWtKmAULi`, with existing Vercel protection retained. The app authentication boundary is deployed and Clerk configuration is recognized; real sign-in and authenticated Astra were not reverified in this visual release. No DNS or charity-jukebox changes. Source remains on `codex/phase-1-playable` in `/Users/misawa/booth-mixtape`; run `pnpm dev` and open `http://127.0.0.1:5173/#kids` or `#advanced`. Release checks are recorded in `docs/evidence/production-astra-palette/verification.json`.

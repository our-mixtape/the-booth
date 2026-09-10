# Real signed-in Astra rehearsal — September 10, 2026

Verified at approximately **16:28 EDT** in the in-app browser at `http://127.0.0.1:5176/#advanced/play`, using integration commit `5e1754061fa777dfb59a94521344a768e87f61da`. The user completed Clerk sign-in. Browser automation then operated the ordinary visible controls; identity, API traffic and engine results were not mocked. Only the original generated fixtures were loaded.

## Observed sequence

| Time from brief | Visible lifecycle |
|---|---|
| 0.0 s | Thinking |
| 1.2 s | Steer queued: “Delay B one bar” |
| 2.8 s | Steered |
| 2.9 s | Revising: automatic successor |
| 7.3 s | Waiting for attempt; revised plan complete |
| 53.5 s | Reviewing: actual attempt result supplied |
| 56.6 s | Done; review response took 3.0 s |

The revised plan proposed B at 10 seconds and warned that this falls outside the exercise's fixed 8 ± 0.25-second target. Browser operation entered B later still, then moved the crossfader fully to B. The engine displayed: **handoff at 14.99 s; B started 6.90 s late; retry**. The live review cited **6.9013 s** and **0.25 s**, identified the retry, and said it could not verify handoff completion, beat alignment or musical quality. The engine's rounded handoff time is visible locally; it is not included in the tool output because there is no structured exact `handoffAt` field.

The elapsed interval includes browser-operation time; it is not a model-latency benchmark. Both decks continued playing after the review and were then paused through Stop all decks. The pre-existing HTTP hint subsequently returned a genuine `gpt-6-astra` observation of the 6.90-second late entry and advised retrying B at 8 seconds.

## Evidence

- [Lifecycle screenshot](real-session-lifecycle.png)
- [Revised plan and actual review screenshot](real-session-review.png)
- [Visible DOM observation](real-session-dom.json), captured at 20:28:47 UTC
- [Existing HTTP hint observation](real-http-hint.json), captured at 20:30:17 UTC
- [Separate real-API transport check](check-1789071731.md), with synthetic attempt results and explicit distinct-response/call-identity checks

The UI abbreviates IDs by their shared prefix, so these screenshots do not by themselves establish distinct full response IDs. The separate transport log does. Screenshots contain generated fixture names and model output; no email address, bearer token or secret is included. This verifies the integrated authenticated flow and a correctly evaluated failed attempt, not a successful timed entry, Andrew's musical audition, physical output, system-audio recording or event eligibility.

The first local request failed before creating an Astra response while the preview process lacked outbound network access. Restarting the same code with permitted network access resolved it. No authentication bypass or application fix was needed.

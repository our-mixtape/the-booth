# Mixer knob direction — September 10, 2026

EQ and filter indicators now turn clockwise as their values increase. Drag right to raise the value or left to lower it. Up/down input is retained; the first deliberate movement selects an axis until release, so incidental diagonal movement does not reverse or amplify the adjustment. Channel faders and the crossfader retain their existing gestures and audio routing.

The exported Blender mixer and procedural fallback agree. The Blender generator reverses the input-to-rotation mapping while keeping valid sorted authoring rotation limits. Unit checks inspect the actual bright indicator vertices in the exported mesh: boost points right of its pivot and cut points left.

- [Live preview](live-preview.png): A high EQ at +12 dB, B at -12 dB, and A filter closed, visually inspected. The preview was then returned to neutral EQ/open filter.
- [Exported mixer](exported-clockwise.png) and [fallback](fallback-clockwise.png): +6 dB high EQ and 75% filter after upward/rightward tests.
- [Exported routing](exported-routing.json) and [fallback routing](fallback-routing.json): left drag gives -6 dB / about 535 Hz; right drag gives +6 dB / about 5,981 Hz. Actual Web Audio parameters and domain values agree. Diagonal drift retains the chosen drag axis.
- [All 21 mixer controls](all-mixer-controls.json) still apply the intended commands and DSP values.
- [Layout audio](layout-continuity.webm) and [measurements](layout-continuity.json) verify continuous original-fixture master-bus output across layouts. No system-audio or human audition claim.
- [Verification](verification.json): lint, typecheck, 92 unit tests, 27 browser checks and production build pass. Both server/client branches are already included in the integration PR.

Run the exact browser command in verification.json on free ports 5177/8791; the signed-in preview can stay running on 5176/8790. No new model call, dependency, deployment or DNS change was made for this fix.

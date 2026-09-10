# A–D deck order — September 10, 2026

The four CDJs now read **A, B, C, D from left to right**, with the mixer between B and C. The editable Blender mixer and procedural fallback both order their channel strips A, B, C, D. Each deck keeps its existing track, transport, meter, EQ, gain, filter and crossfader assignment (A+C left bus, B+D right bus). Two-player and turntable layouts continue to use A/B.

- [Actual preview](live-preview.png), visually inspected in the signed-in in-app browser on port 5176.
- [Four-player render](abcd-cdjs.png), captured by the physical transport regression.
- [Transport routing](transport-routing.json): each physical PLAY targets its named deck, produces nonzero actual channel audio, and leaves the other decks paused; CUE restores that same deck to zero.
- [Mixer routing](mixer-control-routing.json): all 21 exported pointer controls apply the intended domain command and real audio parameter.
- [Layout audio](layout-continuity.webm) and [measurements](layout-continuity.json): original fixtures continue through layout changes. RMS 0.02581; longest near-zero span 0.0000833 seconds. This is internal master-bus evidence, not device/system-audio verification or human audition.
- [Commands, results and asset hash](verification.json): 92 unit tests, 14 selected browser tests, lint, typecheck and build passed.

The source and public GLB are identical: 876,692 bytes, 30 mesh primitives, 16,263 triangles and 21 controls. The source `.blend` and binding manifest were regenerated with Blender 5.2.1 LTS using `assets/blender/create_mixer.py`. No new assets, dependencies or model calls were obtained from external services for this change.

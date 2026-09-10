# Account experience evidence — September 10, 2026

- `account-unconfigured-desktop.png`: actual local account sheet with no Clerk configuration. This is the honest unavailable state, not a functioning sign-in form.
- `account-unconfigured-mobile.png`: same state at a 390×844 browser viewport; document width checked to remain 390px.
- `account-simulated-signed-in.png`: real Booth account sheet with an explicitly simulated test identity; not evidence of a Clerk account or a completed login.

`tests/auth.browser.ts` covers anonymous free play, token-bearing requests with a simulated identity, discarded pending feedback on sign-out, microphone/peer cleanup on observed session expiry, and reauthentication after an API 401. No real email, OAuth login, physical microphone or paid model request occurs in those checks. Existing browser audio regressions separately capture real fixture output and verify camera/voice track isolation. See the latest BUILD_LOG entry for final suite results.

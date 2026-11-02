# iOS: TrustChain Keyboard

A container app (setup steps) plus a keyboard extension (`mn.trustchain.keyboard.ext`), generated with XcodeGen from `project.yml`. The layout comes from `spec/layout.json` (copied in by `node tools/sync-spec.mjs`). The extension has `RequestsOpenAccess = NO`: no network, nothing stored.

## Build
GitHub Actions (`.github/workflows/ios.yml`) builds for the simulator, unsigned, on every push to `main`.

## TestFlight
1. Register the explicit App ID `mn.trustchain.keyboard` at developer.apple.com → Identifiers.
2. In App Store Connect, create the app "TrustChain Keyboard" with that bundle ID.
3. App Store Connect → Users and Access → Integrations → Team Keys: create a key with **Admin** access. CI uses it to create a temporary distribution certificate and App Store profiles each run (tools/asc-signing.mjs), then revokes the certificate.
4. Repo secrets: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID`, `ASC_KEY_P8` (the whole .p8 text).
5. Actions → iOS → Run workflow → tick "Upload a signed build to TestFlight".
6. The build shows in App Store Connect → TestFlight after processing (about 5–15 minutes). Add yourself under Internal Testing; no review is needed.

Local (on a Mac): `brew install xcodegen && node ../tools/sync-spec.mjs && xcodegen && open TrustChainKeyboard.xcodeproj`.

# appstore

## Implemented

- Added `testAppStoreScreenshots()` to the iOS UI tests. It enables the extension in Settings when needed, switches to TrustChain Keyboard, taps out “Сайн байна уу”, and saves three named, persistent screenshots: typing, setup, and a longer sentence with the keyboard visible.
- Added the manual `appstore.yml` workflow. It uses an iPhone Pro Max simulator, exports only the three named PNG attachments, checks their pixel dimensions, and passes them to an Ubuntu metadata job.
- Added `tools/asc-appstore.mjs`. It selects the requested processed build, prepares version and app metadata, categories, age rating, review contact, build attachment, and 6.7-inch screenshots. `SUBMIT=true` requests App Review. API errors include Apple's messages and the script never logs credentials. Reruns update metadata and replace screenshots; an already submitted version is recognized.

## Checked

- `node --check tools/asc-appstore.mjs` — passed.
- Parsed `.github/workflows/appstore.yml` with Python PyYAML and verified both jobs — passed.
- `git diff --check` — passed.

## Not tested / open

- This sandbox has no network or macOS/Xcode simulator. The UI test, screenshot export, Apple API calls, and submission were not run. The first GitHub Actions run must verify simulator navigation, exported attachment manifest names, API endpoint permissions, accepted age-rating fields, and review-submission item schema. Apple API behavior can change; the script reports the server's validation errors.
- In App Store Connect's web UI, the owner still needs to complete or verify App Privacy, pricing, availability, and content rights. Apple may require other account-level answers before review submission succeeds.
- The privacy URL and support page were not checked over the network.

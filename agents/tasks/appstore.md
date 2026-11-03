# Task `appstore` (owner: codex): App Store submission via the App Store Connect API

Read `AGENTS.md`, `tools/asc-internal-testers.mjs` (copy its JWT/api helper and the 5xx retry from `tools/asc-signing.mjs`), `.github/workflows/testers.yml` and `ios.yml`. The app is "TrustChain Keyboard": App Store Connect Apple ID 6830161190, bundle ID `com.trustchainmn.keyboard`, primary language en-US. The owner chose **App Store only**. You have no network: write the code carefully. It runs in GitHub Actions with the secrets `ASC_KEY_ID`, `ASC_ISSUER_ID` and `ASC_KEY_P8` (Admin key).

## 1. Screenshots (UI test)
In `ios/UITests/KeyboardUITests.swift`, add `testAppStoreScreenshots()`, reusing the existing helpers. It adds the keyboard in Settings exactly like `testKeyboardIsOfferedAndTypes` (skip that if "TrustChain Keyboard" already shows under Keyboards), then opens our app, switches to our keyboard and types "Сайн байна уу" with taps. Use the key geometry from the existing test: rows are 54 pt and the top margin is 8 pt. Middle row = й б ө а х р о л д (9 keys, centred). Top row = ц у ж э н г ш ү з ы (10). Bottom-letter row = shift я ч с м и т ь в backspace. Space is in the bottom row.
- Save XCTAttachments named `appstore-1-typing`, `appstore-2-setup` (the app's setup screen with the keyboard hidden), and `appstore-3-keyboard` (the keyboard up with the field holding a longer Mongolian sentence typed via `textView.typeText` is fine for this one), all `.keepAlways`.

## 2. Workflow `.github/workflows/appstore.yml` (workflow_dispatch, inputs: `build` (required, e.g. 51), `submit` boolean default false)
- Job `screenshots` (macos-26, use the same Xcode-26 selection and the ad-hoc signing flags as `ios.yml`'s ui-test job): boot an **iPhone Pro Max** simulator (`iPhone 1[5-7] Pro Max`), run only `-only-testing:UITests/KeyboardUITests/testAppStoreScreenshots`, export attachments with `xcrun xcresulttool export attachments`, and keep only the `appstore-*` PNGs. Verify each is 1290x2796 or 1320x2868 (`sips -g pixelWidth -g pixelHeight`) and upload them as artifact `appstore-screenshots`.
- Job `metadata` (ubuntu, needs screenshots): download the artifact and run `node tools/asc-appstore.mjs` with env BUILD, SUBMIT and SHOTS_DIR.

## 3. `tools/asc-appstore.mjs` (idempotent: running it twice is fine)
1. Find the app by bundle ID, then its appStoreVersion (platform IOS) in an editable state (PREPARE_FOR_SUBMISSION or similar). Set `versionString` to the build's CFBundleShortVersionString (`1.0.0`) and `copyright` "2026 Trustchain Tuul LLC".
2. appStoreVersionLocalization en-US: `description`, `keywords`, `promotionalText`, `supportUrl` https://trustchain.mn/keyboard, `marketingUrl` https://trustchain.mn/keyboard. Texts are below.
3. appInfo (the editable one) → appInfoLocalization en-US: `subtitle`, `privacyPolicyUrl` https://trustchain.mn/keyboard/privacy.html. Categories: primary UTILITIES, secondary PRODUCTIVITY.
4. ageRatingDeclaration: every content descriptor NONE/false (keyboard, no web access, no UGC). That gives a 4+ rating.
5. appStoreReviewDetail: contactFirstName "Bilguun", contactLastName "Batbayar", contactPhone "+976 96060544", contactEmail "bilguun.info@gmail.com", demoAccountRequired false, notes: "TrustChain Keyboard is a Mongolian Cyrillic custom keyboard. To use: Settings > General > Keyboard > Keyboards > Add New Keyboard > TrustChain Keyboard, then switch with the globe key. It does not request Full Access and makes no network requests. Rare letters appear on long-press (e.g. hold Г for К)."
6. Attach the build whose `version` == BUILD (it must be processed and VALID) to the appStoreVersion.
7. Screenshots: screenshot set for display type `APP_IPHONE_67` on the en-US localization. Delete its existing screenshots, then upload each PNG in name order: reserve (fileName, fileSize) → PUT each uploadOperation part → PATCH `uploaded: true` with `sourceFileChecksum` (MD5 hex). Wait until assetDeliveryState is COMPLETE.
8. If SUBMIT=true: create a reviewSubmission (platform IOS, relationship app), add a reviewSubmissionItem for the appStoreVersion, then PATCH the submission `submitted: true`. Print the result. If Apple refuses because of things only the web UI can set (App Privacy, pricing, availability, content rights), print Apple's error messages clearly and exit 1.
Log every step briefly. Never print secrets.

### Texts (en-US)
- subtitle (≤30): `Mongolian keyboard, big keys`
- promotionalText: `Type Mongolian Cyrillic faster: 27 big keys, rare letters on long-press. No Full Access, nothing you type ever leaves your phone.`
- keywords (≤100 chars): `mongolian,keyboard,cyrillic,монгол,гар,mongol,kirill,khalkha,typing,big keys,монгол гар`
- description:
```
TrustChain Keyboard is a Mongolian Cyrillic keyboard for iPhone with fewer, bigger keys.

Mongolian has 35 letters, so the standard keyboard crams 12 small keys into each row. TrustChain Keyboard shows the 27 letters you use most as big keys, in the familiar Mongolian order. The rarely used letters are one long-press away:
• Г → К   • Ш → Щ   • Э → Е   • Б → П
• В → Ф   • Ь → Ъ   • Я → Ю, Ё   • У → Ю

Hold a key, slide to the letter, release. That's it.

Works everywhere: messages, mail, notes, X, Facebook and any other app.

Private by design:
• No Full Access requested
• No network access, no analytics, no tracking
• Nothing you type is stored or sent anywhere

Setup: Settings › General › Keyboard › Keyboards › Add New Keyboard › TrustChain Keyboard. Then tap the globe key to switch.

Made in Mongolia by Trustchain Tuul LLC.
```

## Checks
`node --check tools/asc-appstore.mjs`; parse the YAML. Write `agents/out/appstore.md`: what's implemented, what's uncertain about the API, and what must be done in the web UI.

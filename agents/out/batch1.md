# batch1

## Changed

- `spec/layout.json`: Compact is 10/10/9 with ю and ё visible; Standard is 12/11/10 with only е and щ hidden. Added layout names and set long press to 250 ms. Synced the JSON to Android, iOS, and web.
- Android: parsed both layouts, persisted the choice in IME SharedPreferences, toggled it on a space long press, removed the keyboard top bar, enlarged rows, and moved sharing to the setup app. Added the setup hint and updated layout tests.
- iOS: parsed both layouts, persisted the choice in the extension's `UserDefaults.standard`, toggled it on a space long press, removed the keyboard brand bar, enlarged rows, and added sharing and the setup hint. Updated UI test geometry.
- Web: added the space long press toggle with guarded localStorage, showed the selected layout name, fitted 12-key rows, and updated the page copy and hint.

## Checked

- `node --test spec/*.test.mjs` passed.
- `node spec/layout.test.mjs` passed all 11 assertions.
- `node --check web/app.js` and `git diff --check` passed.
- Reviewed Kotlin and Swift gesture, layout, and setup changes for compile and touch handling issues.

## Not tested or open

- Android and iOS were not compiled or run here; the task notes that compilers are unavailable in this sandbox. Device checks should cover space long press, persistence, double-space period, and sharing.
- Playwright is installed, but Chromium cannot launch in this sandbox (`sandbox_host_linux.cc: Operation not permitted`), and a local HTTP server cannot bind (`PermissionError`). `launch/web-390.png` was not regenerated.
- `launch/typing-test/recommendations-1.md` is absent from this worktree, so that context could not be read.
- No external network access was used. Network-dependent steps, including downloading the brand logo, were skipped; existing local logo assets were retained.

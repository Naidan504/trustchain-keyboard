# Task `batch1` (owner: codex): owner feedback batch 1 + typing test 1

Read `AGENTS.md`, `launch/feedback.md` (C1–C5), `launch/typing-test/analysis-1.md` and `recommendations-1.md` for context. The owner decided the following. Implement exactly this on **all three platforms**: Android (`android/`), iOS (`ios/`) and web (`web/`). Keep changes minimal and in the existing style.

## 1. Two layouts in `spec/layout.json`
- Keep the key `"letters"` = **Compact** (default), now rows 10/10/9:
  - row1: ц у ж э(long е) н г(long к) ш(long щ) ү з **ю**
  - row2: й ы б(long п) ө а х р о л д
  - row3: я ч **ё** с м и т ь(long ъ) в(long ф)
  - No long-press on у, о, я anymore (C2: the ү/ө duplicates are gone; ю and ё now have their own keys).
- Add `"lettersStandard"` = **Standard (MNS)**, rows 12/11/10, all letters visible except е and щ:
  - row1: ф ц у ж э(long е) н г ш(long щ) ү з к ъ
  - row2: й ы б ө а х р о л д п
  - row3: я ч ё с м и т ь в ю
- Add `"layoutNames": {"compact": "TrustChain", "standard": "TrustChain · Стандарт"}`. That's the space-bar label per layout.
- `"longPressMs": 250` (was 300).
- `spec/layout.test.mjs`: test BOTH layouts. All 35 letters reachable, base keys unique, rows ≤ 12, Compact has 25–30 base keys, every hidden letter in 1–2 popups. Then run `node tools/sync-spec.mjs` so every platform gets the new JSON.

## 2. Switching layouts: **long-press the space bar** toggles Compact ⇄ Standard
- Remember the choice: Android SharedPreferences inside the IME; iOS the extension's own `UserDefaults.standard` (no App Group, no full access); web localStorage (wrapped in try/catch).
- The space bar shows `layoutNames[current]`.
- Long-press space must not type a space. A normal tap still types a space, and double-space-period keeps working.

## 3. Remove the top bar (C1) and give its height to the keys
- Android `KeyboardView.kt`: remove the brand/share bar and its touch handling. Keep about 8dp of top padding so the press preview and popups for row 1 have some room (clamp at the top as today). Row height 56dp → **62dp** in portrait (landscape 44dp).
- iOS `KeyboardView.swift`: remove the brand text (`barH` → about 8pt padding); row height 54 → **60**. Update `KeyboardViewController` height math.
- Rows with more keys (Standard) are full width with narrower keys; keep the existing logic (row width = min(w/total, w/10) per unit) but **change the cap from w/10 to w/12** so 12-key rows fill the width. Compact rows (10/10/9 + shift/backspace) still centre the 9-letter row.
- Web: no bar exists. Just add the space long-press toggle and show the layout name on the space key.

## 4. Share moves into the setup apps
- Android `SetupActivity` + `activity_setup.xml`: add a button "Найздаа хуваалцах" that opens the system share sheet with `topBar.share.text + " " + topBar.share.url` from layout.json (or a string resource). Remove `onShare`/`onBrand` from the IME and `Listener`.
- iOS `SetupViewController`: add the same button with `UIActivityViewController`.
- Add one line to both setup screens and the web page: "Зай товчийг удаан дарж стандарт ⇄ компакт байрлал солино." (long-press space switches layouts).

## 5. Tests to update
- Android `LayoutTest.kt`: both layouts parse; all letters reachable in each.
- iOS UI test `ios/UITests/KeyboardUITests.swift`: the geometry changed (no 36pt bar; rows 60pt; ~8pt top padding). Update the `key(row:index:)` maths. Compact row 2 is still й ы б ө а х р о л д (10 keys, unit = w/10). Keep the test typing а л д and long-press б → п = "Алдп".
- Web: if Playwright is available, keep `launch/web-390.png` working; otherwise skip.

## Checks before finishing
`node --test spec/*.test.mjs` must pass. Review your own Kotlin and Swift carefully for compile errors (no compilers here; CI and titem build them). Write `agents/out/batch1.md`: what changed per platform, and anything not done or uncertain.

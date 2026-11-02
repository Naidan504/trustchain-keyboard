# android-review

## Findings, ranked by severity

| Severity | Location | What breaks | Status |
| --- | --- | --- | --- |
| Medium | `ios/Keyboard/KeyboardViewController.swift:57` | After entering a numeric field, the symbols layer stayed active when focus moved to a text field. | Fixed: reset the layer when the field's keyboard type changes; preserve a manual symbols selection while the type stays the same. |
| Medium | `android/app/src/main/java/mn/trustchain/keyboard/KeyboardView.kt:314`, `ios/Keyboard/KeyboardView.swift:237` | A finger drifting within a key before the long-press popup opened caused the next slide to be measured from the original touch position. This could select the wrong alternate letter. | Fixed: keep the popup slide origin at the latest finger position before it opens. |
| Low | `ios/Keyboard/KeyboardView.swift:199` | Cancellation of a superseded finger could cancel the currently active finger during a two-finger roll. | Fixed: cancel only when the active touch is in the cancelled set. |
| Low | `android/app/src/main/java/mn/trustchain/keyboard/KeyboardView.kt:385` | Detaching a view cancelled timers but retained its active pointer and key. A reused view could commit a stale key on the next press. | Fixed: clear touch state on detach. |
| Low | `android/app/src/main/java/mn/trustchain/keyboard/TrustChainIME.kt:32`, `ios/Keyboard/KeyboardViewController.swift:26` | Double-space and double-shift timers could carry over when a keyboard view starts again. | Fixed: reset those timers at view start. |

## Reviewed and still open

- `android/app/src/main/java/mn/trustchain/keyboard/KeyboardView.kt:314` and `ios/Keyboard/KeyboardView.swift:237`: sliding from a character onto a special key still commits the original character. Handling a slide onto backspace or globe would need a deliberate decision about immediate actions and repeat timing. Left unchanged.
- `ios/Keyboard/KeyboardViewController.swift:137`: the Enter key inserts a newline for every field. Whether this invokes Search, Go, or Send in single-line host fields needs testing in actual apps. Left unchanged.
- `ios/Keyboard/KeyboardView.swift:182`: simultaneous new touches arrive as a `Set`, so their iteration order is unspecified. The intended order of simultaneous two-finger input needs device testing. Left unchanged.
- The Swift source, `ios/project.yml`, and `.github/workflows/ios.yml` were checked for obvious declaration, initializer-order, optional, constraint, and configuration mistakes. No definite compile error was found by inspection.

## Checks and limits

- `node --test spec/*.test.mjs`: passed (1 test file).
- `git diff --check`: passed.
- Android Kotlin compilation and on-device typing were not run; a Kotlin compiler/device is unavailable here.
- Swift/Xcode compilation, iOS simulator testing, keyboard extension behavior in host apps, and GitHub Actions CI were not run; this sandbox has no Xcode/macOS or network access. Network-dependent steps were skipped as requested.
- Rotation, appearance changes, popup geometry, backspace repeat, Enter actions, and IME lifecycle behavior still need device verification.

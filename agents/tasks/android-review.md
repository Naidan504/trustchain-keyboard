# Task `android-review` (owner: codex)

Do an independent bug review of the native keyboards. Read `AGENTS.md` first.

Review these:
- `android/app/src/main/java/mn/trustchain/keyboard/*.kt`: an InputMethodService with a custom canvas KeyboardView. It's built and unit-tested, but not yet run on a device.
- `ios/Keyboard/*.swift` and `ios/App/*.swift`: a keyboard extension and container app. **They have never been compiled** (CI on macOS hasn't run yet), so look hard for Swift compile errors: memberwise init argument order, optionals, missing `override`, `@objc`, API names and signatures (`handleInputModeList(from:with:)`, `textDocumentProxy` properties, `keyboardLayoutGuide`), and type mismatches (CGFloat vs Double).
- `ios/project.yml` (XcodeGen) and `.github/workflows/ios.yml`.

Focus on real bugs that would break typing:
- Touch handling: multi-touch rolls, slide between keys, the long-press popup selection (relative slide from where the popup opened), backspace repeat, and the timers on both platforms.
- Shift states and auto-capitalisation, double-space period, the enter key on single-line vs multi-line fields, and the symbols layer.
- Android IME lifecycle (`onStartInputView` before `onCreateInputView`? view recreation on rotation) and iOS height constraint and appearance handling.

**Fix only clear bugs and compile errors, with minimal changes.** Don't restyle or refactor, and don't change `spec/`. For anything uncertain, describe it instead of changing it.

Checks: `node --test spec/*.test.mjs`. A Kotlin compiler isn't available here, so be careful with Kotlin edits.

Write `agents/out/android-review.md`: findings ranked by severity (file:line, what breaks, fixed or not), plus what you couldn't verify.

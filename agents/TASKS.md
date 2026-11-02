# Task board

Status: `open` → `doing` → `review` (branch pushed, waiting for Claude to merge) → `done`. Briefs are in `agents/tasks/<id>.md`.
If Claude has stopped (no Claude commit for 2+ hours), Codex may take `claude` tasks. **Nobody but Claude deploys to trustchain.mn.**

| id | owner | status | task |
|---|---|---|---|
| spec | claude | done | `spec/layout.json` + tests (27 keys, 8 letters on long-press) |
| freq | claude | doing | Letter/word frequency from a Mongolian corpus → `spec/letterfreq.json`, then confirm the layout |
| web | codex | open | Web keyboard + landing/download page in `web/` |
| ios | codex | open | iOS keyboard extension (XcodeGen) + GitHub Actions simulator build in `ios/`, `.github/workflows/ios.yml` |
| copy | grok | open | Launch tweets + page text in Mongolian → `launch/` |
| layout-review | grok | open | Review the long-press placement from a Mongolian typist's view → `agents/out/layout-review.md` |
| android | claude | doing | Android IME app in `android/` |
| build | claude | open | Android SDK + release build on titem, signing |
| android-review | codex | blocked (android) | Independent review of `android/`: touch handling, long-press, key sizes, IME edge cases |
| deploy | claude | open | trustchain.mn/keyboard route in argo-sites, APK hosting, company page link |
| translit | codex | later | Optional Latin→Cyrillic toggle, off by default (only after everything else) |

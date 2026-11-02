# Task board

Status: `open` → `doing` → `review` (branch pushed, waiting for Claude to merge) → `done`. Briefs are in `agents/tasks/<id>.md`.
If Claude has stopped (no Claude commit for 2+ hours), Codex may take `claude` tasks. **Nobody but Claude deploys to trustchain.mn.**

| id | owner | status | task |
|---|---|---|---|
| spec | claude | done | `spec/layout.json` + tests (27 keys, 8 letters on long-press; ю also under у) |
| freq | claude | done | Leipzig mon_news_2020 (8.1M letters): the 8 hidden letters are exactly the 8 rarest, all < 0.4% |
| web | claude | done | `web/`, live at trustchain.mn/keyboard (Codex was blocked: no bubblewrap in WSL) |
| android | claude | done | Android 1.0.1, signed, no permissions, live APK |
| build | claude | done | titem: JDK 17 / SDK 35 / Gradle 8.11.1 in ~/opt and ~/android-sdk; checkout ~/build; key ~/keys + ~/.config/tk-signing.properties |
| deploy | claude | done | argo-sites `/keyboard` route; company page row #54 |
| copy | grok | review | `launch/tweets.md` drafts (need a native-speaker edit; see the note at the top). page-copy.json and install-guide.md were not produced |
| layout-review | grok | done | `agents/out/layout-review.md`; adopted ю under у; the rest is contradicted by the frequency data |
| ios | claude | review | `ios/` + `.github/workflows/ios.yml` written, **not compiled yet**: waits for the GitHub repo (CI runs on macOS) |
| testflight | user | blocked | GitHub repo + secrets ASC_KEY_ID, ASC_ISSUER_ID, APPLE_TEAM_ID, ASC_KEY_P8 (Admin key), App ID + app record |
| android-review | codex | done | Independent review of `android/` and `ios/` Swift for bugs (touch handling, long-press, IME edge cases) |
| translit | codex | later | Optional Latin→Cyrillic toggle, off by default |

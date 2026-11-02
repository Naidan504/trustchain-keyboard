# Working on TrustChain Keyboard (rules for every agent: Claude, Codex, Grok)

**Product:** a standalone, system-wide Mongolian Cyrillic phone keyboard. It's added once in phone Settings and works in every app (mail, chat, X/Twitter…). Android (InputMethodService) and iOS (keyboard extension), plus a web page at https://trustchain.mn/keyboard that serves as the landing/download page and a type-and-copy stopgap for iPhone. Made by TrustChain (Трастчейн Туул ХХК, trustchain.mn).

**The core idea:** 35 letters, but only 27 big keys. The rare letters (е к щ п ю ё ъ ф) open on **long-press** of a related key. The key order follows the standard Mongolian layout, so typists feel at home. Long-press must be excellent: popup after `longPressMs`, slide finger to choose, release to type, first option preselected.

**Single source of truth:** `spec/layout.json`. Never hard-code the letter layout on any platform. Read the JSON (it's copied into each platform by `node tools/sync-spec.mjs`). If you think the layout should change, write it in your notes; don't edit `spec/`.

**Hard rules**
- Privacy promise: the keyboard never uses the network and never stores typed text. Android: no INTERNET permission. iOS: `RequestsOpenAccess` = NO. Web: no analytics, no external scripts or fonts, works offline.
- No secrets in git (keys, keystores, tokens). The repo will become open source.
- Stay inside your task's folders. Don't touch other platforms' folders or `spec/`.
- Keep code plain and small. No frameworks where the platform has enough (web = vanilla HTML/CSS/JS in one folder; Android = Kotlin, no Compose needed; iOS = Swift/UIKit).
- UI text is in Mongolian Cyrillic. The brand name "TrustChain Keyboard" stays in English.
- Brand: deep green `#2F6B3E` (dark mode `#a8d5ac`), logo `https://trustchain.mn/api/company/logo.svg` (download it into your folder; don't hotlink it from the keyboard).
- Before finishing: run the checks your task lists, then write `agents/out/<task-id>.md` with what you did, what you tested, and what is NOT tested or still open.

**Task board:** `agents/TASKS.md`. Pick only tasks assigned to you, unless the board says the owner has stopped.

# Task `web` (owner: codex)

Build `web/`: the page served at https://trustchain.mn/keyboard. Read `AGENTS.md` and `spec/layout.json` first. Run `node tools/sync-spec.mjs` so `web/layout.json` exists, and load the layout from `./layout.json` at runtime with fetch. No hard-coded letters.

## What the page is
1. **Landing/download page** for the real phone keyboard: the hero says (in Mongolian) what it is (35 letters, 27 big keys, rare letters on long-press, works in every app), then a big **Android APK download** button linking `./trustchain-keyboard.apk`, plus a 3-step Android install guide: download → allow install from this source → Settings → System → Languages & input → On-screen keyboard → enable "TrustChain Keyboard". Then an **iPhone** section: "App coming via TestFlight soon. Meanwhile use the keyboard below and copy", with Add-to-Home-Screen instructions. Privacy promise: "no internet permission, nothing you type leaves your phone".
2. **A working on-screen keyboard** (the iPhone stopgap and the demo): textarea plus the keyboard rendered from layout.json, with letters, shift (tap once = next capital, double tap = caps lock), backspace (hold to repeat), the symbols layer (`?123` ⇄ `АБВ`), space, enter (new line), comma/period with their long-press lists, and auto-capitalisation per `rules`.
   - **Long-press is the core feature and must be excellent:** pointer events (works with touch and mouse); after `longPressMs` a popup appears above the key with the `long` options, the first one preselected; slide horizontally to change the selection; release types the selected one; release outside the popup cancels; a quick tap types the base letter. Show a small hint dot or the first long-press letter in the key corner so people discover it. Prevent the native context menu, text selection and double-tap zoom on keys. The textarea must **not** open the phone's own keyboard: use `inputmode="none"` and keep the caret working.
   - Buttons under the textarea: **Хуулах** (copy, with a "Copied" toast), **X-д жиргэх** (opens `https://twitter.com/intent/tweet?text=...` with the typed text), **Арилгах** (clear).
3. **Brand:** a TrustChain header (download the logo to `web/logo.svg`) with a link to trustchain.mn, and a footer "© Трастчейн Туул ХХК".

## Tech
- Vanilla HTML/CSS/JS only: `web/index.html`, `web/app.js`, `web/style.css`, `web/manifest.webmanifest`, icons (`web/icon-192.png`, `web/icon-512.png`, which you can render from the logo with any tool available, or make them SVG-based), and `web/sw.js` for an offline cache. No external scripts, fonts or analytics. The system font stack is fine.
- Mobile first: the keyboard fills the width at 360px. Keys are at least 44px tall, rounded, with visible press states. Light and dark mode via `prefers-color-scheme`. Respect safe-area insets.
- Keep text strings at the top of `app.js` in one `TEXT` object, so the Grok copy can be dropped in later.
- All files are referenced relatively (the page is served under `/keyboard/`). The server only serves whitelisted file names, so keep the file set small and list every file in `agents/out/web.md`.

## Checks before finishing
- `node --test spec/*.test.mjs` passes.
- If Playwright or Chromium is available (`npx -y playwright@1.49.1 --version`), take a screenshot at 390×844 to `launch/web-390.png` and a scripted check that typing via the on-screen keys produces "Сайн байна уу" and that long-press on г gives к. If no browser is available, write that it's untested.
- Write `agents/out/web.md` (files, what works, what's untested).

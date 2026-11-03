# TrustChain Keyboard: owner's feedback log

Comments are collected here as they come, then batched with the typing-test results (`launch/typing-test/`) and implemented together. Status: `open` → `planned` (decided in the batch) → `done (build N)`.

## Batch 1 (2026-11-04, given during the typing test)

| # | Comment (owner) | Notes / data | Status |
|---|---|---|---|
| C1 | Remove the "TrustChain" title bar above the keys; the name is already on the space bar. | The bar is ~36–40 pt. Removing it makes the keyboard shorter, or gives that height to the keys. On **Android** the same bar holds the **Share ↗** button, so it either goes too or moves (e.g. into long-press on the space bar or the setup app). Decide in the batch. | done (kept after revert: Android 1.0.4, next iOS build; Share moved into the Android setup app) |
| C2 | Remove the duplicate long-press у→ү and о→ө; ү and ө have their own keys. | `spec/layout.json`: `у` long = [ү, ю], `о` long = [ө]. Dropping them leaves у → ю only (if ю stays hidden) and о with no popup. | reverted; retry one change at a time |
| C3 | **ю is used often; give it its own key.** Consider where. | News corpus: ю 0.22% (rank 30/35), but chat uses юу, юм, буюу, аюулгүй all the time. In the standard MNS layout ю sits at the **end of row 3** (after в). Options: (a) add it to row 1, which then has 10 keys like row 2 (also solves C4); (b) end of row 3 as in MNS, which then has 9 letters + shift + backspace, so keys get narrower. Check against the typing test (T1/T2/T4 contain ю). | reverted; retry one change at a time |
| C4 | Rows 1 and 2 have different key counts (9 vs 10). Might feel weird; not sure. | Today: row 1 = 9, row 2 = 10, row 3 = 8 + shift + backspace. Option (a) of C3 makes rows 1 and 2 both 10. | reverted; retry one change at a time |
| C5 | Typing test done in 17 min. Had to glance at the keyboard often; the last part (T5) was typed fully blind. Biased: very fast on the standard Cyrillic Mongolian keyboard. Thinks the standard letter placement is bad (inherited from Russian), so **open to moving keys if the learning curve isn't steep**. Goal: type without looking. Slightly more accurate when looking at the printed text, more so when looking at the keyboard. | `launch/typing-test/result-1.md`, `analysis-1.md`: CER 27% overall; 219 neighbour-key errors in systematic pairs (л→о 27, д→л 22, г→ш 20, й→ы 20, а→ө 19, у→ж 17, т→ь 17); hidden letters weak (ё 0/6, п 0/2, к 3/9, е 4/9; ъ 5/7 ok). T2b and T3a skipped. | batch 1 (two switchable layouts) was **too hard to type → reverted** |

## Batch 1 outcome (2026-11-04)
Owner: "revert the keyboards, it's become way harder to type; iterate small from the previous version with a few buttons, one by one; keep comments unrelated to buttons." → Keys and long-press are back to build 41 / Android 1.0.2. Only C1 (no bar above the keys) is kept. **From now on: one key change per build**, owner tries it, keep or roll back.

## Ideas for later
- **Slide/swipe to type** in Cyrillic (the owner has always wanted it). Needs a Mongolian word list; `spec/wordfreq.json` already has the top 50k words.
- Typing-test finding to check: **ъ** is common in casual "let's" forms (авъя, ярилцъя, алхъя, даръя, оръё), so maybe it shouldn't be hidden behind Ь.

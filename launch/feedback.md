# TrustChain Keyboard: owner's feedback log

Comments are collected here as they come, then batched with the typing-test results (`launch/typing-test/`) and implemented together. Status: `open` → `planned` (decided in the batch) → `done (build N)`.

## Batch 1 (2026-11-04, given during the typing test)

| # | Comment (owner) | Notes / data | Status |
|---|---|---|---|
| C1 | Remove the "TrustChain" title bar above the keys; the name is already on the space bar. | The bar is ~36–40 pt. Removing it makes the keyboard shorter, or gives that height to the keys. On **Android** the same bar holds the **Share ↗** button, so it either goes too or moves (e.g. into long-press on the space bar or the setup app). Decide in the batch. | open |
| C2 | Remove the duplicate long-press у→ү and о→ө; ү and ө have their own keys. | `spec/layout.json`: `у` long = [ү, ю], `о` long = [ө]. Dropping them leaves у → ю only (if ю stays hidden) and о with no popup. | open |
| C3 | **ю is used often; give it its own key.** Consider where. | News corpus: ю 0.22% (rank 30/35), but chat uses юу, юм, буюу, аюулгүй all the time. In the standard MNS layout ю sits at the **end of row 3** (after в). Options: (a) add it to row 1, which then has 10 keys like row 2 (also solves C4); (b) end of row 3 as in MNS, which then has 9 letters + shift + backspace, so keys get narrower. Check against the typing test (T1/T2/T4 contain ю). | open |
| C4 | Rows 1 and 2 have different key counts (9 vs 10). Might feel weird; not sure. | Today: row 1 = 9, row 2 = 10, row 3 = 8 + shift + backspace. Option (a) of C3 makes rows 1 and 2 both 10. | open |

## Ideas for later
- **Slide/swipe to type** in Cyrillic (the owner has always wanted it). Needs a Mongolian word list; `spec/wordfreq.json` already has the top 50k words.
- Typing-test finding to check: **ъ** is common in casual "let's" forms (авъя, ярилцъя, алхъя, даръя, оръё), so maybe it shouldn't be hidden behind Ь.

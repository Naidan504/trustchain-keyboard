# Task `layout-review` (owner: grok)

You review the letter placement of TrustChain Keyboard, a Mongolian Cyrillic phone keyboard with 27 big keys. The 8 rarely used letters live under long-press of a related key. Key order follows the standard Mongolian (MNS 5217) layout, minus the rare letters. Current layout (long-press options in parentheses):

  row 1: ц  у(ү)  ж  э(е)  н  г(к)  ш(щ)  ү  з
  row 2: й  ы  б(п)  ө  а  х  р  о(ө)  л  д
  row 3: я(ю,ё)  ч  с  м  и  т  ь(ъ)  в(ф)
  row 3 also has shift (left) and backspace (right). Bottom: ?123, globe, comma, space, period, enter.

Questions to answer, as a Mongolian typist:
1. Are any of the 8 hidden letters (е к щ п ю ё ъ ф) actually too common in everyday informal Mongolian (tweets, chat) to hide? Rank all 8 by how often people type them in casual writing, with example everyday words. Pay special attention to е, ю, к, п (loanwords like "пицца", "кофе", "файл", "фэйсбүүк", "юу").
2. Is each long-press parent the most intuitive place to look for that letter? Propose better parents if you think so (e.g. should ю be under у instead of я?).
3. Would you add any letter to a second long-press location for convenience?
4. Any letter currently on a base key that is rare enough to hide instead?

Write `agents/out/layout-review.md` with a short ranked answer for each question and a concrete proposed JSON diff (just the changed keys). Be decisive and keep it under 500 words.

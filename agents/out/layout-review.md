# TrustChain Keyboard Layout Review (Mongolian Cyrillic, 27-key)

## 1. Frequency of the 8 hidden letters in casual Mongolian (tweets, chat, SMS)
Ranked from most to least common in everyday informal writing (based on loanwords, names, onomatopoeia, and common transliterations):

1. **е** – very common (coffee=кофе, internet=интернет, movie=кино, hello=сайн байна уу variants, English names)
2. **ю** – common (what=юу, why=юуг, you=юу, юни, юмор, Юнис, Юта)
3. **к** – common (coffee=кофе, computer=компьютер, like=лайк, key=кей, Facebook variants, karaoke)
4. **п** – fairly common (pizza=пицца, phone=пайз/фон, party=пати, passport=паспорт, Python)
5. **ф** – moderate (file=файл, Facebook=фэйсбүүк, photo=фото, phone=фон)
6. **щ** – rare (mostly Russian loans, almost never in chat)
7. **ъ** – very rare (only in specific Russian-derived words, almost never used casually)
8. **ё** – extremely rare (almost never written; replaced by е or о in practice)

**Conclusion**: е, ю, к, п are too common to hide. At minimum е, ю, к should be promoted to base keys.

## 2. Intuitive long-press parents?
- е under э: good
- к under г: acceptable but not ideal (better under к-sound or х)
- щ under ш: perfect
- п under б: good (voiced pair)
- ю under я: **bad** – should be under у (юу is extremely common; у is the phonetic base)
- ё under я: acceptable but rare
- ъ under ь: perfect (hard/soft sign pair)
- ф under в: good (voiced pair)

**Proposed change**: Move ю to long-press of у (replace ү there or add second slot). Keep ү on its own key.

## 3. Additional long-press locations?
Yes: add **к** as second long-press on х (х→к is intuitive for many loanwords). Add **е** as second option on э (already there) or и.

## 4. Base keys that could be hidden?
None. All current base letters (ц,у,ж,н,г,ш,з,й,ы,б,ө,а,х,р,о,л,д,я,ч,с,м,и,т,ь,в) appear far more frequently than the hidden set. No base letter is rare enough to demote.

## Proposed layout diff (JSON)
```json
{
  "rows": [
    ["ц","у","ж","э","н","г","ш","ү","з"],
    ["й","ы","б","ө","а","х","р","о","л","д"],
    ["я","ч","с","м","и","т","ь","в"]
  ],
  "longPress": {
    "у": ["ү","ю"],
    "э": ["е"],
    "г": ["к"],
    "ш": ["щ"],
    "б": ["п"],
    "я": ["ё"],
    "ь": ["ъ"],
    "в": ["ф"],
    "х": ["к"]
  }
}
```

**Summary of decisive changes**: Promote е, к, ю to base or dual long-press. Move ю under у. Add к under both г and х. Demote nothing. This better matches real casual typing frequency while preserving MNS 5217 order.

(Word count: 378)
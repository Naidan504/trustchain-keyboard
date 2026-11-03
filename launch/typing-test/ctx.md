# Context: TrustChain Keyboard typing test

We built a Mongolian Cyrillic phone keyboard (iOS + Android) with 27 big keys instead of the usual 35. The 8 rarest letters are on long-press of a related key (hold ~300 ms, popup shows options, first option preselected, slide to choose, release to type). Key order follows the standard Mongolian (MNS 5217) layout minus the rare letters.

Layout (long-press options in parentheses):
  row 1: ц  у(ү,ю)  ж  э(е)  н  г(к)  ш(щ)  ү  з
  row 2: й  ы  б(п)  ө  а  х  р  о(ө)  л  д
  row 3: я(ю,ё)  ч  с  м  и  т  ь(ъ)  в(ф)
  row 3 also has shift (left) and backspace (right). Bottom row: ?123, globe, comma (long: ! ? ; : -), space, period (long: ? ! … " '), enter.
  Note: у→ү/ю and о→ө are extra long-press shortcuts even though ү and ө also have their own keys.

Letter frequency in Mongolian news text (% of letters, 8.1M letters, Leipzig corpus): а 12.27, н 8.01, э 7.63, г 6.36, л 6.31, р 5.28, д 4.81, х 4.68, о 4.67, и 4.54, й 4.46, у 3.77, т 3.43, ү 3.18, с 3.18, ө 2.68, б 2.64, м 2.2, ж 1.69, в 1.25, ы 1.21, ч 1.1, з 0.92, ш 0.78, ц 0.69, ь 0.67, я 0.5, е 0.37, к 0.23, ю 0.22, ё 0.12, п 0.11, ф 0.03, ъ 0.01, щ 0.0

## The owner and the goal
- The owner will type a few-hundred-word Mongolian test text QUICKLY and CARELESSLY on an iPhone (iOS 26) in the X/Twitter compose box, partly without looking at the keyboard (rough memory of positions). They're not a keyboard fanatic and use Dvorak on a computer. They'll paste back what they typed and add UX comments.
- We'll then analyze typed vs. intended text to improve the layout and UX "from the beginning": key positions, which letters are hidden on long-press and under which parent, long-press timing, the space/punctuation/shift behaviour, and later possibly swipe/slide-to-type (they wish Cyrillic keyboards had it).
- Target users: Mongolians who may not know English and need to type fast on the phone. Voice input exists, but people still type.
- The keyboard has NO autocorrect or word suggestions yet, so raw typing errors are visible.

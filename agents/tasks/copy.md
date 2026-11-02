# Task `copy` (owner: grok)

You write the launch copy for **TrustChain Keyboard**, a free Mongolian Cyrillic keyboard for Android and iPhone made by TrustChain (trustchain.mn, Трастчейн Туул ХХК, a Mongolian software company).

Facts (use only these; invent no numbers, user counts or reviews):
- Mongolian Cyrillic has 35 letters, and the standard phone keyboard crams 12–13 tiny keys per row.
- TrustChain Keyboard has 27 big keys in the familiar Mongolian order. The 8 rarely used letters (е к щ п ю ё ъ ф) appear when you hold a related key: г→к, ш→щ, э→е, б→п, в→ф, ь→ъ, я→ю/ё.
- It's a real system keyboard. Once added in Settings it works in every app (X/Twitter, Messenger, mail, notes).
- Privacy: it has no internet permission and never stores what you type.
- Android: download the APK from trustchain.mn/keyboard. iPhone: TestFlight is coming soon; meanwhile type on the web page and copy.
- Free.

Audience: Mongolian X/Twitter users, informal, young, a little playful. Write natural Mongolian, the way people really tweet, not a translation.

Produce these files:
1. `launch/tweets.md`: 6 launch tweet options in Mongolian Cyrillic (each ≤ 270 characters including the link https://trustchain.mn/keyboard), with variety: problem/solution, a "tiny keys" joke, the privacy angle, a challenge ("type 'щ' in under 2 seconds"), a short thread of 3 tweets, and one reply-bait question. Add 2 Latin-script Mongolian versions for people who usually write in Latin. Add a recommended hashtag list (few, real-sounding, e.g. #монгол). Add a 1-line note for each on when to use it.
2. `launch/page-copy.json`: strings for the web page as {"heroTitle","heroSub","androidButton","androidSteps":[...3],"iphoneTitle","iphoneText","privacy","copy","copied","tweet","clear","footer"}, in Mongolian Cyrillic, short.
3. `launch/install-guide.md`: an illustrated-in-words install guide for Android (with the "install unknown apps" permission explained calmly, since people may be scared) and for iPhone via TestFlight later. In Mongolian.

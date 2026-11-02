import UIKit

/// The keyboard extension. RequestsOpenAccess = NO: it has no network access and stores nothing typed.
final class KeyboardViewController: UIInputViewController, KeyboardViewDelegate {

    private var kb: KeyboardView!
    private var heightConstraint: NSLayoutConstraint?
    private var lastShiftTap = Date.distantPast
    private var lastSpaceAt = Date.distantPast

    override func viewDidLoad() {
        super.viewDidLoad()
        kb = KeyboardView(layout: Layout.load(withGlobe: needsInputModeSwitchKey))
        kb.delegate = self
        kb.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(kb)
        NSLayoutConstraint.activate([
            kb.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            kb.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            kb.topAnchor.constraint(equalTo: view.topAnchor),
            kb.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if heightConstraint == nil {
            let rows = CGFloat(kb.rows.count)
            let h = view.heightAnchor.constraint(equalToConstant: KeyboardView.barH + rows * KeyboardView.rowH + 4)
            h.priority = UILayoutPriority(999)
            h.isActive = true
            heightConstraint = h
        }
        // The globe key is only needed when the system doesn't show its own.
        kb.layout = Layout.load(withGlobe: needsInputModeSwitchKey)
        updateAppearance()
        updateAutoShift()
    }

    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)
        updateAppearance()
        updateAutoShift()
    }

    override func selectionDidChange(_ textInput: UITextInput?) {
        super.selectionDidChange(textInput)
        updateAutoShift()
    }

    private func updateAppearance() {
        let proxyDark = textDocumentProxy.keyboardAppearance == .dark
        kb.dark = proxyDark || traitCollection.userInterfaceStyle == .dark
        if let kt = textDocumentProxy.keyboardType, [.numberPad, .decimalPad, .phonePad, .numbersAndPunctuation].contains(kt) {
            kb.symbolsMode = true
        }
    }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        updateAppearance()
    }

    /// Capitalise at the start of a sentence, as the text field asks.
    private func updateAutoShift() {
        guard kb.shift != .lock else { return }
        let type = textDocumentProxy.autocapitalizationType ?? .sentences
        let before = textDocumentProxy.documentContextBeforeInput ?? ""
        var caps = false
        switch type {
        case .allCharacters: caps = true
        case .words: caps = before.isEmpty || before.last == " " || before.last == "\n"
        case .sentences:
            let t = before.replacingOccurrences(of: "[ \\t]+$", with: "", options: .regularExpression)
            caps = t.isEmpty || t.hasSuffix(".") || t.hasSuffix("!") || t.hasSuffix("?") || before.hasSuffix("\n")
            if !t.isEmpty && !(before.last == " " || before.last == "\n") { caps = false }
        default: caps = false
        }
        kb.shift = caps ? .once : .off
    }

    // MARK: KeyboardViewDelegate

    func kbText(_ text: String) {
        let proxy = textDocumentProxy
        if text == " " {
            let before = proxy.documentContextBeforeInput ?? ""
            // Double space → ". " after a letter or digit, like the system keyboard.
            if Date().timeIntervalSince(lastSpaceAt) < 0.6, before.hasSuffix(" "),
               let prev = before.dropLast().last, prev.isLetter || prev.isNumber {
                proxy.deleteBackward()
                proxy.insertText(". ")
                lastSpaceAt = .distantPast
            } else {
                proxy.insertText(" ")
                lastSpaceAt = Date()
            }
        } else {
            proxy.insertText(text)
            lastSpaceAt = .distantPast
            if kb.shift == .once { kb.shift = .off }
        }
        updateAutoShift()
    }

    func kbBackspace() {
        textDocumentProxy.deleteBackward()
        lastSpaceAt = .distantPast
        updateAutoShift()
    }

    func kbShiftTap() {
        let now = Date()
        switch kb.shift {
        case .off: kb.shift = .once
        case .once: kb.shift = now.timeIntervalSince(lastShiftTap) < 0.35 ? .lock : .off
        case .lock: kb.shift = .off
        }
        lastShiftTap = now
    }

    func kbSymbols(_ on: Bool) {
        kb.symbolsMode = on
        if !on { updateAutoShift() }
    }

    func kbGlobe(from view: UIView, with event: UIEvent?) {
        // Tap = next keyboard, long-press = list (the system decides from the touch events).
        if let event = event { handleInputModeList(from: view, with: event) } else { advanceToNextInputMode() }
    }

    func kbEnter() {
        textDocumentProxy.insertText("\n") // the system turns this into Send / Search / Go where the field asks for it
        updateAutoShift()
    }
}

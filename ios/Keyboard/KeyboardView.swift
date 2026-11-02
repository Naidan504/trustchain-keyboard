import UIKit

protocol KeyboardViewDelegate: AnyObject {
    func kbText(_ text: String)
    func kbBackspace()
    func kbShiftTap()
    func kbSymbols(_ on: Bool)
    func kbGlobe(from view: UIView, with event: UIEvent?)
    func kbEnter()
}

/// The whole keyboard drawn in one view: brand bar, keys, press preview and the long-press popup.
/// Same behaviour as the Android KeyboardView (one active touch; a new finger commits the previous key).
final class KeyboardView: UIView, UIInputViewAudioFeedback {

    enum Shift { case off, once, lock }

    weak var delegate: KeyboardViewDelegate?
    var layout: Layout { didSet { rebuild() } }
    var shift: Shift = .off { didSet { if oldValue != shift { setNeedsDisplay() } } }
    var symbolsMode = false { didSet { if oldValue != symbolsMode { rebuild() } } }
    var dark = false { didSet { if oldValue != dark { setNeedsDisplay() } } }

    var enableInputClicksWhenVisible: Bool { true }

    static let barH: CGFloat = 36
    static let rowH: CGFloat = 54
    private let gap: CGFloat = 3
    private let radius: CGFloat = 7

    private struct KeyRect { let def: KeyDef; var rect: CGRect; let row: Int }
    private var keys: [KeyRect] = []

    // Touch state
    private weak var activeTouch: UITouch?
    private var active: Int?             // index into keys
    private var popup: [String]?
    private var popupRect = CGRect.zero
    private var popupCellW: CGFloat = 0
    private var popupSel = 0
    private var popupStartX: CGFloat = 0
    private var longFired = false
    private var longTimer: Timer?
    private var repeatTimer: Timer?

    init(layout: Layout) {
        self.layout = layout
        super.init(frame: .zero)
        isMultipleTouchEnabled = true
        contentMode = .redraw
        backgroundColor = .clear
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    var rows: [[KeyDef]] { symbolsMode ? layout.symbols : layout.letters }

    override func layoutSubviews() {
        super.layoutSubviews()
        rebuild()
    }

    private func rebuild() {
        let w = bounds.width
        guard w > 0 else { return }
        var out: [KeyRect] = []
        for (r, row) in rows.enumerated() {
            let total = row.reduce(0) { $0 + $1.weight }
            // Short rows keep the key width of a 10-key row and are centred, like a normal keyboard.
            let unit = min(w / total, w / 10)
            var x = (w - unit * total) / 2
            let top = Self.barH + CGFloat(r) * Self.rowH
            for k in row {
                let kw = unit * k.weight
                out.append(KeyRect(def: k, rect: CGRect(x: x, y: top, width: kw, height: Self.rowH), row: r))
                x += kw
            }
        }
        keys = out
        setNeedsDisplay()
    }

    // MARK: colours

    private var cBg: UIColor { dark ? UIColor(white: 0.11, alpha: 1) : UIColor(red: 0.82, green: 0.84, blue: 0.86, alpha: 1) }
    private var cKey: UIColor { dark ? UIColor(white: 0.42, alpha: 1) : .white }
    private var cKeyDown: UIColor { dark ? UIColor(white: 0.55, alpha: 1) : UIColor(red: 0.74, green: 0.76, blue: 0.79, alpha: 1) }
    private var cSpecial: UIColor { dark ? UIColor(white: 0.27, alpha: 1) : UIColor(red: 0.67, green: 0.70, blue: 0.74, alpha: 1) }
    private var cText: UIColor { dark ? .white : .black }
    private var cHint: UIColor { dark ? UIColor(white: 0.75, alpha: 1) : UIColor(white: 0.45, alpha: 1) }
    private var cAccent: UIColor { dark ? UIColor(red: 0.66, green: 0.84, blue: 0.67, alpha: 1) : UIColor(red: 0.18, green: 0.42, blue: 0.24, alpha: 1) }
    private var cOnAccent: UIColor { dark ? UIColor(red: 0.06, green: 0.19, blue: 0.10, alpha: 1) : .white }
    private var cPopup: UIColor { dark ? UIColor(white: 0.48, alpha: 1) : .white }
    private let cShadow = UIColor(white: 0, alpha: 0.3)

    // MARK: drawing

    override func draw(_ rect: CGRect) {
        cBg.setFill()
        UIRectFill(bounds)
        drawString(layout.brand, at: CGPoint(x: 14 + 40, y: Self.barH / 2), size: 14, weight: .semibold, color: cAccent)
        for i in keys.indices { drawKey(i) }
        if let a = active {
            if popup != nil { drawPopup() }
            else if keys[a].def.kind == .char && !longFired { drawPreview(keys[a]) }
        }
    }

    private func cased(_ s: String) -> String { (shift != .off && !symbolsMode) ? s.uppercased() : s }

    private func label(_ k: KeyDef) -> String {
        switch k.kind {
        case .char: return cased(k.text)
        case .shift: return shift == .lock ? "⇪" : "⇧"
        default: return k.label
        }
    }

    private func drawString(_ s: String, at center: CGPoint, size: CGFloat, weight: UIFont.Weight = .regular, color: UIColor) {
        let attrs: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: size, weight: weight), .foregroundColor: color]
        let str = s as NSString
        let sz = str.size(withAttributes: attrs)
        str.draw(at: CGPoint(x: center.x - sz.width / 2, y: center.y - sz.height / 2), withAttributes: attrs)
    }

    private func roundRect(_ r: CGRect, _ color: UIColor, shadow: Bool = true) {
        if shadow {
            cShadow.setFill()
            UIBezierPath(roundedRect: r.offsetBy(dx: 0, dy: 1), cornerRadius: radius).fill()
        }
        color.setFill()
        UIBezierPath(roundedRect: r, cornerRadius: radius).fill()
    }

    private func drawKey(_ i: Int) {
        let k = keys[i]
        let r = k.rect.insetBy(dx: gap, dy: gap)
        let pressed = active == i && popup == nil
        let special = k.def.kind != .char && k.def.kind != .space
        let accent = k.def.kind == .enter || (k.def.kind == .shift && shift != .off)
        roundRect(r, pressed ? cKeyDown : accent ? cAccent : special ? cSpecial : cKey)
        let lbl = label(k.def)
        let size: CGFloat = k.def.kind == .space ? 13 : (lbl.count > 2 ? 15 : 23)
        let color = k.def.kind == .space ? cHint : (accent && !pressed ? cOnAccent : cText)
        drawString(lbl, at: CGPoint(x: r.midX, y: r.midY), size: size, color: color)
        // Corner hint: the first long-press letter, so people discover the hidden ones.
        if k.def.kind == .char, let first = k.def.long.first {
            drawString(cased(first), at: CGPoint(x: r.maxX - 7, y: r.minY + 8), size: 10, color: cHint)
        }
    }

    private func drawPreview(_ k: KeyRect) {
        let w = max(k.rect.width, 44)
        let h = Self.rowH * 1.05
        let left = min(max(0, k.rect.midX - w / 2), bounds.width - w)
        let r = CGRect(x: left, y: max(0, k.rect.minY - h), width: w, height: h)
        roundRect(r, cPopup)
        drawString(cased(k.def.text), at: CGPoint(x: r.midX, y: r.midY), size: 30, color: cText)
    }

    private func drawPopup() {
        guard let opts = popup else { return }
        roundRect(popupRect, cPopup)
        for (i, s) in opts.enumerated() {
            let cell = CGRect(x: popupRect.minX + CGFloat(i) * popupCellW, y: popupRect.minY, width: popupCellW, height: popupRect.height)
            let sel = i == popupSel
            if sel { roundRect(cell.insetBy(dx: 3, dy: 3), cAccent, shadow: false) }
            drawString(cased(s), at: CGPoint(x: cell.midX, y: cell.midY), size: 26, color: sel ? cOnAccent : cText)
        }
    }

    // MARK: touch

    private func keyIndex(at p: CGPoint) -> Int? {
        guard p.y >= Self.barH - 6 else { return nil }
        let row = min(max(0, Int((p.y - Self.barH) / Self.rowH)), rows.count - 1)
        let inRow = keys.indices.filter { keys[$0].row == row }
        if let hit = inRow.first(where: { p.x >= keys[$0].rect.minX && p.x < keys[$0].rect.maxX }) { return hit }
        return inRow.min(by: { abs(keys[$0].rect.midX - p.x) < abs(keys[$1].rect.midX - p.x) })
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        for t in touches {
            if activeTouch != nil { release(commit: true, event: event) } // fast typing: earlier key first
            press(t, event: event)
        }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let t = activeTouch, touches.contains(t) else { return }
        move(t.location(in: self))
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let t = activeTouch, touches.contains(t) else { return }
        release(commit: true, event: event)
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let t = activeTouch, touches.contains(t) else { return }
        release(commit: false, event: event)
    }

    private func press(_ t: UITouch, event: UIEvent?) {
        let p = t.location(in: self)
        guard let i = keyIndex(at: p) else { return }
        activeTouch = t
        active = i
        longFired = false
        popup = nil
        popupStartX = p.x
        UIDevice.current.playInputClick()
        let k = keys[i].def
        switch k.kind {
        case .char where !k.long.isEmpty:
            startLongTimer()
        case .backspace:
            delegate?.kbBackspace()
            repeatTimer = Timer.scheduledTimer(withTimeInterval: 0.38, repeats: false) { [weak self] _ in
                self?.repeatTimer = Timer.scheduledTimer(withTimeInterval: 0.045, repeats: true) { _ in self?.delegate?.kbBackspace() }
            }
        case .globe:
            delegate?.kbGlobe(from: self, with: event)
        default:
            break
        }
        setNeedsDisplay()
    }

    private func startLongTimer() {
        longTimer?.invalidate()
        longTimer = Timer.scheduledTimer(withTimeInterval: Double(layout.longPressMs) / 1000, repeats: false) { [weak self] _ in
            self?.onLongPress()
        }
    }

    private func move(_ p: CGPoint) {
        if let opts = popup {
            let sel = min(max(0, Int(((p.x - popupStartX) / popupCellW).rounded())), opts.count - 1)
            if sel != popupSel { popupSel = sel; setNeedsDisplay() }
            return
        }
        // Anchor a future popup to the finger's position when it opens, even after a small drift.
        popupStartX = p.x
        guard let a = active, keys[a].def.kind == .char else { return }
        // Sliding to a neighbour before the long-press fires: the key under the finger counts.
        if let i = keyIndex(at: p), i != a, keys[i].def.kind == .char {
            longTimer?.invalidate()
            active = i
            popupStartX = p.x
            if !keys[i].def.long.isEmpty { startLongTimer() }
            setNeedsDisplay()
        }
    }

    private func onLongPress() {
        guard let a = active else { return }
        let k = keys[a]
        guard !k.def.long.isEmpty else { return }
        longFired = true
        popupCellW = max(k.rect.width, 42)
        let w = popupCellW * CGFloat(k.def.long.count)
        let h = Self.rowH * 1.05
        // The first option sits right above the key, so "hold and release" picks it with no slide.
        let left = min(max(0, k.rect.midX - popupCellW / 2), bounds.width - w)
        popupRect = CGRect(x: left, y: max(0, k.rect.minY - h), width: w, height: h)
        popup = k.def.long
        popupSel = 0
        setNeedsDisplay()
    }

    private func release(commit: Bool, event: UIEvent?) {
        longTimer?.invalidate(); longTimer = nil
        repeatTimer?.invalidate(); repeatTimer = nil
        let a = active
        let opts = popup
        let sel = popupSel
        activeTouch = nil; active = nil; popup = nil
        setNeedsDisplay()
        guard commit, let i = a else { return }
        if let opts = opts { delegate?.kbText(cased(opts[sel])); return }
        let k = keys[i].def
        switch k.kind {
        case .char: delegate?.kbText(cased(k.text))
        case .space: delegate?.kbText(" ")
        case .shift: delegate?.kbShiftTap()
        case .symbols: delegate?.kbSymbols(true)
        case .letters: delegate?.kbSymbols(false)
        case .enter: delegate?.kbEnter()
        case .globe: delegate?.kbGlobe(from: self, with: event)
        case .backspace: break
        }
    }
}

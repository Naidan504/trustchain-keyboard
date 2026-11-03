import UIKit

/// One key on screen. `text` is what a tap types; `long` is what the long-press popup offers.
struct KeyDef {
    enum Kind { case char, shift, backspace, symbols, letters, globe, space, enter }
    let kind: Kind
    var text: String = ""
    var label: String = ""
    var long: [String] = []
    var weight: CGFloat = 1
}

/// Parsed spec/layout.json (bundled as layout.json, the same file Android and the web use).
struct Layout {
    let letters: [[KeyDef]]
    let symbols: [[KeyDef]]
    let longPressMs: Int
    let brand: String

    private struct Spec: Decodable {
        struct Key: Decodable { let k: String; let long: [String]? }
        struct Bottom: Decodable { let type: String; let k: String?; let label: String?; let long: [String]? }
        struct TopBar: Decodable { let brand: String? }
        let longPressMs: Int?
        let letters: [[Key]]
        let bottom: [Bottom]
        let symbols: [[String]]
        let symbolsLong: [String: [String]]?
        let topBar: TopBar?
    }

    static func load(withGlobe: Bool) -> Layout {
        guard let url = Bundle(for: KeyboardViewController.self).url(forResource: "layout", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let spec = try? JSONDecoder().decode(Spec.self, from: data) else {
            fatalError("layout.json missing or invalid")
        }

        func bottomRow(symbolsMode: Bool) -> [KeyDef] {
            spec.bottom.compactMap { b in
                switch b.type {
                case "symbols":
                    return symbolsMode ? KeyDef(kind: .letters, label: "АБВ", weight: 1.5)
                                       : KeyDef(kind: .symbols, label: b.label ?? "?123", weight: 1.5)
                case "switch":
                    return withGlobe ? KeyDef(kind: .globe, label: "🌐") : nil
                case "space":
                    return KeyDef(kind: .space, text: " ", label: b.label ?? "", weight: withGlobe ? 4.5 : 5.5)
                case "enter":
                    return KeyDef(kind: .enter, label: "⏎", weight: 1.5)
                default:
                    return KeyDef(kind: .char, text: b.k ?? "", label: b.k ?? "", long: b.long ?? [])
                }
            }
        }

        var letters = spec.letters.map { row in row.map { KeyDef(kind: .char, text: $0.k, label: $0.k, long: $0.long ?? []) } }
        letters[letters.count - 1].insert(KeyDef(kind: .shift, label: "⇧", weight: 1.4), at: 0)
        letters[letters.count - 1].append(KeyDef(kind: .backspace, label: "⌫", weight: 1.4))

        var symbols = spec.symbols.map { row in row.map { KeyDef(kind: .char, text: $0, label: $0, long: spec.symbolsLong?[$0] ?? []) } }
        symbols[symbols.count - 1].append(KeyDef(kind: .backspace, label: "⌫", weight: 1.4))

        return Layout(
            letters: letters + [bottomRow(symbolsMode: false)],
            symbols: symbols + [bottomRow(symbolsMode: true)],
            longPressMs: spec.longPressMs ?? 300,
            brand: spec.topBar?.brand ?? "TrustChain"
        )
    }
}

import XCTest

/// End-to-end check in the simulator, no phone needed:
/// 1. Settings → General → Keyboard → Keyboards → Add New Keyboard offers "TrustChain Keyboard", and adding it works.
/// 2. In the app's test field we switch to it, type with taps, and use a long-press.
final class KeyboardUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
    }

    private func shot(_ name: String, _ app: XCUIApplication) {
        let a = XCTAttachment(screenshot: app.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    private var step = 0
    /// Taps the first element whose label equals `label` (else begins with it); records a screenshot and the
    /// element tree after every step, so a failure shows exactly where navigation stopped.
    private func tapText(_ app: XCUIApplication, _ label: String, timeout: TimeInterval = 10) {
        step += 1
        // Several elements can match (e.g. the page title "Keyboards" and the row "Keyboards  2"):
        // take the lowest hittable one on screen, which is the row, not the navigation title.
        let query = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@ OR label BEGINSWITH %@", label, label))
        _ = query.firstMatch.waitForExistence(timeout: timeout)
        let el = query.allElementsBoundByIndex.filter { $0.exists && $0.isHittable }.max(by: { $0.frame.minY < $1.frame.minY }) ?? query.firstMatch
        if !el.exists {
            let tree = XCTAttachment(string: app.debugDescription); tree.name = "tree-before-\(label)"; tree.lifetime = .keepAlways; add(tree)
            shot("step\(step)-missing-\(label)", app)
            XCTFail("'\(label)' not found"); return
        }
        el.tap()
        sleep(1)
        shot("step\(step)-after-\(label)", app)
    }

    func testKeyboardIsOfferedAndTypes() throws {
        // --- 1. Add the keyboard in Settings
        let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        settings.launch()
        shot("step0-settings", settings)
        tapText(settings, "General")
        tapText(settings, "Keyboard")
        tapText(settings, "Keyboards")
        tapText(settings, "Add New Keyboard")
        sleep(2)
        shot("1-add-new-keyboard", settings)
        let addTree = XCTAttachment(string: settings.debugDescription); addTree.name = "tree-add-new-keyboard"; addTree.lifetime = .keepAlways; add(addTree)
        let ours = settings.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "TrustChain Keyboard")).firstMatch
        XCTAssertTrue(ours.waitForExistence(timeout: 10), "TrustChain Keyboard is NOT offered in Add New Keyboard")
        ours.tap()
        sleep(2)
        shot("2-keyboards-after-add", settings)

        // --- 2. Type with it in our app
        let app = XCUIApplication()
        app.launch()
        let field = app.textViews["test-field"]
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        field.tap()
        sleep(2)

        // Switch keyboards with the globe ("Next keyboard") until ours is up.
        let ourKeyboard = app.descendants(matching: .any)["trustchain-keyboard"]
        var tries = 0
        while !ourKeyboard.exists && tries < 6 {
            let globe = app.buttons.matching(NSPredicate(format: "label == 'Next keyboard' OR identifier == 'Next keyboard'")).firstMatch
            if globe.exists { globe.tap() } else { break }
            sleep(1)
            tries += 1
        }
        shot("3-our-keyboard", app)
        XCTAssertTrue(ourKeyboard.waitForExistence(timeout: 5), "could not switch to TrustChain Keyboard")

        // Key geometry mirrors KeyboardView: 36pt bar, 54pt rows; row 2 has 10 keys of width w/10.
        let f = ourKeyboard.frame
        func key(row: Int, index: Int, keysInRow: CGFloat = 10) -> XCUICoordinate {
            let unit = f.width / 10
            let x0 = (f.width - unit * keysInRow) / 2
            let x = x0 + unit * (CGFloat(index) + 0.5)
            let y = 36 + 54 * (CGFloat(row) + 0.5)
            return ourKeyboard.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y))
        }
        // Row 2 (index 1): й ы б ө а х р о л д
        key(row: 1, index: 4).tap()   // а → "А" (auto-capital at the start)
        key(row: 1, index: 8).tap()   // л
        key(row: 1, index: 9).tap()   // д
        key(row: 1, index: 2).press(forDuration: 0.8) // hold б → popup, first option п, release types it
        sleep(1)
        shot("4-typed", app)
        XCTAssertEqual(field.value as? String, "Алдп")
    }
}

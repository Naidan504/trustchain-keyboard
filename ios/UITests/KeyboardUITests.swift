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
        _ = query.firstMatch.waitForExistence(timeout: min(timeout, 4))
        // Long lists (e.g. "Apps" near the bottom of Settings): scroll until a hittable match shows up.
        var swipes = 0
        while query.allElementsBoundByIndex.first(where: { $0.exists && $0.isHittable }) == nil && swipes < 8 {
            app.swipeUp(); swipes += 1; sleep(1)
        }
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

    /// Settings → General → Keyboard → Keyboards → Add New Keyboard; returns Settings on that screen.
    private func openAddNewKeyboard(_ tag: String) -> XCUIApplication {
        let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        settings.terminate()
        settings.launch()
        shot("\(tag)-step0-settings", settings)
        tapText(settings, "General")
        tapText(settings, "Keyboard")
        tapText(settings, "Keyboards")
        tapText(settings, "Add New Keyboard")
        sleep(2)
        shot("\(tag)-add-new-keyboard", settings)
        let tree = XCTAttachment(string: settings.debugDescription); tree.name = "\(tag)-tree-add-new-keyboard"; tree.lifetime = .keepAlways; add(tree)
        return settings
    }

    /// iOS 18+/26: app settings live under Settings → Apps → <app>. Look for a "Keyboards" row there.
    private func openAppSettings(_ appName: String, _ tag: String) -> XCUIApplication {
        let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        settings.terminate()
        settings.launch()
        tapText(settings, "Apps")
        let search = settings.searchFields.firstMatch
        if search.waitForExistence(timeout: 3) { search.tap(); search.typeText(appName); sleep(1) }
        shot("\(tag)-apps-list", settings)
        tapText(settings, appName)
        sleep(2)
        shot("\(tag)-app-page", settings)
        let tree = XCTAttachment(string: settings.debugDescription); tree.name = "\(tag)-tree-app-page"; tree.lifetime = .keepAlways; add(tree)
        return settings
    }

    func testAppPagesShowKeyboards() throws {
        XCUIApplication().launch(); sleep(2)
        for (name, tag) in [("Control Host", "control"), ("TrustChain Keyboard", "ours")] {
            let settings = openAppSettings(name, tag)
            let row = settings.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH 'Keyboard'")).firstMatch
            XCTAssertTrue(row.waitForExistence(timeout: 5), "\(name): no Keyboards row on its app page")
            if row.exists { row.tap(); sleep(2); shot("\(tag)-keyboards-page", settings)
                let t = XCTAttachment(string: settings.debugDescription); t.name = "\(tag)-tree-keyboards-page"; t.lifetime = .keepAlways; add(t) }
        }
    }

    func testKeyboardIsOfferedAndTypes() throws {
        // Launch our app once first, in case iOS only offers keyboards of apps that have run.
        let first = XCUIApplication()
        first.launch()
        sleep(2)
        first.terminate()

        // --- 1. Add the keyboard in Settings
        let settings = openAddNewKeyboard("ours")
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

        // Key geometry mirrors KeyboardView: 8pt top margin, 54pt rows; row 2 has 10 keys of width w/10.
        let f = ourKeyboard.frame
        func key(row: Int, index: Int, keysInRow: CGFloat = 10) -> XCUICoordinate {
            let unit = f.width / 10
            let x0 = (f.width - unit * keysInRow) / 2
            let x = x0 + unit * (CGFloat(index) + 0.5)
            let y = 8 + 54 * (CGFloat(row) + 0.5)
            return ourKeyboard.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y))
        }
        // Row 2 (index 1): й ы б ө а х р о л д (10 keys)
        key(row: 1, index: 4, keysInRow: 10).tap()   // а → "А" (auto-capital at the start)
        key(row: 1, index: 8, keysInRow: 10).tap()   // л
        key(row: 1, index: 9, keysInRow: 10).tap()   // д
        key(row: 1, index: 2, keysInRow: 10).press(forDuration: 0.8) // hold б → popup, first option п, release types it
        sleep(1)
        shot("4-typed", app)
        XCTAssertEqual(field.value as? String, "Алдп")
    }
}

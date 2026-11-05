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

    func testAppStoreScreenshots() throws {
        // Launch once so iOS registers the extension before opening Settings.
        let first = XCUIApplication()
        first.launch()
        sleep(2)
        first.terminate()

        // Same path as testKeyboardIsOfferedAndTypes, which is known to work.
        let settings = openAddNewKeyboard("shots")
        let offered = settings.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "TrustChain Keyboard")).firstMatch
        XCTAssertTrue(offered.waitForExistence(timeout: 10), "TrustChain Keyboard is not offered")
        offered.tap()
        sleep(2)
        shot("shots-after-add", settings)

        let app = XCUIApplication()
        app.launch()
        let field = app.textViews["test-field"]
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        field.tap()
        sleep(2)
        let keyboard = app.descendants(matching: .any)["trustchain-keyboard"]
        var tries = 0
        while !keyboard.exists && tries < 6 {
            let globe = app.buttons.matching(NSPredicate(format: "label == 'Next keyboard' OR identifier == 'Next keyboard'")).firstMatch
            XCTAssertTrue(globe.exists, "No keyboard switch key")
            globe.tap()
            sleep(1)
            tries += 1
            shot("shots-switch-\(tries)", app)
        }
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5), "Could not switch to TrustChain Keyboard")

        let frame = keyboard.frame
        // Mirrors KeyboardView: row 0 has 9 centred keys, row 1 has 10, row 2 is shift (1.4) + 8 letters + backspace (1.4).
        func key(_ row: Int, _ index: Int) -> XCUICoordinate {
            let x: CGFloat
            switch row {
            case 0: x = frame.width / 10 * (0.5 + CGFloat(index) + 0.5)
            case 1: x = frame.width / 10 * (CGFloat(index) + 0.5)
            default: x = frame.width / 10.8 * (1.4 + CGFloat(index) + 0.5)
            }
            return keyboard.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: 8 + 54 * (CGFloat(row) + 0.5)))
        }
        let space = keyboard.coordinate(withNormalizedOffset: .zero).withOffset(
            CGVector(dx: frame.width / 2, dy: 8 + 54 * 3.5))
        let (s, a, y, n, b, u) = ((2, 2), (1, 4), (1, 0), (0, 4), (1, 2), (0, 1)) // с а й н б у
        // Tap Сайн байна уу; the first letter is capitalized by the keyboard.
        for (row, index) in [s, a, y, n] { key(row, index).tap() }
        space.tap()
        for (row, index) in [b, a, y, n, a] { key(row, index).tap() }
        space.tap()
        for (row, index) in [u, u] { key(row, index).tap() }
        XCTAssertEqual(field.value as? String, "Сайн байна уу")
        shot("appstore-1-typing", app)

        app.terminate()
        app.launch()
        XCTAssertTrue(app.textViews["test-field"].waitForExistence(timeout: 10))
        shot("appstore-2-setup", app)

        let longerField = app.textViews["test-field"]
        longerField.tap()
        tries = 0
        while !keyboard.exists && tries < 6 {
            let globe = app.buttons.matching(NSPredicate(format: "label == 'Next keyboard' OR identifier == 'Next keyboard'")).firstMatch
            XCTAssertTrue(globe.exists, "No keyboard switch key")
            globe.tap()
            sleep(1)
            tries += 1
        }
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5), "Could not switch to TrustChain Keyboard")
        longerField.typeText("Монгол кирилл бичгийн шинэ гар. Том товчтой, ховор үсэг нь удаан дарахад гарна.")
        XCTAssertTrue(keyboard.waitForExistence(timeout: 5))
        shot("appstore-3-keyboard", app)
    }
}

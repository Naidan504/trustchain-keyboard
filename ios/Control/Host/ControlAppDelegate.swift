import UIKit

// Test-only host app for the "Control KB" keyboard (Apple's keyboard template). Never shipped.
@main
final class ControlAppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let w = UIWindow(frame: UIScreen.main.bounds)
        w.rootViewController = UIViewController()
        w.rootViewController?.view.backgroundColor = .systemBackground
        w.makeKeyAndVisible()
        window = w
        return true
    }
}

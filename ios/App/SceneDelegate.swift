import UIKit

/// Scene-based lifecycle (what Xcode's iOS templates generate; iOS 26 expects it).
final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let w = UIWindow(windowScene: windowScene)
        w.rootViewController = SetupViewController()
        w.makeKeyAndVisible()
        window = w
    }
}

import UIKit

/// Setup screen: how to add the keyboard, a button to Settings, and a field to try it.
final class SetupViewController: UIViewController {

    private let brand = UIColor { $0.userInterfaceStyle == .dark
        ? UIColor(red: 0.66, green: 0.84, blue: 0.67, alpha: 1)
        : UIColor(red: 0.18, green: 0.42, blue: 0.24, alpha: 1) }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let title = label("TrustChain Keyboard", size: 28, weight: .bold, color: brand)
        let lead = label("35 үсэг, 27 том товч. Ховор үсгүүд холбоотой товчоо удаан дарахад гарна: г→к, ш→щ, э→е, б→п, в→ф, ь→ъ, я→ю ё.", size: 17)
        let stepsTitle = label("Гараа нэмэх", size: 20, weight: .semibold)
        let steps = label("1. Settings → General → Keyboard → Keyboards\n2. Add New Keyboard… → TrustChain Keyboard\n3. Бичих үедээ 🌐 товчийг дарж TrustChain гар руу шилжинэ.", size: 16)

        let open = UIButton(type: .system)
        open.setTitle("Settings нээх", for: .normal)
        open.titleLabel?.font = .systemFont(ofSize: 18, weight: .semibold)
        open.backgroundColor = brand
        open.setTitleColor(.systemBackground, for: .normal)
        open.layer.cornerRadius = 12
        open.heightAnchor.constraint(equalToConstant: 52).isActive = true
        open.addTarget(self, action: #selector(openSettings), for: .touchUpInside)

        let test = UITextView()
        test.font = .systemFont(ofSize: 20)
        test.layer.cornerRadius = 12
        test.layer.borderWidth = 1
        test.layer.borderColor = UIColor.separator.cgColor
        test.heightAnchor.constraint(equalToConstant: 110).isActive = true
        test.accessibilityLabel = "Энд бичиж туршаарай"

        let privacy = label("Нууцлал: энэ гар «Full Access» шаарддаггүй, интернэт ашигладаггүй. Таны бичсэн зүйл утаснаас гарахгүй, хадгалагдахгүй.", size: 14, color: .secondaryLabel)
        let footer = label("© Трастчейн Туул ХХК · trustchain.mn", size: 13, color: .secondaryLabel)

        let stack = UIStackView(arrangedSubviews: [title, lead, stepsTitle, steps, open, test, privacy, footer])
        stack.axis = .vertical
        stack.spacing = 14
        stack.setCustomSpacing(24, after: lead)
        stack.translatesAutoresizingMaskIntoConstraints = false

        let scroll = UIScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        scroll.keyboardDismissMode = .interactive
        view.addSubview(scroll)
        scroll.addSubview(stack)
        NSLayoutConstraint.activate([
            scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
            scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stack.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor, constant: 24),
            stack.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor, constant: -24),
            stack.leadingAnchor.constraint(equalTo: scroll.frameLayoutGuide.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: scroll.frameLayoutGuide.trailingAnchor, constant: -20),
        ])
    }

    private func label(_ text: String, size: CGFloat, weight: UIFont.Weight = .regular, color: UIColor = .label) -> UILabel {
        let l = UILabel()
        l.text = text
        l.numberOfLines = 0
        l.font = .systemFont(ofSize: size, weight: weight)
        l.textColor = color
        return l
    }

    @objc private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

import UIKit
import Capacitor
import Contacts
import ContactsUI

/// `PhoneContact.open({ id })` — show one phone contact, by its identifier, in
/// the system's own contact card (src/lib/deviceContacts.ts ▸ openDeviceContact).
/// No npm plugin opens a contact by id, and iOS has no URL for one.
///
/// The card is read-only (`allowsEditing = false`): BlackBook only ever reads
/// the phone's contacts and never writes back, and its README says so. Calling,
/// messaging and the rest of the card's actions still work.
///
/// Resolves `{ opened: false }` when the contact is gone, or when reading
/// contacts is not allowed, so the app can say so.
@objc(PhoneContactPlugin)
public class PhoneContactPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhoneContactPlugin"
    public let jsName = "PhoneContact"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "chatApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openChat", returnType: CAPPluginReturnPromise),
    ]

    // ── WhatsApp and WhatsApp Business (James, 2026-10-27: "give choice of
    // WhatsApp / WhatsApp business (some have both)") ─────────────────────────
    // Here rather than in a plugin of their own so the Xcode project needs no
    // new file. Both apps answer `whatsapp://`, and iOS picks one; each also
    // has a scheme of its own, `whatsapp-consumer` and `whatsapp-smb`, which
    // is how one is reached and not the other. Neither is documented by
    // WhatsApp, so an app that does not answer its own scheme is simply not
    // offered, and plain `whatsapp://` stands in for WhatsApp. Every scheme
    // asked about here must be in Info.plist's LSApplicationQueriesSchemes, or
    // canOpenURL says no.

    private func can(_ scheme: String) -> Bool {
        guard let url = URL(string: "\(scheme)://") else { return false }
        return UIApplication.shared.canOpenURL(url)
    }

    /// `{ whatsapp, business }`: which of the two can be opened on this phone.
    @objc func chatApps(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let business = self.can("whatsapp-smb")
            let consumer = self.can("whatsapp-consumer")
            let any = self.can("whatsapp")
            call.resolve(["whatsapp": consumer || (any && !business), "business": business])
        }
    }

    /// `openChat({ app: 'whatsapp' | 'business', phone })`: a chat with that
    /// number (international digits, no +) in that app.
    @objc func openChat(_ call: CAPPluginCall) {
        let app = call.getString("app") ?? "whatsapp"
        let phone = (call.getString("phone") ?? "").filter(\.isNumber)
        DispatchQueue.main.async {
            let scheme = app == "business" ? "whatsapp-smb" : (self.can("whatsapp-consumer") ? "whatsapp-consumer" : "whatsapp")
            guard let url = URL(string: "\(scheme)://send?phone=\(phone)") else {
                call.resolve(["opened": false])
                return
            }
            UIApplication.shared.open(url) { ok in call.resolve(["opened": ok]) }
        }
    }

    private let store = CNContactStore()

    @objc func open(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.resolve(["opened": false])
            return
        }
        store.requestAccess(for: .contacts) { granted, _ in
            guard granted else {
                call.resolve(["opened": false])
                return
            }
            let keys = [CNContactViewController.descriptorForRequiredKeys()]
            guard let contact = try? self.store.unifiedContact(withIdentifier: id, keysToFetch: keys) else {
                call.resolve(["opened": false])
                return
            }
            DispatchQueue.main.async {
                let card = CNContactViewController(for: contact)
                card.allowsEditing = false
                card.allowsActions = true
                card.contactStore = self.store
                card.navigationItem.leftBarButtonItem = UIBarButtonItem(
                    barButtonSystemItem: .done, target: self, action: #selector(self.close))
                let nav = UINavigationController(rootViewController: card)
                self.bridge?.viewController?.present(nav, animated: true)
                call.resolve(["opened": true])
            }
        }
    }

    @objc private func close() {
        bridge?.viewController?.dismiss(animated: true)
    }
}

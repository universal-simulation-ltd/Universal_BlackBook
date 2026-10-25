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
    ]

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

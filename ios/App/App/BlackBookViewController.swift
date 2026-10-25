import UIKit
import Capacitor

/// The app's root view controller: Capacitor's own, plus the plugins that live
/// in this app rather than in an npm package (Universal Jukebox's pattern).
///
/// ⚠️ Not in `capacitor.config.json`: `npx cap sync` rewrites that list from
/// npm packages only, so an app-local plugin declared there vanishes on the next
/// sync. `capacitorDidLoad()` runs before the page loads, so the plugin is in
/// `Capacitor.PluginHeaders` for the first render. Main.storyboard names this
/// class.
class BlackBookViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        // "Open in Contacts" on a contact linked to a phone contact.
        bridge?.registerPluginInstance(PhoneContactPlugin())
    }
}

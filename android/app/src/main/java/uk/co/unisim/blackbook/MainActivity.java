package uk.co.unisim.blackbook;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ⚠️ Before super.onCreate: the bridge is built there, and a plugin
        // registered afterwards does not exist to the web layer.
        // The strips round the web view follow the app's Light / Dark — see
        // WindowThemePlugin and src/native/systemBars.ts.
        registerPlugin(WindowThemePlugin.class);
        // "Open in Contacts" on a contact linked to a phone contact.
        registerPlugin(PhoneContactPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

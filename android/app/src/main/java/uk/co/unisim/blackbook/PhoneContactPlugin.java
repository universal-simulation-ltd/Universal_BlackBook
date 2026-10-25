package uk.co.unisim.blackbook;

import android.content.ActivityNotFoundException;
import android.content.ContentUris;
import android.content.Intent;
import android.net.Uri;
import android.provider.ContactsContract;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * PhoneContact.open({ id }) — show one phone contact, by the id
 * @capacitor-community/contacts gives it (ContactsContract.Contacts._ID), in
 * the phone's own Contacts app (src/lib/deviceContacts.ts ▸ openDeviceContact).
 * No npm plugin opens a contact by id. Hands over to the Contacts app, so
 * nothing here reads or writes the contact itself; needs no permission.
 *
 * Resolves { opened: false } when the id is not a number or no app can show it.
 */
@CapacitorPlugin(name = "PhoneContact")
public class PhoneContactPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        JSObject result = new JSObject();
        String id = call.getString("id", "");
        long contactId;
        try {
            contactId = Long.parseLong(id);
        } catch (NumberFormatException e) {
            result.put("opened", false);
            call.resolve(result);
            return;
        }
        Uri uri = ContentUris.withAppendedId(ContactsContract.Contacts.CONTENT_URI, contactId);
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getActivity().startActivity(intent);
            result.put("opened", true);
        } catch (ActivityNotFoundException e) {
            result.put("opened", false);
        }
        call.resolve(result);
    }
}

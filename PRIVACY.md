# What Universal BlackBook does with your address book

An address book is other people's details, plus whatever you write about them
in Notes. None of them agreed to be in it, so this page is written to be
checked: every claim below names the file in this repository that makes it
true, and you are welcome to go and read it.

The short version: **your book lives on your own device, and works with no
account.** If you choose to save it online, it is encrypted on your device
first, with a passphrase only you know, and we cannot read it.

---

## Where your book is kept

| What | Where it happens | The code |
|---|---|---|
| Your contacts, tags, notes and to-dos | IndexedDB, storage inside your own browser or the phone app | [`src/lib/store.ts`](src/lib/store.ts) |
| Asking the browser not to evict it | your browser | [`src/lib/persist.ts`](src/lib/persist.ts) |
| The PIN lock | your device; a slow digest of the PIN is stored, never the PIN | [`src/lib/lock.ts`](src/lib/lock.ts) |
| CSV import and export | your device; the export is a file download, or the share sheet on a phone | [`src/lib/csv.ts`](src/lib/csv.ts), [`src/components/ImportExport.tsx`](src/components/ImportExport.tsx) |

Clearing your browser data, or deleting the app, deletes the book on that
device. **Actions ▸ Advanced ▸ Delete all data** does the same on purpose
([`src/components/DeleteAllData.tsx`](src/components/DeleteAllData.tsx)); it
leaves the online copy alone, which has its own delete button (below).

⚠️ **The PIN lock is a door, not encryption.** It stops someone who picks up
your phone from browsing your book. It does not encrypt what is stored on the
device, and the app never says that it does.

---

## Your phone's contacts

The iPhone, iPad and Android apps can read your phone's contacts in two
places, and only when you press the button:

- **From my contacts** fills in a new BlackBook contact from the one person you
  pick.
- **Import my phone contacts** brings in everyone in your phone's contacts (or,
  on iOS, the ones you chose to share with the app), skipping anyone already
  in your book.

Only the name, phone numbers, email addresses, birthday and postal address are
read, and only one of each is kept. The contact's own notes are never
read. **Nothing is ever written back to your contacts**: the Android app asks
for read access only, and the iOS app never calls the methods that change them.
What is read becomes part of the book on your device, and leaves it only
inside the encrypted online copy described below, if you turn that on. See
[`src/lib/deviceContacts.ts`](src/lib/deviceContacts.ts) and
[`scripts/contacts-read-only.mjs`](scripts/contacts-read-only.mjs).

In a browser, Chrome on Android offers the same one-person picker; no browser
can read your whole address book, and the app does not try.

---

## The one way your book can leave: "Save my book online"

This is optional, needs a Universal ID, and is off until you turn it on. It
lets a second device, or a new phone, get your book back.

- **Encrypted on your device before it is sent.** AES-GCM-256, with a key made
  from a passphrase you choose (PBKDF2-SHA-256, 600,000 rounds). The
  passphrase is not your account password and is never sent to us. See
  [`src/lib/vault.ts`](src/lib/vault.ts).
- **What we store**: one row per account in the UNI·SIM platform's database
  (Supabase): the encrypted bytes, the salt and round count needed to turn your
  passphrase back into the key, a revision number and the time it was saved.
  Database rules let only your own account read or change that row. See
  [`src/lib/cloud.ts`](src/lib/cloud.ts).
- **We cannot read it.** We hold no key, no copy of your passphrase and no
  way to reset it. That is also why a lost passphrase cannot be recovered: the
  book on your device is still there, but the online copy is not readable by
  anyone.
- **"Remember this device"** keeps the key in the device's own storage in a
  form that can be used but not read back out, so you are not asked for the
  passphrase every time.
- **Turn off and delete the online copy** deletes the row outright. Your book
  stays on your device.

---

## What the app talks to a server for, even when your book doesn't

If you open your browser's Network tab you will see requests, and a privacy
page that pretended otherwise would look like a lie.

- **Signing in.** Only if you choose to. A Universal ID is the suite's shared
  account, and it is what the online copy is kept against. You can delete it
  from inside the app: **Delete my account** in the profile menu. That deletes
  it in every UNI·SIM app, not only this one.
- **"You opened the app".** When you are signed in, the app records one event
  saying the app was opened, so your account's activity page is accurate. It
  holds nothing about your book. See `<UsageTracker />` in
  [`src/App.tsx`](src/App.tsx).
- **"This app is in use" (website only).** While the website is open and on
  screen, it tells our server every 45 seconds that the app is in use on this
  device, so the menu can say how many people use it. That message holds the
  app's name and a random ID made on this device, and your account if you are
  signed in: nothing about your book. See `presence.ts` in `@unisim/sdk`.
  **The iPhone, iPad and Android apps don't send this** (see
  [`src/main.tsx`](src/main.tsx)): the App Store and Google Play already count
  how many people have the app.
- **The changelog and update notice**, which is just fetching a list of
  releases.

**There is no third-party analytics, no tracking pixel, and no advertising
script.** The website's security policy ([`public/_headers`](public/_headers))
only lets the page run scripts from our own domain and Google's sign-in
button, so even an analytics script added in front of the site would be
refused.

---

## How to prove it to yourself in about a minute

1. Open [the app](https://opensource.unisim.co.uk/blackbook/), then open your
   browser's developer tools (F12) on the **Network** tab.
2. Add a contact, write a note, filter, export a CSV.
3. Watch the list. Your book is never in it.

Or, more conclusively: **turn off your Wi-Fi and use the app anyway.** It keeps
working, because the book was never anywhere else.

---

## If you find this page is wrong

That is worth more to us than it costs. Open an issue on
[the repository](https://github.com/universal-simulation-ltd/Universal_BlackBook/issues).
A claim nobody can correct isn't a guarantee either.

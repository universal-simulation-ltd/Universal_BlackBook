# What Universal BlackBook does with your address book

An address book is other people's details, plus whatever you write about them
in Notes. None of them agreed to be in it, so this page is written to be
checked: every claim below names the file in this repository that makes it
true, and you are welcome to go and read it.

The short version: **your book lives on your own device, there is no account,
and nothing in it is ever sent to us.** To keep a copy or move it to another
device you save a backup file yourself, and you can lock that file with a
password only you know.

---

## Where your book is kept

| What | Where it happens | The code |
|---|---|---|
| Your contacts, tags, notes and to-dos | IndexedDB, storage inside your own browser or the phone app | [`src/lib/store.ts`](src/lib/store.ts) |
| Asking the browser not to evict it | your browser | [`src/lib/persist.ts`](src/lib/persist.ts) |
| The PIN lock | your device; a slow digest of the PIN is stored, never the PIN | [`src/lib/lock.ts`](src/lib/lock.ts) |
| Backup file (save and open) | your device; saving is a file download, or the share sheet on a phone | [`src/lib/backup.ts`](src/lib/backup.ts), [`src/components/BackupSection.tsx`](src/components/BackupSection.tsx) |
| CSV import and export | your device; the export is a file download, or the share sheet on a phone | [`src/lib/csv.ts`](src/lib/csv.ts), [`src/components/ImportExport.tsx`](src/components/ImportExport.tsx) |

Clearing your browser data, or deleting the app, deletes the book on that
device. **Actions ▸ Advanced ▸ Delete all data** does the same on purpose
([`src/components/DeleteAllData.tsx`](src/components/DeleteAllData.tsx)). A
backup file you saved is yours and is not touched.

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
inside a backup file you choose to save. See
[`src/lib/deviceContacts.ts`](src/lib/deviceContacts.ts) and
[`scripts/contacts-read-only.mjs`](scripts/contacts-read-only.mjs).

In a browser, Chrome on Android offers the same one-person picker; no browser
can read your whole address book, and the app does not try.

---

## The one way your book can leave: a backup file you save

**Actions ▸ Advanced ▸ Backup, import & export ▸ Save a backup** writes the
whole book (contacts, tags and lists, to-dos, and your Tune this app choices)
into one `.json` file and hands it to you: a download in a browser, the share
sheet on a phone. Where it goes from there is up to you. Nothing is uploaded
to us, and there is no online copy.

- **Optional password.** Tick **Protect with a password** and the file is
  encrypted on your device with AES-256-GCM, under a key made from your
  password (PBKDF2-SHA-256, 600,000 rounds). The password is never stored or
  sent anywhere, so nobody, including us, can open the file without it, and a
  forgotten one cannot be reset. Without a password the file is plain text,
  like a CSV. The file format and the encryption are the suite's shared
  transfer file (`transfer.ts` in `@unisim/sdk`).
- **Opening a file is a copy onto this device.** You choose **Add to what's
  here** or **Replace everything**. Every field in the file is checked before
  it is used ([`src/lib/backup.ts`](src/lib/backup.ts), `parseBackup`).
- **Your PIN is never in a backup file.** It belongs to the device.

Until 20 October 2026 there was an optional encrypted online copy kept against
a Universal ID. It was removed with sign-in; the app no longer reads or writes
it.

---

## What the app talks to a server for, even when your book doesn't

If you open your browser's Network tab you will see requests, and a privacy
page that pretended otherwise would look like a lie.

- **No sign-in, no account, no usage count.** BlackBook has no sign-in
  (`noAccounts` in [`src/main.tsx`](src/main.tsx), since 20 October 2026), so
  nothing is recorded against an account, and with it the suite's anonymous
  daily open count is off too, on the website and in the phone apps alike.
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
2. Add a contact, write a note, filter, export a CSV, save a backup.
3. Watch the list. Your book is never in it.

Or, more conclusively: **turn off your Wi-Fi and use the app anyway.** It keeps
working, because the book was never anywhere else.

---

## If you find this page is wrong

That is worth more to us than it costs. Open an issue on
[the repository](https://github.com/universal-simulation-ltd/Universal_BlackBook/issues).
A claim nobody can correct isn't a guarantee either.

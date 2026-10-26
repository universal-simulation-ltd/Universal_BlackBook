import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-csv-file',
    title: 'What is a CSV file?',
    summary: 'The plain, spreadsheet-shaped file BlackBook uses to import and export.',
    group: 'The basics',
    body: `CSV stands for "comma-separated values". It is about the simplest way there is to store a table: a plain text file where each line is one row, and commas separate the columns.

A tiny address book as a CSV file looks like this when opened in a text editor:

- Name,Email,Phone
- Sam Okonkwo,sam@example.com,07700 900123
- Priya Shah,priya@example.com,

The first line holds the column names. Every line after it is one person. An empty space between two commas simply means that cell is blank. If a value contains a comma of its own, it is wrapped in double quotes so it is not mistaken for the start of a new column.

## Why it is useful

- **Almost everything can read it.** Excel, Numbers, Google Sheets and LibreOffice all open CSV files as a spreadsheet, and most address books can export one.
- **It is readable by people.** There is no hidden formatting, so you can open the file and see exactly what is in it.
- **It does not lock you in.** A CSV export is yours to keep, move or open elsewhere, with or without BlackBook.

## What it cannot do

A CSV file holds text only. It has no pictures, no password and no encryption, so anyone who gets hold of the file can read every name, number and note in it. Keep exported files somewhere you trust, and delete copies you no longer need.

## Dates and spreadsheets

Spreadsheet programs sometimes "helpfully" reformat what they open, turning a birthday or a long phone number into something else. If you edit an export in a spreadsheet before importing it back, check those columns before you save.`,
  },
  {
    id: 'where-your-book-lives',
    title: 'Where your book is kept',
    summary: 'On this device, with no account needed — and what that means for you.',
    group: 'The basics',
    body: `BlackBook keeps your address book on the device you are using. In a web browser it lives in that browser's own storage for this site; in the phone app it lives in the app's own storage. Nothing about your contacts is sent anywhere unless you sign in, which turns on the online backup.

You do not need an account to use BlackBook. Everything works signed out.

## What that means in practice

- **Each device has its own book.** Contacts added on your laptop do not appear on your phone by themselves. The online backup is what joins them up. A backup file is how you move them across.
- **Clearing the browser can clear the book.** Deleting site data or browsing history for this site, using a private window, or uninstalling the app removes the book stored there.
- **Your device's own contacts are separate.** BlackBook does not add to, change or sync with the address book built into your phone.

## Keeping a copy

Because the book on your device may be the only copy, it is worth keeping another:

1. Sign in with your Universal ID. The encrypted online backup then starts by itself.
2. Save a backup file from time to time (Tune, then Backup & export in the phone app; Actions, then Advanced, then Backup & export on the website) and keep it somewhere safe. It holds everything, to-dos included, and can have a password.
3. Or export a CSV file, which any spreadsheet or address book can read but which leaves out your to-dos.

## Tune this app

Choices about how the app looks and behaves on this device, such as which tabs are shown, are kept on this device. A backup file carries them too, but only Replace everything brings them back.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Bringing people in and taking them out',
    summary: 'One Import for contacts, notes, to-dos and backups, and a CSV export.',
    group: 'How it works',
    body: `## One door in, one door out

Everything coming into BlackBook goes through **Import**: Tune, then Import in the phone app, or Actions, then Advanced, then Import on the website. It offers four choices:

- **Contacts**, from a CSV file, and in the phone app from your phone's own contacts.
- **Notes**, from Word, web pages (.html, .htm, .mht), plain text or Markdown files. See Bring your notes from OneNote.
- **To-dos**, from a list in a text, Markdown, spreadsheet or calendar file (below).
- **Restore a BlackBook backup**, which opens a backup file you saved (see Your backup file).

Everything going out is in **Backup & export**: Tune, then Backup & export in the phone app, or Actions, then Advanced, then Backup & export on the website. It saves a backup file and exports a CSV.

## Exporting

Export saves your whole book as a CSV file named with today's date. It has one column each for name, email, tags, notes, birthday, phone, company, and whether a person's birthday or card is hidden, so importing it back restores your contacts as you left them. The file opens in any spreadsheet program. It leaves out your to-dos: for a complete copy, save a backup file instead (see Your backup file).

## Importing a CSV file

Choose Import, then Contacts. You can import a CSV file exported from BlackBook or from another address book. You choose whether to **add** the people in the file to your book or to **replace** your book with them.

BlackBook understands the column names that Google Contacts and Outlook use. For example:

- A "Categories", "Groups" or "Labels" column is read as tags.
- "Mobile", "Telephone" or Google's numbered phone columns are read as the phone number.
- "Organisation" and Google's organisation column are read as the company.

Rows with neither a name nor an email address are skipped.

## Birthdays in a file

Birthdays are accepted as 1990-06-04, 4 June 1990, June 4 or --06-04 (a birthday with no year). A date written as 04/06/1990 is refused on purpose: in the UK that is the 4th of June, in the US the 6th of April, and guessing would be wrong for half the people who use the app.

## From your phone's contacts

In the phone app, you can pick one person from your phone's contacts to fill in a new card, or import your whole phone address book at once with Import, then Contacts. The bulk import skips anyone already in your book, so it is safe to run again later. In Chrome on Android, the browser's contact picker offers the same for a name, an email and a number.

BlackBook only reads your phone's contacts when you ask it to, and never writes anything back to them. The note on your phone's own contact card is not copied across.

## Importing to-dos

Choose Import, then To-dos, to bring in a list you already keep somewhere else. You can pick several files at once, and every file is read on your device; nothing is uploaded.

- **Text and Markdown (.txt, .md).** One to-do a line. Bullets and numbers come off, a ticked box ([x]) comes in done, and lines indented under a to-do become its details. Markdown headings are section names, not jobs, so they are left out.
- **Spreadsheets (.csv, .tsv).** The columns are read by name: Title, Task or Content for the to-do, Notes or Description for its details, Due or Deadline for its date, and Done, Completed or Status for whether it is finished. Todoist's export works as it is; its sections are left out.
- **Calendar files (.ics).** The tasks in the file, with their details, due dates and whether they were done.

Due dates written as 2026-10-25 or 25 October 2026 are read. A date written as 04/06/2026 is left out on purpose, as it is for birthdays: the to-do still comes in, just without a date.

You see what was found before anything is added, and you can swipe any of it out. Importing turns the To-do tab on, so you can see what came in.`,
  },
  {
    id: 'tags-lists-and-hiding',
    title: 'Tags, email lists and hiding people',
    summary: 'Ways to organise your book without deleting anybody.',
    group: 'How it works',
    body: `## Tags

Tags are your own labels, such as Family, Work or Book club. A new book starts with two, Important People and Important Notes. They are ordinary tags: rename, recolour or delete them, and they are never put back. How you file people is up to you. You can make as many as you like, give each one a colour, and put a person under as many tags as fit. The filter shows everyone with any of the tags you choose.

## Email lists

If you turn on email lists in **Tune this app**, you can keep groups of people you email together. A list is a kind of tag. Copying a list gives you a line of names and addresses ready to paste into the To field of Gmail, Outlook or Apple Mail. People without an email address are left out, and an address that appears twice is included once.

## Hiding someone from the list

Swipe a card right on a phone, or use the round button in its corner, to take someone off the main list. They are hidden from browsing, never from searching: type their name and they appear, dimmed, with the same button to bring them back. A drawer at the bottom of the list shows everyone hidden.

## Hiding a birthday reminder

The birthdays view shows everyone with a birthday recorded, soonest first. You can hide a person from that view without deleting the date. Hiding someone from the main list and hiding their birthday are separate choices.

## Deleting

Deleting always asks first and names who is going. On a phone, swiping a card left only uncovers the Delete button; nothing is deleted by the swipe alone. You can also select several people at once to delete, tag or hide them together.`,
  },
  {
    id: 'the-pin-lock',
    title: 'What the PIN lock does, and what it does not',
    summary: 'A 4-digit lock on the app, not encryption of the book.',
    group: 'Privacy and security',
    body: `You can set a 4-digit PIN so that BlackBook asks for it each time it starts on that device: after it has been closed, or the page reloaded. Switching back to it from another app does not ask again. It is meant to keep out someone who picks up your phone or laptop.

## What it protects

- It stops anyone opening the app on this device without the PIN.
- After five wrong tries in a row, the keypad makes you wait before trying again, and the wait doubles each time.
- Your PIN itself is never stored. BlackBook keeps only a scrambled fingerprint of it that is deliberately slow to check, which makes guessing expensive.
- The lock belongs to this device only and is never uploaded.

## What it does not do

The PIN locks the app, not the data. Your book stays in the device's storage exactly as before, so it is not a replacement for your device's own screen lock and passcode. Four digits allow only 10,000 combinations, which is far too few to be a safe encryption key.

## If you forget your PIN

Nobody can tell you your PIN or turn the lock off for you. The only way past a forgotten PIN is "Forgotten your PIN?" on the lock screen, which **erases the book on this device** and starts again, unlocked. That is what makes it safe to offer: a stranger could empty the app, but could never read it.

If you use the encrypted online backup, a forgotten PIN is only an inconvenience: sign in again (and enter your backup passphrase, if you added one), and your book comes back. If you have a backup file, a forgotten PIN is only an inconvenience: after the reset, choose Import, then Restore a BlackBook backup, pick the file and your book comes back. Without one there is nothing to restore from, so save a backup before setting a PIN.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'The encrypted online backup',
    summary: 'How your book is encrypted before it leaves the device, who holds the key, and what a passphrase adds.',
    group: 'Privacy and security',
    body: `The online backup is optional and needs a Universal ID. Signing in turns it on (in the phone app, sign in from Tune, then Account), and from then on BlackBook keeps a copy of your book on UNI·SIM's servers, so it survives a lost device and opens on every device you sign in on. The backup's own settings are in Online backup: Tune, then Account, then Online backup in the phone app, or Actions, then Advanced, then Online backup on the website.

## Encrypted before it leaves

Your book is encrypted on your device before anything is sent, with **AES-GCM and a 256-bit key**, a widely used standard. Who can read the online copy depends on where that key is kept, and that is your choice.

## Without a passphrase (the default)

The key is a random one, kept with your account on UNI·SIM's servers. That is what lets a new device open your book just by signing in. Only your own account can fetch it, but UNI·SIM **could** technically read the online copy, as with most apps that sync.

## With a passphrase

Tick Protect it with a passphrase when you turn the backup on, or choose Add a passphrase in Online backup later. Then nobody but you can read the online copy, UNI·SIM included.

- The key is made from your passphrase, using PBKDF2 with SHA-256 and 600,000 rounds, which makes each guess at it slow and costly, and the key is taken off the server.
- Your passphrase never leaves your device. It is **not** your Universal ID password, and changing your password does not affect it.
- Each of your other devices asks for it once.

This matters because the people in your book never signed up for anything. Their names, addresses and your private notes about them deserve the same care as your own.

## With a passphrase, there is no recovery

UNI·SIM then holds no copy of your key and has no way to reset your passphrase. If you forget it, the online copy cannot be opened by anyone. The book on your device is not affected, which is why the online copy is a backup rather than the main copy.

## Remembering a device

With a passphrase, you can ask a device to remember the key so you are not asked for the passphrase every time. The key is stored in a form that the app can use but cannot copy out. Signing out, or choosing Forget this device, removes it.

## Changing or deleting it

Changing your passphrase, or choosing Remove the passphrase, needs the current one, even on a device that remembers it, and re-encrypts the backup in one step. Removing it puts a random key back with your account, so your devices open the online copy just by signing in again. Turn off and delete the online copy deletes the online copy completely, leaves the book on your device as it is, and stops signing in on that device from turning the backup on again. Deleting your Universal ID deletes the online copy with it.

The backup has a size limit of about 2 MB of encrypted data, which is many thousands of contacts. Very long notes are the usual reason a book reaches it.`,
  },
  {
    id: 'backup-file',
    title: 'Your backup file',
    summary: 'One file with everything in your book, an optional password, and how to open it again.',
    group: 'Privacy and security',
    body: `A backup file is a complete copy of your book in one file. To save one, open Backup & export (Tune, then Backup & export in the phone app; Actions, then Advanced, then Backup & export on the website) and choose Save a backup. On a phone the share sheet opens so you can keep the file in Files, a cloud drive or an email to yourself; in a browser it downloads.

## What is in it

- Every contact, with every field: name, email, phone, company, address, birthday, notes, tags, pins and who is hidden.
- Your tags and email lists.
- Your to-do list.
- Your choices in Tune this app, and the view the list opens on.

Your PIN is not in it. The PIN belongs to the device.

## Protecting it with a password

Your book is about other people, who never signed up for anything, so you can lock the file with a password. Tick Protect with a password before saving.

- The file is encrypted with **AES-GCM and a 256-bit key**, a widely used standard.
- The key is made from your password with PBKDF2, SHA-256 and 600,000 rounds, which makes each guess slow and costly.
- The password is never stored or sent anywhere. Nobody, including UNI·SIM, can open the file without it, and there is no way to reset it.

Without a password the file is plain text, like a CSV export: anyone who gets hold of it can read it.

## Opening a backup

Choose Import, then Restore a BlackBook backup (Tune, then Import in the phone app; Actions, then Advanced, then Import on the website). Choose Open a backup and pick the file, or drop it onto the window in a browser. If it has a password, you are asked for it. Then choose:

- **Add to what's here.** Everything already on this device stays. People and to-dos from the file are added, and if one is in both, the copy edited last is kept. Someone already here with the same name and the same email or phone number is not added twice, and tags with the same name become one tag.
- **Replace everything.** The book on this device is swapped for the one in the file, after you confirm.

BlackBook checks every field in a file before using it, so a damaged or edited file cannot break the app.`,
  },
  {
    id: 'using-two-devices',
    title: 'Using BlackBook on more than one device',
    summary: 'Merging when you sign in, automatic saving, and what happens when two devices disagree.',
    group: 'Privacy and security',
    body: `With the online backup on, you can open the same book on your phone, tablet and computer. Each device keeps its own copy and the online backup keeps them in step.

## Signing in on a new device

1. Sign in with your Universal ID (in the phone app, from Tune, then Account).
2. If you protected the backup with a passphrase, enter it. Without one, signing in is all it takes.
3. If this device already has contacts or to-dos of its own, such as ones you added before signing in, BlackBook merges them into the online copy and saves it straight away. There is nothing to choose.

When merging, the online copy is the starting point and this device's contacts are added to it. Someone who is already there, matched by the same card or by the same name with the same email or phone number, is not added twice. Tags with the same name become one tag. Merging only ever adds, so someone you deleted on another device can come back from a device that still has them. To take the online copy exactly as it is instead, open Online backup (Tune, then Account, then Online backup in the phone app; Actions, then Advanced, then Online backup on the website) and choose Fetch online copy.

## Saving

While the backup is on, each change is encrypted and saved online a few seconds after you make it. The word "Syncing" beside the title shows a save is on its way. When you open BlackBook on another device, it fetches the newer copy.

## When two devices disagree

The online copy is saved as a whole book. If two devices have both changed the book since they last saved, BlackBook does not quietly pick one. It stops and asks which to keep: the newer online copy, or this device's version. The one you do not choose is replaced, so export a CSV file first if you are unsure.

## After a passphrase change

When you add or change the passphrase on one device, your other devices stop saving and ask for it once. Nothing on them is lost, and when you unlock them their contacts are merged back in. A device still holding the old key cannot write over the change. When you remove the passphrase, your other devices open the online copy again by themselves.

## Moving your book without an account

1. On the device that has your book, save a backup file from Backup & export. A password is a good idea if the file will pass through email or a cloud drive.
2. Get the file onto the other device, for example with AirDrop, a cloud drive or email.
3. On the other device, open BlackBook, choose Import, then Restore a BlackBook backup, and pick the file.

If the other device is new, choose Replace everything. If it already has people of its own, choose Add to what's here and the two books are merged.`,
  },
  {
    id: 'notes-from-onenote',
    title: "Bring your notes from OneNote",
    summary: "Export pages from OneNote, then import the files into Notes.",
    group: "How it works",
    body: `BlackBook cannot open a OneNote notebook itself, but it reads the files OneNote exports. Everything is read on your device; nothing is uploaded.

## OneNote for Windows

1. Open the page or section you want to bring across.
2. Choose **File** ▸ **Export**.
3. Under **Export Current**, choose **Page** or **Section**.
4. Under **Select Format**, choose **Word Document** (.docx), or **Single File Web Page** (.mht) if Word is not offered.
5. Choose **Export** and save the file.

A whole notebook cannot be exported to Word: export it a section at a time.

## OneNote on a Mac or on the web

Microsoft says OneNote for Mac and OneNote for the web cannot export pages yet. Open the notebook in OneNote for Windows (on the web: **Editing** ▸ **Open in Desktop App**), or copy one page at a time: select everything on the page, copy it, paste it into a plain text or Word document, and save that.

## Importing into BlackBook

Choose **Import** ▸ **Notes**: in the phone app, Import is in **Tune**; on the website, in **Actions** ▸ **Advanced**. You can pick several files at once: Word (.docx), web pages (.html, .htm, .mht), plain text (.txt) and Markdown (.md).

- A Word file holding several OneNote pages becomes one note per page, split at each page title.
- Each note's title is the page title, else its first heading, else the file's name.
- The text comes across as plain text: paragraphs and lists are kept; formatting, pictures, drawings and attachments are not.
- When OneNote wrote the page's date under its title, that becomes the note's date.

You see what was found before anything is added, and you can swipe any of it out. Importing turns the Notes tab on.`,
  },
]

export default articles

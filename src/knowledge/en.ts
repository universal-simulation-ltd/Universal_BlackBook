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
    body: `BlackBook keeps your address book on the device you are using. In a web browser it lives in that browser's own storage for this site; in the phone app it lives in the app's own storage. Nothing about your contacts is ever sent anywhere.

There is no account and nothing to sign in to.

## What that means in practice

- **Each device has its own book.** Contacts added on your laptop do not appear on your phone by themselves. A backup file is how you move them across.
- **Clearing the browser can clear the book.** Deleting site data or browsing history for this site, using a private window, or uninstalling the app removes the book stored there.
- **Your device's own contacts are separate.** BlackBook does not add to, change or sync with the address book built into your phone.

## Keeping a copy

Because the book on your device may be the only copy, it is worth keeping another:

1. Save a backup file from time to time (Advanced, then Backup, import & export) and keep it somewhere safe. It holds everything, to-dos included, and can have a password.
2. Or export a CSV file, which any spreadsheet or address book can read but which leaves out your to-dos.

## Tune this app

Choices about how the app looks and behaves on this device, such as which tabs are shown, are kept on this device. A backup file carries them too, but only Replace everything brings them back.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Bringing people in and taking them out',
    summary: 'CSV import and export, and picking people from your phone’s contacts.',
    group: 'How it works',
    body: `## Exporting

Export saves your whole book as a CSV file named with today's date. It has one column each for name, email, tags, notes, birthday, phone, company, and whether a person's birthday or card is hidden, so importing it back restores your contacts as you left them. The file opens in any spreadsheet program. It leaves out your to-dos: for a complete copy, save a backup file instead (see Your backup file).

## Importing a CSV file

You can import a CSV file exported from BlackBook or from another address book. You choose whether to **add** the people in the file to your book or to **replace** your book with them.

BlackBook understands the column names that Google Contacts and Outlook use. For example:

- A "Categories", "Groups" or "Labels" column is read as tags.
- "Mobile", "Telephone" or Google's numbered phone columns are read as the phone number.
- "Organisation" and Google's organisation column are read as the company.

Rows with neither a name nor an email address are skipped.

## Birthdays in a file

Birthdays are accepted as 1990-06-04, 4 June 1990, June 4 or --06-04 (a birthday with no year). A date written as 04/06/1990 is refused on purpose: in the UK that is the 4th of June, in the US the 6th of April, and guessing would be wrong for half the people who use the app.

## From your phone's contacts

In the phone app, you can pick one person from your phone's contacts to fill in a new card, or import your whole phone address book at once. The bulk import skips anyone already in your book, so it is safe to run again later. In Chrome on Android, the browser's contact picker offers the same for a name, an email and a number.

BlackBook only reads your phone's contacts when you ask it to, and never writes anything back to them. The note on your phone's own contact card is not copied across.`,
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
    body: `You can set a 4-digit PIN so that BlackBook asks for it every time it is opened on that device. It is meant to keep out someone who picks up your phone or laptop.

## What it protects

- It stops anyone opening the app on this device without the PIN.
- After five wrong tries in a row, the keypad makes you wait before trying again, and the wait doubles each time.
- Your PIN itself is never stored. BlackBook keeps only a scrambled fingerprint of it that is deliberately slow to check, which makes guessing expensive.
- The lock belongs to this device only and is never put in a backup file.

## What it does not do

The PIN locks the app, not the data. Your book stays in the device's storage exactly as before, so it is not a replacement for your device's own screen lock and passcode. Four digits allow only 10,000 combinations, which is far too few to be a safe encryption key.

## If you forget your PIN

Nobody can tell you your PIN or turn the lock off for you. The only way past a forgotten PIN is "Forgotten your PIN?" on the lock screen, which **erases the book on this device** and starts again, unlocked. That is what makes it safe to offer: a stranger could empty the app, but could never read it.

If you have a backup file, a forgotten PIN is only an inconvenience: after the reset, open the backup and your book comes back. Without one there is nothing to restore from, so save a backup before setting a PIN.`,
  },
  {
    id: 'backup-file',
    title: 'Your backup file',
    summary: 'One file with everything in your book, an optional password, and how to open it again.',
    group: 'Privacy and security',
    body: `A backup file is a complete copy of your book in one file. To save one, open Actions, then Advanced, then Backup, import & export, and choose Save a backup. On a phone the share sheet opens so you can keep the file in Files, a cloud drive or an email to yourself; in a browser it downloads.

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

Choose Open a backup and pick the file, or drop it onto the window in a browser. If it has a password, you are asked for it. Then choose:

- **Add to what's here.** Everything already on this device stays. People and to-dos from the file are added, and if one is in both, the copy edited last is kept. Someone already here with the same name and the same email or phone number is not added twice, and tags with the same name become one tag.
- **Replace everything.** The book on this device is swapped for the one in the file, after you confirm.

BlackBook checks every field in a file before using it, so a damaged or edited file cannot break the app.`,
  },
  {
    id: 'using-two-devices',
    title: 'Using BlackBook on more than one device',
    summary: 'Moving your book between devices with a backup file.',
    group: 'Privacy and security',
    body: `BlackBook has no account and no online copy, so each device keeps its own book and nothing joins them up behind your back. To take your book to another device, use a backup file.

## Moving your book

1. On the device that has your book, save a backup file. A password is a good idea if the file will pass through email or a cloud drive.
2. Get the file onto the other device, for example with AirDrop, a cloud drive or email.
3. On the other device, open BlackBook, choose Open a backup and pick the file.

If the other device is new, choose Replace everything. If it already has people of its own, choose Add to what's here and the two books are merged.

## Keeping two devices in step

There is no automatic syncing. If you add people on both devices, save a backup on one and open it on the other with Add to what's here: nobody is added twice, and the copy edited last wins. Merging only ever adds, so someone you deleted on one device can come back from a backup that still has them.

## Why there is no sign-in

An address book holds other people's names and numbers, and your notes about them. Keeping it only on your own devices, and moving it in a file you control, means there is no copy of it on anyone's server.`,
  },
]

export default articles

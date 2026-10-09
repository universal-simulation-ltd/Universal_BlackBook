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
    body: `BlackBook keeps your address book on the device you are using. In a web browser it lives in that browser's own storage for this site; in the phone app it lives in the app's own storage. Nothing about your contacts is sent anywhere unless you turn on the online backup.

You do not need an account to use BlackBook. Everything works signed out.

## What that means in practice

- **Each device has its own book.** Contacts added on your laptop do not appear on your phone by themselves. The online backup is what joins them up.
- **Clearing the browser can clear the book.** Deleting site data or browsing history for this site, using a private window, or uninstalling the app removes the book stored there.
- **Your device's own contacts are separate.** BlackBook does not add to, change or sync with the address book built into your phone.

## Keeping a copy

Because the book on your device may be the only copy, it is worth keeping another:

1. Export a CSV file from time to time and keep it somewhere safe, or
2. Sign in with your Universal ID and turn on the encrypted online backup.

## Tune this app

Choices about how the app looks and behaves on this device, such as which tabs are shown, are kept on this device only and are not part of the backup.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Bringing people in and taking them out',
    summary: 'CSV import and export, and picking people from your phone’s contacts.',
    group: 'How it works',
    body: `## Exporting

Export saves your whole book as a CSV file named with today's date. It has one column each for name, email, tags, notes, birthday, phone, company, and whether a person's birthday or card is hidden, so a backup restores the book as you left it. The file opens in any spreadsheet program.

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

Tags are your own labels, such as Family, Work or Book club. A new book starts with none, because how you file people is up to you. You can make as many as you like, give each one a colour, and put a person under as many tags as fit. The filter shows everyone with any of the tags you choose.

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
- The lock belongs to this device only and is never uploaded.

## What it does not do

The PIN locks the app, not the data. Your book stays in the device's storage exactly as before, so it is not a replacement for your device's own screen lock and passcode. Four digits allow only 10,000 combinations, which is far too few to be a safe encryption key.

## If you forget your PIN

Nobody can tell you your PIN or turn the lock off for you. The only way past a forgotten PIN is "Forgotten your PIN?" on the lock screen, which **erases the book on this device** and starts again, unlocked. That is what makes it safe to offer: a stranger could empty the app, but could never read it.

If you use the encrypted online backup, a forgotten PIN is only an inconvenience: sign in again, enter your backup passphrase, and your book comes back. Without the backup there is nothing to restore from, so turn it on, or export a CSV file, before setting a PIN.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'The encrypted online backup',
    summary: 'How your book is encrypted before it leaves the device, and why nobody else can read it.',
    group: 'Privacy and security',
    body: `The online backup is optional and off until you sign in with your Universal ID. Once it is on, BlackBook keeps a copy of your book on UNI·SIM's servers so it survives a lost device and can be opened on another one.

## Encrypted before it leaves

Your book is encrypted on your device before anything is sent. The server receives and stores only scrambled data that it has no key for, so UNI·SIM cannot read your contacts, notes, tags or to-dos.

- The encryption is **AES-GCM with a 256-bit key**, a widely used standard.
- The key is made from a **passphrase you choose**, using PBKDF2 with SHA-256 and 600,000 rounds, which makes each guess at the passphrase slow and costly.
- Your passphrase never leaves your device. It is **not** your Universal ID password, and changing your password does not affect it.

This matters because the people in your book never signed up for anything. Their names, addresses and your private notes about them deserve the same care as your own.

## There is no recovery

UNI·SIM holds no copy of your key and has no way to reset your passphrase. If you forget it, the online copy cannot be opened by anyone. The book on your device is not affected, which is why the online copy is a backup rather than the main copy.

## Remembering a device

You can ask a device to remember the key so you are not asked for the passphrase every time. The key is stored in a form that the app can use but cannot copy out. Signing out, or choosing Forget this device, removes it.

## Changing or deleting it

Changing your passphrase needs the current one, even on a device that remembers it, and re-encrypts the backup in one step. Turning the backup off deletes the online copy completely and leaves the book on your device as it is. Deleting your Universal ID deletes the online copy with it.

The backup has a size limit of about 2 MB of encrypted data, which is many thousands of contacts. Very long notes are the usual reason a book reaches it.`,
  },
  {
    id: 'using-two-devices',
    title: 'Using BlackBook on more than one device',
    summary: 'Merging when you sign in, automatic saving, and what happens when two devices disagree.',
    group: 'Privacy and security',
    body: `With the online backup on, you can open the same book on your phone, tablet and computer. Each device keeps its own copy and the online backup keeps them in step.

## Signing in on a new device

1. Sign in with your Universal ID.
2. Enter your backup passphrase.
3. If this device already has contacts or to-dos of its own, such as ones you added before signing in, BlackBook merges them into the online copy and saves it straight away. There is nothing to choose.

When merging, the online copy is the starting point and this device's contacts are added to it. Someone who is already there, matched by the same card or by the same name with the same email or phone number, is not added twice. Tags with the same name become one tag. Merging only ever adds, so someone you deleted on another device can come back from a device that still has them. To take the online copy exactly as it is instead, open Actions, then Advanced, then Online backup, and choose Fetch online copy.

## Saving

While the backup is on, each change is encrypted and saved online a few seconds after you make it. The word "Syncing" beside the title shows a save is on its way. When you open BlackBook on another device, it fetches the newer copy.

## When two devices disagree

The online copy is saved as a whole book. If two devices have both changed the book since they last saved, BlackBook does not quietly pick one. It stops and asks which to keep: the newer online copy, or this device's version. The one you do not choose is replaced, so export a CSV file first if you are unsure.

## After a passphrase change

When you change the passphrase on one device, your other devices stop saving and ask for the new passphrase. Nothing on them is lost, and when you unlock them their contacts are merged back in. A device still holding the old key cannot write over the change.`,
  },
]

export default articles

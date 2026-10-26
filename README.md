# Universal BlackBook

**A private address book.** The people worth staying in touch with — under your
own tags, and never a birthday missed.

**→ [opensource.unisim.co.uk/blackbook](https://opensource.unisim.co.uk/blackbook)**

Part of the [Universal Apps](https://opensource.unisim.co.uk) suite by UNI·SIM.
Free, open source (AGPL-3.0), and no account required.

---

## What it does

Five fields, and nothing you didn't ask for:

| Field | |
|---|---|
| **Name** | |
| **Email** | |
| **Phone** | Kept exactly as you type it. Search folds the punctuation out, so `07700900123` finds `+44 (0)7700 900123` — nothing is reformatted, because every scheme for tidying a number needs a country to assume. |
| **Notes** | Free text, and it sits right under the name and number — it is usually the reason you opened the form. Whatever you'd actually want to remember. |
| **Birthday** | **The year is optional.** Half the birthdays in anybody's address book are "the 4th of June, no idea what year" — so a day and a month on their own are a complete answer, not a half-filled one. |
| **Tags** | Entirely your own, and last in the form because they are a decision rather than a fact. **A new book starts with two, Important People and Important Notes**, which you can rename, recolour or delete like any other; they are never put back. (Two rather than six, because six invented starters are an app telling you how it thinks you should file your friends.) Make as many as you like, in any of seven colours and, since 2026-10-25, a **pattern** (dots, stripes, a star, rings or checks) drawn in that colour, so two tags of one colour can be told apart by shape, colour-blind or not (Tags ▸ under each tag's colours; shown on every chip, card light and filter). Put a person in as many as fit. |

Search across names, emails, phone numbers, notes and birthdays (typing `june`
finds everyone born in June). Everything else — the birthdays view, the order,
and the tag filter — sits behind one **⚙️ Filters** button beside the search
box, so the search field is the whole row. On a phone that row is **folded
away above the list**: pull down from the top of the page to bring it out, and
pull down again to start typing, keyboard up. Scroll it out of sight and it
folds away again (unless you've typed a search). Tapping the Contacts tab while
you're on it opens it too, and keyboard and screen-reader users get a "Search
contacts" button in its place. While it's folded, a filtered or reordered list
says so under the title.

## Birthdays

A view of its own, one tap from the search box: everybody with a birthday
recorded, **soonest first**, each one saying how long you have — *Today*,
*Tomorrow*, *in 12 days* — and, when you know the year, the age they are about
to turn. Every card opens the contact behind it, because being told it is
somebody's birthday in nine days is only useful next to their email address and
the note about their kids.

It shows only people whose birthday you have. A list padded out with everyone
who has none is a worse answer to "whose birthday is coming up" than a short
list is.

**There is no nagging.** BlackBook does not track when you last spoke and does
not tell you who is overdue. That is a deliberate line — the moment an address
book starts issuing tasks, it stops being an address book, and people stop
opening it. The birthdays view is the one exception, and only because a
birthday is a fact about a date rather than a judgement about you.

**Anyone can be hidden from that list** — swipe their card right on a phone, or
use the ◎ button in the corner of it anywhere. It hides the reminder, not the birthday: the date stays on the contact,
and a "N hidden from this list" drawer at the bottom of the birthdays view puts
them back. Deleting the date would have been the other way to stop the yearly
reminder, and it is the one thing you cannot undo. It survives an export — the
CSV carries a `Hide birthday` column, and the online copy and the backup file
carry every field — so restoring gives back the list you had rather than one
with everybody put back.

## Hiding somebody from the list

**Swipe a card right** on a phone, or use the ◎ button in its corner anywhere,
and that person drops out of the main list — the plumber, the landlord, the
person you contact once a year and would rather not scroll past every time.

**They are hidden from browsing, never from searching.** Type their name and
they are right there, dimmed, with the same control to put them back. A "N
hidden from this list" drawer at the bottom of the list does the same. That is
what makes this different from deleting them, and what stops it being a way to
lose people quietly.

It is **independent of hiding a birthday**: somebody tidied off the main list
still has their birthday counted down, because clutter and reminders are two
different complaints.

## Deleting somebody

**On a phone, swipe a card left** and a Delete button appears behind it. Tapping
it asks first, by name — the swipe only ever uncovers the button, because a
flick that deletes outright is one thumb away from losing something this app
holds the only copy of.

**Swipe the other way to hide somebody** — from the main list, or from the
birthdays list if that is the view you are in — and the same right-swipe puts
them back. One direction, one meaning: whether they are in the list you are
looking at.

Everywhere else — and with a keyboard or a screen reader anywhere — Delete is
where it has always been: inside the contact's own form, behind the same
confirmation.

**Several at once:** Select, above the list, turns every card into a tick box.
Tick the people you want, then Delete, Tag (adds tags to all of them) or Hide /
Show. Delete asks first and names who is going. Only people still on screen are
acted on — narrow the filter after ticking and the ones filtered out are left
alone.

**Everything at once:** Actions ▸ Advanced ▸ **Delete all data** clears this
device completely: every contact, tag, list and to-do, the PIN, your settings
and the remembered vault key. You type `DELETE` to confirm, and BlackBook
reopens as a new book (with its two starting tags). It sits just below Backup,
import & export, so you can save a backup file first.

> **Your online copy is never deleted.** The dialog says whether one exists. If
> it does, only this device is cleared, and signing in (plus the passphrase,
> if you added one) brings the book back. If it does not, only a backup file you saved
> can.

## New contact opens straight on the person

**New contact** (the phone's + ▸ New contact, the website's Add new), **Add “…”**
over search results, and **From my contacts** all make the person at once and
open their clean view, not the full form (James, 2026-10-25): type the name at
the top, add a number or an email from the buttons (Call / Message / ⋯), tap the
note to write, and **Fine-tune** for tags, birthday and the rest. A new contact
closed with nothing typed into it is not kept.

## Adding somebody lands you on their tags

Save a new contact tagged Family and Work and the list switches to Family-or-Work,
with them in it. Save one with no tags while a tag filter is on and the filter is
dropped, so the person you just added is never saved out of sight. Editing
somebody leaves the view alone.

## Writing in a note without opening the form

Open somebody and **tap the words of their note** to type straight into it. The
cursor goes to the end, so adding today's entry under the last one is one tap.
Links in the note keep working: tapping a link opens it and does not start
typing, and just opening somebody never brings the keyboard up. The note saves
as you type, so you can close the person straight away. **Fine-tune** (beside Close)
opens the full form for everything else.

## Notifications (reminders)

On a contact's view, **⋯ ▸ Add notification**: a few words ("Anniversary"), a
date and a time, and **Once**, **Every month** or **Every year** (James,
2026-10-25). The person's view lists their notifications, each with its next
time and an ✕ to remove it. Notes have the same (see Notes).

- **The phone app** schedules them as the phone's own notifications
  (`@capacitor/local-notifications`, nothing sent to any server): asked for
  permission the first time you add one, rebuilt whenever one changes and
  whenever the app comes to the front (a repeating one is scheduled a few
  occurrences ahead: 6 months, 2 years). Tapping one opens the person. **What a
  notification says is private by default:** "BlackBook · You have a
  reminder". Tune ▸ **Show names in notifications** (off to start) puts the
  name and the words on it. On Android a notification may arrive a few minutes
  late: the exact-alarm permission is removed, as Play keeps it for alarm apps.
- **The website** cannot notify, so a reminder that has gone off shows at the
  top of the app while it is open, with **Open** and **Done** (the phone shows
  the same, for anything that went off while notifications were off).
- A monthly one on the 31st falls on the last day of a shorter month; a yearly
  one on 29 February on the 28th. Only times after you made it count, so an
  anniversary added in July for June waits for next June.
- They are part of the contact: in the online copy and the backup file
  (schema 3).

## To-do

A **To-do** tab sits beside Contacts from the start (Tune this app ▸ **Hide the To-do tab** puts it away): a name,
details, a deadline and your tags — the same tags your contacts use. Open ones
sort by deadline (overdue first, in red), then a "done" drawer. Adding a tagged
to-do filters the tab to its tags, as contacts do. To-dos live on this device and
go into the encrypted online backup and the backup file with the rest of the
book (the CSV leaves them out). Hiding the tab keeps the list. Search it from the box above the list (pulled
down on a phone); what you type is offered as "Add “…”", a new to-do with that
title.

**Your own order, pins and swipes** (James, 2026-10-25). Tap and hold a to-do
and drag it to a new place (on the website, drag the ⋮⋮ grip at its edge); the
order is saved on the to-dos, so it syncs and goes in the backup file. Swipe a
to-do right to **Pin** it (pinned ones stay at the top) and left to **Delete** it,
with **Undo** for six seconds. To-dos you have never dragged keep the deadline
order and sit above the ones you have arranged, so a new one shows at the top.
Every gesture has a button too, for VoiceOver, TalkBack and the keyboard: Move
up, Move down, Pin and Delete on each row (shown when focused), and Alt+↑ /
Alt+↓ on the website.

## Notes

A **Notes** tab sits beside Contacts from the start (Tune this app ▸ **Hide the Notes tab** puts it away): notes of your own,
each a title and the details, newest edited first. Tap one to open it; it saves
itself as you close it, and an empty new note is not kept. Search them from the
box above the list (pulled down from the top on a phone, like the contacts'); what you
type is offered as "Add “…”", a new note with that title. The Lists tab (Email lists) has the same search and Add row.
They travel with everything else: the online backup and the backup file
(schema 2 since Notes; an older file opens with no notes, and a newer file in an
older version of the app is refused rather than opened without its notes).
Hiding the tab keeps the notes. To-do and Notes on, Email lists off, are the
defaults since 2026-10-23; the tick boxes say "Hide …" so they still start unticked,
and a device that never touched the old switches gets the new defaults.

### Every deletable list swipes (suite rule, 2026-10-25)

BRANDING.md ▸ "A deletable row swipes": every list whose items can be deleted
swipes LEFT to delete (with **Undo**, six seconds) and RIGHT for its own second
action, with the same jobs as buttons on focus for VoiceOver, TalkBack and the
keyboard. All of it is `src/components/SwipeActions.tsx` (`SwipeGroup`,
`SwipeItem`, `useUndo`, `UndoBar`, `FocusActions`).

| List | Swipe left | Swipe right |
|---|---|---|
| Contacts (and the hidden-people / hidden-birthdays drawers) | Delete, with Undo (was: a confirm) | Hide / Show (as before) |
| To-do (open) | Delete, with Undo | Pin / Unpin |
| To-do (done) | Delete, with Undo | Not done |
| Notes | Delete, with Undo | Pin / Unpin (hold to select) |
| Lists (Email lists) | Delete the list (people stay), with Undo | Copy its email addresses |
| A list's people | Take off the list, with Undo | Email them |
| Tune ▸ Tags | Delete, with Undo (puts it back on everyone) | Rename |
| Tune ▸ Note templates | Delete, with Undo (puts the notes' fields back) | Edit |
| A template's fields | Remove, with Undo | Move up |
| A contact's or note's notifications | Delete, with Undo | Edit |
| A contact's linked notes | Unlink, with Undo | Pin / Unpin the note |
| A note's linked people (now rows, not chips) | Unlink, with Undo | Call (or Email) |
| Notes ▸ Import preview | Leave out, with Undo | (none) |

**Hold to select** (same day): in every one of these lists a still finger for
half a second selects the row and opens a bar with "N selected", Select all and
the list's bulk actions (Contacts: Tag, Hide/Show, Delete; To-do: Pin, Done,
Delete; done To-dos: Not done, Delete; Notes: Pin/Unpin, Copy, Delete; Lists:
Copy emails, Delete; a list's people: Take off; Tags, Note templates and
notifications: Delete; template fields: Remove; linked notes: Pin, Unlink;
linked people: Unlink; import preview: Leave out). Done, Android's back or a
swipe in from the left edge leaves. In To-do a hold that moves drags instead.
Every row has a Select button on focus, and Shift-click ticks a run on the
website. `useHold`, `useHoldSelect`, `useLeaveSelection` and `SelectBar` in
`SwipeActions.tsx`.

The confirmations that stay are the ones a person reaches on purpose: Delete
in a contact's or note's form, a list's own Delete (which can take its people
with it), and the bulk Delete of a selection.

### Pinning, deleting and selecting notes

The Notes list has To-do's swipes (James, 2026-10-25; the same code,
`src/components/SwipeActions.tsx`): swipe a note right to **Pin** it (pinned notes
sit at the top, latest pin first, with a pin mark; swipe again to Unpin) and
left to **Delete** it, with **Undo** for six seconds. **Hold** a note to select it;
further taps add or remove notes, and a bar offers Select all, **Pin / Unpin**,
**Copy** (each note's title and text, a blank line between) and **Delete** (one
confirmation, then Undo). Done, Android's back or a swipe in from the left edge
leaves selection. A sideways move is the swipe, an up-and-down move the scroll,
a still finger the hold, so the three never fight. On the website, **Select**
above the list does the same and Shift-click selects a run; on every row,
Select, Pin and Delete are buttons for VoiceOver, TalkBack and the keyboard. It
works within the template filter and search, pinned first. A pin is part of the
note: the online copy and the backup file (schema 3; older files have none).

### A note's own view

Tapping a note opens it the way a contact opens (James, 2026-10-25): the title
in the bar with **Fine-tune** (the form: title, text, Delete), then a row of
**Link to contact**, **Link to location**, **Add notification** and **Copy**,
then what the note holds. The text is tapped into, as on a contact.

- **Link to contact** ticks people in the book; they show as chips that open the
  person, and the person's view lists its **Linked notes**.
- **Link to location** is a place name, an address and, if you have them,
  coordinates (`51.5007, -0.1246`). **Open in Maps** hands it to the phone's own
  maps (Apple Maps on an iPhone, the `geo:` handler on Android) or
  OpenStreetMap on the website. No map service of our own.
- **Add notification** is the contacts' reminders (see Notifications).
- A new note opens on its view once its form is closed.

All of it is part of the note: in the online copy and the backup file (schema 3).

### Note templates

A **template** is a kind of note with fields of its own (James, 2026-10-25,
chosen over custom tabs): a name and a few fields, each **text**, a **date**, a
**number** or a **link**. A book starts with one example, **Book** (Title,
Author, Date read), which can be changed or deleted like any other. **New note**
(+, or Add new) then asks: **Plain note** or one of the templates. A templated
note shows its fields neatly at the top of its view and in its form, takes its
title from its first text field if left without one, and the Notes tab gets a
row of **All · Book · …** to show one kind at a time (a row that scrolls shows
it: the SDK's `useScrollHint`). Search looks in the fields' values too.

Templates are managed in Tune this app ▸ **Note templates** (Tune ▸ Your book on
the phone). Taking a field out of a template, or deleting a template, moves what
the notes had in it into their text, so nothing typed is lost. Templates are
part of the book: the online copy and the backup file (schema 3) carry them;
an older backup file, which has none, leaves this device's alone.

### Importing notes (from OneNote and elsewhere)

Notes ▸ **Import** takes several files at once: Word (`.docx`), web pages
(`.html`, `.htm`, and OneNote's Single File Web Page `.mht`), plain text
(`.txt`) and Markdown (`.md`). Each is read **on the device** and nothing is
uploaded; you see what was found (and which files were skipped, and why)
before anything is added. One note per file, except a Word file holding
several OneNote pages, which is split at each page title (the Title style,
else Heading 1, else page breaks). The title is the page title, else the first
heading, else the file name; the text is plain, with paragraphs and lists
(as "• …") kept; when OneNote wrote the page's date under its title (in any
suite language), it becomes the note's date. The help article **Bring your
notes from OneNote** has the export steps. The `.docx` reader is
[fflate](https://github.com/101arrowz/fflate) (MIT) to unzip plus a small XML
scanner of our own (`src/lib/noteImport.ts`).

### Locations in parts, with real place lists (offline)

A note's **Link to location** and a contact's **Address** are Place (notes:
optional, "Mum's"), Street, City, County, Country (James, 2026-10-25) —
`src/lib/geo.ts`, `src/components/LocationFields.tsx`. Country starts as this
device's (its language region). City, County and Country suggest from real
lists while you type, narrowed by the country (and county for towns); picking
a town fills its county and country; anything not in a list is kept as typed.
The County box is called what the country calls it: County (UK, Ireland),
State, Province or Region. **No coordinates are stored**: the first location
shape (a place name, an address and latitude/longitude) is read in as Place and
Street, coordinates dropped. A contact keeps `address` as the text of its parts,
so CSV, sharing, search and older builds see the whole address. Backup file
schema 4.

The lists are GeoNames' (CC BY 4.0, credited in THIRD-PARTY-NOTICES and About):
252 countries (named in the language on screen by the browser's own
`Intl.DisplayNames`), 4,193 divisions (the UK's counties are GeoNames' second
level), and the 69,960 towns of 5,000 people or more. `scripts/geo-build.mjs`
builds them into `public/geo/`: **2.2 MB as files (cities.tsv 2.1 MB), about
1.1 MB compressed**, fetched from the app's own files only when a location form
(or the map) opens — never in the main bundle, never from anyone else.

**Fill in my current location** (Tune this app, off to start): a new note's
location and a new contact's address start at the town the device is nearest
to. The device is asked for its position once (coarse: `@capacitor/geolocation`
on the phone, `navigator.geolocation` on the website; permission is asked only
when the setting is ticked, and a refusal unticks it), the nearest town is found
in the bundled list on the device, City / County / Country are filled in, and
the position is forgotten. Nothing is sent anywhere and no coordinates are
stored. iOS: `NSLocationWhenInUseUsageDescription` in 8 languages
(`ios/App/App/*.lproj/InfoPlist.strings`); Android: `ACCESS_COARSE_LOCATION` only.

### The map

**Map** (the map icon in the phone's top bar on Contacts and Notes; a Map
button on the website) shows contacts and notes by town: a pin per town with
how many are there, placed at the town's position from the bundled list (no
coordinates are stored, so town-level is the precision). Tap a pin for a sheet
of who and what is there; filter by Contacts / Notes, tag and template (a row
that scrolls). MapLibre GL JS (BSD-3-Clause) draws OpenFreeMap's free tiles
(no key, no account; positron for Light, dark for Dark), credited on the map.
**Both load only when the map is opened**: MapLibre is its own chunk (1.06 MB,
285 kB compressed; not precached by the service worker), and the tile server
is first contacted then. PRIVACY.md and About say so. The website's
Content-Security-Policy allows `https://tiles.openfreemap.org` for it.

## Locking the app

**🔓 Lock with PIN** (🔒 **PIN lock on** once a PIN is set), beside the page title, and
Tune ▸ **PIN lock** on the phone. Tap it to set a 4-digit PIN, and BlackBook asks
for it each time it starts on that device (after it has been closed, or the page
reloaded; switching back to it from another app does not ask again). Setting the
PIN says so and leaves the app open. Tap it again (with the PIN) to take the lock
off. There is no "lock now", no PIN change (turn it off and on) and no Face ID /
fingerprint unlock. Five wrong tries in a row and the keypad
starts making you wait, doubling each time.

> **It locks the app, not the data.** The book stays in this browser's storage
> exactly as it was: the PIN keeps out somebody who picks up your phone, and it
> is not encryption. Encrypting a book under four digits would be theatre —
> 10,000 candidates is not a key — and it would put the only copy behind a
> number you can forget. The PIN itself is never stored; what is stored is a
> PBKDF2-SHA-256 digest of it with a per-device salt, which is what makes
> guessing it cost ~300ms a go. The lock is per device and is never uploaded
> or put in a backup file.

**If you forget it: "Forgotten your PIN?" on the lock screen erases this
device's book and starts it over, unlocked.** Nobody can tell you your PIN and
nobody can turn the lock off for you.

> ⚠️ **The reset takes the book with it, and that is what makes it safe to
> offer.** A reset that only cleared the PIN would be a bypass — anybody holding
> the phone could use it, and the lock would protect nobody. So the door opens
> and the room behind it is emptied: the contacts, the tags, the PIN, and the
> remembered vault key all go, which means getting the book back afterwards
> costs a Universal ID sign-in (**and** the vault passphrase, if it has one).
> A stranger can destroy your book this way; they can never read it.
>
> **So turn the online copy on, or save a backup file, before you set a PIN.**
> With a vault, forgetting your PIN is an inconvenience — sign in (and enter
> the passphrase, if you added one), and the book comes back; with a backup file, reset and open it.
> Without either, the reset screen says so in as many words, and it is the
> truth: there is nothing to restore from.

## Where your book lives

In your browser (IndexedDB), on the device you typed it into. There is no
account, no server and no telemetry about its contents.

Ways to get it out or move it elsewhere: sync with your Universal ID across
devices (optional, the encrypted online copy below), or a backup file; and a
CSV for any other address book. The file ones are under Actions ▸ Advanced ▸
**Backup, import & export**.

**A backup file** — **Save a backup** writes everything (every contact with
every field, tags and lists, to-dos, your Tune this app choices and the view
the list opens on) into one `blackbook-backup-YYYY-MM-DD.json`: a download in a
browser, the share sheet on a phone. **Open a backup** (or drop the file on the
window) asks **Add to what's here** or **Replace everything** (which confirms).
Adding matches people and to-dos by id and keeps the copy edited last; the same
person under a different id (name plus email or phone) is never added twice,
and tags of the same name become one, so opening the same backup twice adds
nothing. This is how a book moves to another device or is kept safe without an
account. Signed in with the online copy on, what a backup brings in is synced
like any other edit.

> **Optional password.** Tick **Protect with a password** (off by default) and
> the file is encrypted on the device with AES-256-GCM under a PBKDF2-SHA-256
> key (600,000 iterations): the people in a BlackBook never signed up for
> anything, so a file that might pass through email or a cloud drive deserves
> it. The password is never stored or sent. ⚠️ There is no recovery: forget it
> and nobody can open the file.
>
> The file is the suite's transfer file (`packTransfer` / `readTransfer` in
> `@unisim/sdk`, product `blackbook`, kind `backup`, schema 1), and every field
> in it is checked before use (`parseBackup` in `src/lib/backup.ts`: types,
> lengths, array caps, ids, dates, swatch colours), because anyone can edit one.

**CSV** — a plain `Name, Email, Tags, Notes, Birthday, Phone, Hide birthday,
Hide from list, Company, Address` file.
Opens in any spreadsheet and imports straight back. It is the way out to (and
in from) other address books; it leaves out the to-dos, so the backup file is
the complete copy.

The importer reads the column names Google Contacts and Outlook use — a
`Categories`, `Groups` or `Labels` column all count as tags, and `Mobile`,
`Telephone` or Google's `Phone 1 - Value` all count as the number, and
`Organisation` or Google's `Organization 1 - Name` as the company, and
`Postal address` or Google's `Address 1 - Formatted` as the address — and takes
birthdays as `1990-06-04`, `4 June 1990`, `June 4` or `--06-04`. It deliberately
**refuses** `04/06/1990` rather than guessing — that is the 4th of June to a
British reader and the 6th of April to an American one, and an address book that
silently picks one is wrong for half its users with nothing on screen to say
so.

**Your phone's own contacts** *(the iPhone app)* — **From my contacts** opens
the system picker, and the person you choose arrives in the Add form with their
name, email, number, postal address and birthday already filled in, ready for the part that is
actually yours. **Advanced ▸ Backup, import & export ▸ Import my phone contacts** does the whole
address book at once, skipping anybody already in your book so you can run it
again whenever you add someone to your phone.

**Linked to a phone contact** *(the phone app)* — Fine-tune ▸ **Link to a phone
contact** picks one from the phone's contacts (someone added with From my
contacts is linked from the start). The form then shows "Linked to phone
contact" with **Open in Contacts** (the phone's own card, read-only), **Update
from phone contact** (fills the form's boxes from the card; Save keeps them) and
**Unlink**. The link is the phone's own id for the card, so the website and other
devices show it and nothing more. It travels in the online copy and the backup
file. (App-local plugins: `ios/App/App/PhoneContactPlugin.swift`,
`android/…/PhoneContactPlugin.java`.)

> BlackBook only ever **reads** your contacts, once, when you ask it to. It
> never writes anything back, and it never copies across the note on your
> phone's own contact card — the note in here is meant to be the private one.

On Chrome for Android the same button uses the browser's contact picker (a name,
an email and a number; the web API has no birthday). Everywhere else the door is
the CSV importer below, which works in every browser.

**An encrypted online copy** *(optional, off by default)* — sign in with your
Universal ID and BlackBook keeps a copy on UNI·SIM's servers, so your book
survives a lost laptop and opens on your phone. Signing in is the only step:
BlackBook then asks for your passphrase and downloads your book. If this device
already has contacts or to-dos (say, ones you made as a guest), they are merged
into the online copy and saved straight away — there is no question to answer.
Everything else about the backup (Save now, Fetch online copy, Forget this
device, Change passphrase, Turn off) is under Actions ▸ Advanced ▸ **Online
backup**.

> **We cannot read it.** The book is encrypted in your browser with AES-GCM-256,
> under a key derived from a passphrase you choose (PBKDF2-SHA-256, 600,000
> iterations). The passphrase never leaves your device and is **not** your
> account password. The server stores bytes it holds no key for.
>
> That matters more here than in most apps: the names, email addresses and
> private notes in a BlackBook belong to people who never signed up for
> anything, and holding those in plaintext is not a risk we get to accept on
> their behalf.
>
> ⚠️ **There is no recovery.** Lose the passphrase and the online copy is gone —
> we hold no key, no escrow and no reset. Your local book is untouched, which is
> why this is a backup and never the primary copy.

The merge on sign-in adds this device's contacts that the online copy does not
have. The same person is matched by id, or by name plus email or phone, and is
never added twice. After that, the online copy is a whole-book snapshot: if two
signed-in devices have both changed, BlackBook stops and asks which one to keep
rather than silently picking. To take the online copy as it stands instead of
merging, use **Fetch online copy** in the Online backup panel. Because the merge
only ever adds, someone deleted on another device can come back from a device
that still has them.

**Changing the passphrase** — Advanced ▸ Online backup ▸ Change passphrase. It asks for
the current one (even on a device that remembers the key), then re-encrypts the
book under a new salt in a single write. Your other devices stop syncing and
ask for the new passphrase; nothing on them is lost, and unlocking merges
their contacts back in. A device still holding the old key can never
write it back over the change. Knowing the current passphrase is required, so
this is not a recovery route.

## Light, Dark, or Match my device

BlackBook opens **light**, like every Universal App, until you choose otherwise
in **Tune this app ▸ Colour scheme**: Light, Dark, or Match my device. (It was
dark-only until October 2026.) On the phone app the status bar follows the
choice too.

## The phone app

The iPhone and Android app has screens of its own rather than the website in a
frame (`src/native/`, loaded only in the app): the book's paper and black
leather look with a red ribbon, a tab bar (Contacts, then Lists and To-do when
you turn them on, then Tune), and its own icon.

- **Everything opens the phone's way.** A person, the form, the panels, About
  and the help articles are pages: back with the button, a swipe in from the
  left edge, or Android's back. Filters, confirmations and choices are bottom
  sheets: drag the grip or swipe down to close them. Dates use the phone's own
  picker. Nothing opens as a website pop-up.
- **A person's page leads with Call, Message, Share and ⋯** (the share
  sheet gets their name and details, never the note). ⋯ is a sheet of the
  rest: Email (or Add email address), pin to Last added, hide from the list or
  the birthdays, Delete. The website has the same ⋯ beside Fine-tune.
- **Pull down from the top of the list for search**, and again for the
  keyboard. Tapping Contacts while you are on it does the same.
- **Tune** holds every option: Light / Dark / Match my device, the language,
  BlackBook's switches (all off to start), tags, backups, the PIN, Delete all
  data, help, About and Reset to defaults. Double-tap a tab to make it the one
  the app opens on.
- **Your own tab order** (2026-10-25): hold a tab for half a second and drag it
  along the bar; a quick tap still switches and a double tap still makes it the
  one the app opens on (the hold is never a tap). **Tune** stays last, as the
  way to every setting. Tune this app ▸ **Tab order** does the same with grips
  and ↑ ↓ buttons, on the website too. Hidden tabs keep their place for when
  they come back; Reset to defaults restores the order. The order is a device
  setting (like the other switches it goes in the backup file, not the online
  copy).
- Sign-in stays, but only inside Online backup; Apple and Google sign-in come
  up in the phone's own sheet.

`npm run dev` and add `?app` to the address to see the phone screens in a
browser. `npm run cap:sync` builds them into the native projects (never a bare
`cap sync`). The icon is drawn by `scripts/app-icon.mjs`, and the store
screenshots are captured, in every language, by `store-assets/generate.mjs`.

## Developing

```sh
cd D:/Github/UNISIM/Universal_Apps/Universal_BlackBook
npm install
npm run dev -- --port 5202 --strictPort
```

Or `./scripts/preview.sh` (`.\scripts\preview.ps1` on Windows), which does the
same and installs dependencies on first run. Port 5202 is this app's slot in the
suite registry — see `Docs_UNI_SIM/dev-preview.md`.

| | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm test` | Vitest — the CSV parser, the search/sort, the birthday maths, the phone-contact mapping, the vault crypto, the backup file (round trip, password, hostile data, merge), the swipe geometry and the PIN lock (that it re-locks on every fresh opening, and that the reset takes the book and the remembered vault key with it) |
| `BLACKBOOK_LIVE=1 npm test -- cloud.live` | The two-device vault round trip, against the REAL server. Not part of `npm test`: it signs in anonymously to production, exercises RLS, the primary-key conflict and the compare-and-set, then deletes what it made. |
| `npm run test:backup` | Builds, then drives the built app in Chromium: saves a backup with and without a password, clears the device, opens it (wrong password refused), checks contacts and to-dos are back, that adding the same backup duplicates nothing, that a hostile file is tamed, that the Online backup row and sign-in are offered to a signed-out visitor, and no console error. Playwright is borrowed from `../Universal_Beam/node_modules/playwright` (or set `PLAYWRIGHT`). |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck + production build |
| `npm run deploy` | Build and `wrangler deploy` |

⚠️ **`npm run dev` talks to the LIVE platform Supabase.** The book is local
either way, but signing in and setting a passphrase in dev writes a real
vault against your real Universal ID.

## Deployment

A Cloudflare Worker serving static assets — no `main`, no API of its own. The
portal Worker proxies `opensource.unisim.co.uk/blackbook/*` here, so the build
sets `base: '/blackbook/'` and `public/_redirects` maps the prefixed asset paths
back to the flat build output.

Pushing to `main` deploys (`.github/workflows/deploy.yml`).

## Licence

[AGPL-3.0-or-later](LICENSE), with an added permission for app-store distribution.

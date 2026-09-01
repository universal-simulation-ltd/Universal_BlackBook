# Universal BlackBook

**A private address book.** The people worth staying in touch with — under your
own tags, and never a birthday missed.

**→ [opensource.unisim.co.uk/blackbook](https://opensource.unisim.co.uk/blackbook)**

Part of the [Universal Apps](https://opensource.unisim.co.uk) suite by UNI·SIM.
Free, open source (MIT), and no account required.

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
| **Tags** | Entirely your own, and last in the form because they are a decision rather than a fact. **A new book starts with none**, because six invented starters are an app telling you how it thinks you should file your friends. Make as many as you like, in any of seven colours, and put a person in as many as fit. |

Search across names, emails, phone numbers, notes and birthdays (typing `june`
finds everyone born in June). Everything else — the birthdays view, the order,
and the tag filter — sits behind one **⚙️ Filters** button beside the search
box, so the search field is the whole row. On a phone that row is **docked to
the bottom of the screen**, under your thumb, and the panel opens upwards from
it.

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
CSV carries a `Hide birthday` column — so a backup restores the list you had
rather than one with everybody put back.

## Deleting somebody

**On a phone, swipe a card left** and a Delete button appears behind it. Tapping
it asks first, by name — the swipe only ever uncovers the button, because a
flick that deletes outright is one thumb away from losing something this app
holds the only copy of.

**Swipe the other way, in the birthdays view, to hide somebody** — and in the
hidden drawer the same right-swipe puts them back. One direction, one meaning:
whether they are in the list.

Everywhere else — and with a keyboard or a screen reader anywhere — Delete is
where it has always been: inside the contact's own form, behind the same
confirmation.

## Where your book lives

In your browser (IndexedDB), on the device you typed it into. There is no
account, no server and no telemetry about its contents.

Two ways to get it out or move it elsewhere:

**CSV** — a plain `Name, Email, Tags, Notes, Birthday, Phone, Hide birthday` file.
Opens in any spreadsheet and imports straight back. This is the backup story if
you never want an account.

The importer reads the column names Google Contacts and Outlook use — a
`Categories`, `Groups` or `Labels` column all count as tags, and `Mobile`,
`Telephone` or Google's `Phone 1 - Value` all count as the number — and takes
birthdays as `1990-06-04`, `4 June 1990`, `June 4` or `--06-04`. It deliberately
**refuses** `04/06/1990` rather than guessing — that is the 4th of June to a
British reader and the 6th of April to an American one, and an address book that
silently picks one is wrong for half its users with nothing on screen to say
so.

**Your phone's own contacts** *(the iPhone app)* — **From my contacts** opens
the system picker, and the person you choose arrives in the Add form with their
name, email, number and birthday already filled in, ready for the part that is
actually yours. **Import & export ▸ Import my phone contacts** does the whole
address book at once, skipping anybody already in your book so you can run it
again whenever you add someone to your phone.

> BlackBook only ever **reads** your contacts, once, when you ask it to. It
> never writes anything back, and it never copies across the note on your
> phone's own contact card — the note in here is meant to be the private one.

On Chrome for Android the same button uses the browser's contact picker (a name,
an email and a number; the web API has no birthday). Everywhere else the door is
the CSV importer below, which works in every browser.

**An encrypted online copy** *(optional, off by default)* — sign in with your
Universal ID and BlackBook can keep a copy on UNI·SIM's servers, so your book
survives a lost laptop and opens on your phone.

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

The online copy is a whole-book snapshot, not a field-by-field merge. If two
devices have both changed, BlackBook stops and asks which one to keep rather
than silently picking.

## Dark only

BlackBook has one appearance. It is a little black book; there is no theme
switcher because there is nothing to switch. (Every other Universal App defaults
to light — this one is the deliberate exception.)

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
| `npm test` | Vitest — the CSV parser, the search/sort, the birthday maths, the phone-contact mapping and the vault crypto |
| `BLACKBOOK_LIVE=1 npm test -- cloud.live` | The two-device vault round trip, against the REAL server. Not part of `npm test`: it signs in anonymously to production, exercises RLS, the primary-key conflict and the compare-and-set, then deletes what it made. |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck + production build |
| `npm run deploy` | Build and `wrangler deploy` |

⚠️ **`npm run dev` talks to the LIVE platform Supabase.** The book is local
either way, but signing in and turning on "save online" in dev writes a real
vault against your real Universal ID.

## Deployment

A Cloudflare Worker serving static assets — no `main`, no API of its own. The
portal Worker proxies `opensource.unisim.co.uk/blackbook/*` here, so the build
sets `base: '/blackbook/'` and `public/_redirects` maps the prefixed asset paths
back to the flat build output.

Pushing to `main` deploys (`.github/workflows/deploy.yml`).

## Licence

MIT — see [LICENCE](LICENSE).

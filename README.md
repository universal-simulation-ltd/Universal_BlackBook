# Universal BlackBook

**A private address book.** The people worth staying in touch with — filed under
your own categories, at the pace you choose.

**→ [opensource.unisim.co.uk/blackbook](https://opensource.unisim.co.uk/blackbook)**

Part of the [Universal Apps](https://opensource.unisim.co.uk) suite by UNI·SIM.
Free, open source (MIT), and no account required.

---

## What it does

Six fields, and nothing you didn't ask for:

| Field | |
|---|---|
| **Name** | |
| **Email** | |
| **Categories** | Entirely your own — make as many as you like, put a person in as many as fit. The six it starts with are ordinary categories you can rename or delete. |
| **Contact frequency** | **N/A** by default, or weekly, fortnightly, monthly, quarterly, every six months, yearly, or *big news only*. |
| **Birthday** | **The year is optional.** Half the birthdays in anybody's address book are "the 4th of June, no idea what year" — so a day and a month on their own are a complete answer, not a half-filled one. |
| **Notes** | Free text. Whatever you'd actually want to remember. |

Search across names, emails, notes and birthdays (typing `june` finds everyone
born in June); filter by category and by frequency; sort by name, by how
demanding the cadence is, or by recently added.

**On contact frequency:** it starts on **N/A**, because most people you add are
just people and an app that demands a cadence before it will take a name is
charging a toll on its own main action. BlackBook records what you set and lets
you filter by it. It does **not** track when you last spoke, and it does **not**
tell you who is overdue. That is a deliberate line — the moment an address book
starts nagging, it stops being an address book and becomes a task list, and
people stop opening it.

## Where your book lives

In your browser (IndexedDB), on the device you typed it into. There is no
account, no server and no telemetry about its contents.

Two ways to get it out or move it elsewhere:

**CSV** — a plain `Name, Email, Categories, Frequency, Notes, Birthday` file.
Opens in any spreadsheet and imports straight back. This is the backup story if
you never want an account.

The importer reads the column names Google Contacts and Outlook use, and takes
birthdays as `1990-06-04`, `4 June 1990`, `June 4` or `--06-04`. It deliberately
**refuses** `04/06/1990` rather than guessing — that is the 4th of June to a
British reader and the 6th of April to an American one, and an address book that
silently picks one is wrong for half its users with nothing on screen to say
so.

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
| `npm test` | Vitest — the CSV parser, the search/sort, the birthday parsing and the vault crypto |
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

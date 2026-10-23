// End-to-end check of the backup file (Advanced ▸ Backup, import & export),
// the way to move or keep a copy of a book without an account, beside the
// optional Universal ID sign-in and its encrypted online vault.
//
//   npm run test:backup      (builds, then runs this)
//
// Serves the built `dist/` with `vite preview`, then in Chromium: seeds a book
// with contacts and to-dos, saves a backup with and without a password, clears
// the device, opens the protected backup (a wrong password refused, the right
// one accepted), replaces everything and checks contacts AND to-dos are back
// (after a reload too); opens the plain backup with "Add to what's here" and
// checks nothing is duplicated; tries a hostile file, a file from another app
// and a file that is not a backup at all; checks a signed-out visitor is
// offered sign-in and the Online backup row; that nothing touched the vault;
// and that the console stayed clean.
//
// Playwright is not a dependency of this repo. Point PLAYWRIGHT at any
// installed copy (default: a sibling Universal App's node_modules).

import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const pwPath = process.env.PLAYWRIGHT ?? resolve(root, '../Universal_Beam/node_modules/playwright')
const { chromium } = require(pwPath)

let failures = 0
function check(ok, what) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`)
  if (!ok) failures++
}

const T0 = Date.UTC(2026, 0, 1)
const SEED = {
  contacts: [
    {
      id: 'c-ada',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+44 7700 900123',
      company: 'Analytical Engines',
      address: '1 Lovelace Row\nLondon',
      birthdate: '--12-10',
      tagIds: ['t-work'],
      notes: 'Likes tea',
      createdAt: T0,
      updatedAt: T0,
    },
    { id: 'c-bob', name: 'Bob Babbage', email: 'bob@example.com', phone: '', tagIds: [], notes: '', createdAt: T0, updatedAt: T0 },
  ],
  tags: [{ id: 't-work', name: 'Work', colour: 'amber' }],
  todos: [
    { id: 'd-ring', title: 'Ring Ada', details: 'About the engine', due: '2026-02-03', tagIds: ['t-work'], createdAt: T0, updatedAt: T0 },
    { id: 'd-done', title: 'Post the letter', details: '', tagIds: [], doneAt: T0 + 1, createdAt: T0, updatedAt: T0 + 1 },
  ],
}

/** Everything in the app's IndexedDB, read from the page. */
const readDb = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('blackbook', 1)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const t = db.transaction(['contacts', 'categories', 'sync'], 'readonly')
          const out = {}
          const c = t.objectStore('contacts').getAll()
          const g = t.objectStore('categories').getAll()
          const d = t.objectStore('sync').get('todos')
          t.oncomplete = () => {
            out.contacts = c.result
            out.tags = g.result
            out.todos = d.result ?? []
            db.close()
            resolve(out)
          }
        }
      }),
  )

/** The disk is written just after the screen updates: read until `ok` holds (or 5 s). */
async function settledDb(page, ok) {
  let db
  for (let i = 0; i < 50; i++) {
    db = await readDb(page)
    if (ok(db)) break
    await page.waitForTimeout(100)
  }
  return db
}

const server = await preview({ root, preview: { port: 4793, strictPort: false, open: false }, logLevel: 'silent' })
const url = server.resolvedUrls.local[0]
const browser = await chromium.launch()
const tmp = mkdtempSync(join(tmpdir(), 'blackbook-backup-'))

try {
  // Service workers off: the PWA's worker would otherwise serve a cached build.
  const context = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block' })
  // Keep a test run out of the SDK's anonymous daily open count (presence.ts:
  // an install marked as ours is never counted).
  await context.addInitScript(() => {
    try {
      localStorage.setItem('unisim:own-device', '1')
    } catch {
      /* ignore */
    }
  })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push(String(e)))
  const requests = []
  page.on('request', (r) => {
    if (!r.url().startsWith(url.replace(/\/blackbook\/$/, ''))) requests.push(r.url())
  })

  const heading = () => page.getByRole('heading', { name: 'Your BlackBook' }).waitFor()
  const openPanel = async () => {
    await page.getByRole('button', { name: 'Actions · Profile' }).click()
    const row = page.getByText('Backup, import & export', { exact: true })
    // The Advanced section remembers being open, so only open it when shut.
    if (!(await row.isVisible())) await page.getByRole('button', { name: 'Advanced' }).click()
    await row.click()
    await page.getByRole('heading', { name: 'Backup file' }).waitFor()
  }
  const closePanel = () => page.getByRole('dialog').getByRole('button', { name: /close/i }).first().click()
  const picker = () => page.locator('[data-testid=backup-file-input]')
  const alertSays = (re) =>
    page.getByRole('alert').filter({ hasText: re }).first().waitFor({ timeout: 8000 }).then(() => true, () => false)

  // ── 1. Seed a book with contacts and to-dos ────────────────────────────────
  await page.goto(url)
  await heading()
  await page.evaluate(
    (seed) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('blackbook', 1)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const t = db.transaction(['contacts', 'categories', 'sync'], 'readwrite')
          t.objectStore('categories').clear()
          for (const c of seed.contacts) t.objectStore('contacts').put(c)
          for (const g of seed.tags) t.objectStore('categories').put(g)
          t.objectStore('sync').put(seed.todos, 'todos')
          t.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    SEED,
  )
  await page.evaluate(() => localStorage.setItem('blackbook.settings', JSON.stringify({ emailLists: false, todos: true, shownFields: [] })))
  await page.reload()
  await heading()
  check(await page.getByText('Ada Lovelace').first().isVisible(), 'seeded book shows its contacts')

  // ── 2. Signed out: sign-in and Online backup are offered ───────────────────
  await page.getByRole('button', { name: 'Actions · Profile' }).click()
  await page.getByRole('button', { name: 'Advanced' }).click()
  const menuText = await page.locator('body').innerText()
  check(/Sign in|Log in/i.test(menuText), 'the menu offers sign-in to a signed-out visitor')
  const onlineRow = page.getByText('Online backup', { exact: true })
  check(await onlineRow.isVisible(), 'Advanced ▸ Online backup row is there')
  check(await page.getByText('Backup, import & export', { exact: true }).isVisible(), 'Advanced ▸ Backup, import & export row is there')
  await onlineRow.click()
  await page.getByRole('heading', { name: 'Online backup' }).waitFor()
  check(
    await page.getByRole('dialog').getByRole('button', { name: 'Sign in with Universal ID' }).isVisible(),
    'Online backup panel offers Sign in with Universal ID',
  )
  await closePanel()
  await openPanel()

  // ── 3. Save a backup, no password ──────────────────────────────────────────
  const [plainDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save a backup' }).click()])
  const plainPath = join(tmp, 'plain-' + plainDl.suggestedFilename())
  await plainDl.saveAs(plainPath)
  const plain = JSON.parse(readFileSync(plainPath, 'utf8'))
  check(/^blackbook-backup-\d{4}-\d{2}-\d{2}\.json$/.test(plainDl.suggestedFilename()), `file name ${plainDl.suggestedFilename()}`)
  check(plain.format === 'unisim-transfer' && plain.product === 'blackbook' && plain.kind === 'backup' && plain.schema === 2, 'envelope: blackbook / backup / schema 2')
  check(plain.data.contacts.length === 2 && plain.data.todos.length === 2 && plain.data.tags.length === 1, 'file holds 2 contacts, 2 to-dos, 1 tag')
  check(plain.data.contacts.find((c) => c.id === 'c-ada')?.address === '1 Lovelace Row\nLondon', 'every field is in the file (address included)')
  check(plain.data.settings?.todos === true, 'Tune this app choices are in the file')

  // ── 4. Save a backup with a password ───────────────────────────────────────
  const protect = page.getByLabel(/Protect with a password/)
  check(!(await protect.isChecked()), 'password protection starts unticked')
  await protect.check()
  await page.locator('#backup-password').fill('correct horse')
  await page.locator('#backup-password-repeat').fill('correct horse')
  const [lockedDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save a backup' }).click()])
  const lockedPath = join(tmp, 'locked-' + lockedDl.suggestedFilename())
  await lockedDl.saveAs(lockedPath)
  const lockedText = readFileSync(lockedPath, 'utf8')
  const locked = JSON.parse(lockedText)
  check(locked.encrypted && !('data' in locked) && !lockedText.includes('Ada'), 'password file is encrypted, no names readable')
  await closePanel()

  // ── 5. Clear the device ────────────────────────────────────────────────────
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        localStorage.clear()
        const req = indexedDB.deleteDatabase('blackbook')
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.reload()
  await heading()
  await page.getByText('Your book is empty').waitFor()
  check(true, 'device cleared: empty book')

  // ── 6. Open the protected backup: wrong password, then the right one ───────
  await openPanel()
  await picker().setInputFiles(lockedPath)
  await page.getByText('This backup has a password').waitFor()
  await page.locator('#backup-open-password').fill('wrong one')
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  check(await alertSays(/password doesn't open/i), 'wrong password refused')
  check((await readDb(page)).contacts.length === 0, 'nothing changed after a wrong password')
  await page.locator('#backup-open-password').fill('correct horse')
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await page.getByText(/holds 2 contacts, 2 to-dos, 0 notes and 1 tag/).waitFor()
  check(true, 'right password opens it and says what it holds')
  await page.getByRole('button', { name: 'Replace everything' }).click()
  await page.getByText(/This deletes the/).waitFor()
  await page.getByRole('button', { name: 'Replace everything' }).click()
  await page.getByText(/Opened the backup/).waitFor()
  let db = await settledDb(page, (d) => d.contacts.length === 2)
  check(db.contacts.length === 2 && db.todos.length === 2 && db.tags.length === 1, 'contacts, to-dos and tags are back on disk')

  await page.reload()
  await heading()
  check(await page.getByText('Bob Babbage').first().isVisible(), 'contacts are back after a reload')
  await page.getByRole('button', { name: 'Ada Lovelace' }).first().click().catch(() => {})
  const adaCard = await page.locator('body').innerText()
  check(adaCard.includes('Lovelace Row'), 'address survives a reload')
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'To-do' }).click()
  await page.getByText('Ring Ada').first().waitFor()
  check(true, 'to-dos are back (and the To-do tab with them)')
  await page.getByRole('tab', { name: 'Contacts' }).click()

  // ── 7. Add the plain backup to what is here: nothing is duplicated ─────────
  await openPanel()
  await picker().setInputFiles(plainPath)
  await page.getByRole('button', { name: "Add to what's here" }).click()
  await page.getByText(/nothing new to add/).waitFor()
  db = await readDb(page)
  check(db.contacts.length === 2 && db.todos.length === 2 && db.tags.length === 1, "Add to what's here with the same backup adds nothing")

  // ── 8. Files that are not a BlackBook backup ───────────────────────────────
  const notJson = join(tmp, 'notes.json')
  writeFileSync(notJson, 'hello, not json')
  await openPanel()
  await picker().setInputFiles(notJson)
  check(await alertSays(/isn't a file this app saved/i), 'a file that is not a backup is refused')
  const wrongApp = join(tmp, 'wrong.json')
  writeFileSync(wrongApp, JSON.stringify({ ...plain, product: 'workplace', kind: 'fire-assessment' }))
  await picker().setInputFiles(wrongApp)
  check(await alertSays(/different app/i), 'a file from another app is refused')

  // ── 9. A hostile backup ────────────────────────────────────────────────────
  const hostile = join(tmp, 'hostile.json')
  writeFileSync(
    hostile,
    '{"format":"unisim-transfer","version":1,"product":"blackbook","kind":"backup","schema":1,"exportedAt":"x","data":{' +
      '"__proto__":{"polluted":true},' +
      '"contacts":[' +
      `{"id":"h-1","name":"<img src=x onerror=\\"window.__pwned=1\\">Mallory","email":"${'e'.repeat(1000)}","notes":"${'n'.repeat(200001)}","tagIds":["t-evil","nope",7],"birthdate":"2026-02-31","createdAt":"soon","updatedAt":1e300},` +
      '{"id":"../../etc/passwd","name":"Bad id"},{"id":"h-2"},"junk",null,{"id":"c-bob","name":"Bob Babbage","email":"bob@example.com","updatedAt":-5}],' +
      '"tags":[{"id":"t-evil","name":"<script>alert(1)</script>","colour":"red;background:url(x)"},{"id":"t-x","name":""}],' +
      '"todos":[{"id":"z1","title":7},{"id":"z2","title":"Fine","due":"2026-99-99","doneAt":"never"}],' +
      '"settings":{"emailLists":"yes","todos":1,"shownFields":["__proto__","phone"]},"view":{"sort":"drop table"}}}',
  )
  await picker().setInputFiles(hostile)
  await page.getByRole('button', { name: "Add to what's here" }).click()
  await page.getByText(/Opened the backup/).waitFor()
  db = await settledDb(page, (d) => d.contacts.length > 2)
  const mallory = db.contacts.find((c) => c.id === 'h-1')
  check(db.contacts.length === 3, 'only the one valid new contact was added (bad id, empty, junk dropped; Bob not duplicated)')
  check(mallory && mallory.email === '' && mallory.notes === '' && mallory.birthdate === undefined, 'over-long fields and a bad date dropped')
  check(mallory && mallory.createdAt > 0 && mallory.updatedAt < Date.now() + 400 * 86400000, 'bad timestamps replaced')
  check(mallory && JSON.stringify(mallory.tagIds) === '["t-evil"]', 'unknown and non-string tag ids dropped')
  check(db.tags.find((t) => t.id === 't-evil')?.colour !== 'red;background:url(x)', 'a colour that is not a swatch is replaced')
  check(db.todos.length === 3 && db.todos.find((t) => t.id === 'z2')?.due === undefined, 'bad to-do dropped, bad deadline cleared')
  check(db.contacts.find((c) => c.id === 'c-bob')?.updatedAt === T0, 'an older copy did not overwrite the newer one')
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('blackbook.settings') ?? '{}'))
  check(settings.emailLists === false && JSON.stringify(settings.shownFields) === '["phone"]', 'only valid settings were taken')
  await page.getByText('Mallory').first().waitFor()
  check(await page.evaluate(() => window.__pwned === undefined && ({}).polluted === undefined), 'no script ran, no prototype polluted')
  check((await page.locator('img[src=x]').count()) === 0, 'the HTML in a name is shown as text, never rendered')

  // ── 10. Nothing went to a server; the console stayed clean ─────────────────
  check(!requests.some((u) => /blackbook_vaults/.test(u)), `signed out, nothing touched the vault (${requests.length} off-site requests)`)
  check(consoleErrors.length === 0, `no console errors${consoleErrors.length ? ': ' + consoleErrors.join(' | ') : ''}`)
} catch (e) {
  console.error(e)
  failures++
} finally {
  await browser.close()
  await server.close()
}

console.log(failures === 0 ? '\nAll backup-file checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)

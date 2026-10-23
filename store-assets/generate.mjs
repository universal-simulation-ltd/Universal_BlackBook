#!/usr/bin/env node
// Captures the App Store and Google Play screenshots of Universal BlackBook's
// phone screens, in every suite language.
//
//   npm run build:mobile                          # the bundle the iOS/Android shells load
//   PLAYWRIGHT=../../backoffice/universal-platform/node_modules/playwright/index.mjs \
//     node store-assets/generate.mjs              # every screen, device and language
//   node store-assets/generate.mjs 02             # only captures whose name starts "02"
//   LOCALE=de-DE DEVICE=iphone node store-assets/generate.mjs
//
// The screens are the real app: dist/ is served to the browser through
// Playwright's request routing (no server, no port), at each store device's
// viewport and pixel ratio, and driven as a person would drive it. Anything
// that is not the app is refused. Universal Jukebox's generator is the model.
//
// ⚠️ THE PHONE SCREENS (src/native/), never the website's layout:
// `phoneScreens()` turns them on from a session flag set here before the app
// loads (index.html reads it too, for the paper on the first frame).
//
// ⚠️ EVERYBODY IN THE BOOK IS MADE UP — names, numbers (Ofcom's drama ranges),
// addresses @example — and their notes and tags are in the capture's language.
// Birthdays are set relative to the day of capture, so the countdowns read
// "in 3 days" whenever this is run.
//
// Output (committed): raw/<locale>/<class>/<name>.png for iphone (1320x2580,
// 6.9"), ipad (2064x2664, 13") and android (1080x2172). The UNI·SIM store kit
// frames them (Docs_UNI_SIM/store-kit) once a store.json with BlackBook's own
// screenshot design exists — that is listing work, not done here.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, '..', 'dist')
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright')

// Each device's screen less the status bar and home indicator the store kit
// draws (its layouts.mjs insets), as Jukebox's generator.
const DEVICES = [
  { key: 'iphone', width: 440, height: 860, dpr: 3 },
  { key: 'ipad', width: 1032, height: 1332, dpr: 2 },
  { key: 'android', width: 360, height: 724, dpr: 3 },
]
/** Store locale → the app's language code (Tune this app ▸ Language). */
const LOCALES = { 'en-GB': 'en-gb', 'de-DE': 'de', 'fr-FR': 'fr', 'es-ES': 'es', 'it-IT': 'it', 'pt-BR': 'pt-BR', 'pt-PT': 'pt-PT', 'tr-TR': 'tr' }
const ORIGIN = 'https://app.test'
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
}

// ── The example book, per language ──────────────────────────────────────────
const TAGS = {
  'en-GB': ['Family', 'Work', 'Book club', 'Neighbours'],
  'de-DE': ['Familie', 'Arbeit', 'Buchclub', 'Nachbarn'],
  'fr-FR': ['Famille', 'Travail', 'Club de lecture', 'Voisins'],
  'es-ES': ['Familia', 'Trabajo', 'Club de lectura', 'Vecinos'],
  'it-IT': ['Famiglia', 'Lavoro', 'Club del libro', 'Vicini'],
  'pt-BR': ['Família', 'Trabalho', 'Clube do livro', 'Vizinhos'],
  'pt-PT': ['Família', 'Trabalho', 'Clube do livro', 'Vizinhos'],
  'tr-TR': ['Aile', 'İş', 'Kitap kulübü', 'Komşular'],
}
const NOTES = {
  'en-GB': ['Loves hill walking. Two kids, Tobi and Ada.', 'Met at the Leeds conference. Allergic to shellfish.', 'Recommended “The Overstory”.', 'Coffee on Fridays.', 'Aunt. Send a card, not a text.', 'Feeds the cat when we are away.', 'Back from Kyoto in May.', 'Plumber. Very good, books up fast.'],
  'de-DE': ['Wandert gern. Zwei Kinder, Tobi und Ada.', 'Kennengelernt auf der Konferenz in Leeds. Allergisch gegen Meeresfrüchte.', 'Hat „Die Wurzeln des Lebens“ empfohlen.', 'Kaffee am Freitag.', 'Tante. Eine Karte schicken, keine SMS.', 'Füttert die Katze, wenn wir weg sind.', 'Im Mai zurück aus Kyoto.', 'Klempner. Sehr gut, schnell ausgebucht.'],
  'fr-FR': ['Adore la randonnée. Deux enfants, Tobi et Ada.', 'Rencontré au congrès de Leeds. Allergique aux fruits de mer.', 'M’a conseillé « L’Arbre-monde ».', 'Café le vendredi.', 'Tante. Envoyer une carte, pas un SMS.', 'Nourrit le chat quand on part.', 'Rentre de Kyoto en mai.', 'Plombier. Très bon, vite complet.'],
  'es-ES': ['Le encanta el senderismo. Dos hijos, Tobi y Ada.', 'Nos conocimos en el congreso de Leeds. Alérgico al marisco.', 'Me recomendó «El clamor de los bosques».', 'Café los viernes.', 'Tía. Mandar una tarjeta, no un mensaje.', 'Da de comer al gato cuando no estamos.', 'Vuelve de Kioto en mayo.', 'Fontanero. Muy bueno, se llena pronto.'],
  'it-IT': ['Ama le escursioni. Due figli, Tobi e Ada.', 'Conosciuto al convegno di Leeds. Allergico ai crostacei.', 'Mi ha consigliato «Il sussurro del mondo».', 'Caffè il venerdì.', 'Zia. Mandare un biglietto, non un messaggio.', 'Dà da mangiare al gatto quando siamo via.', 'Torna da Kyoto a maggio.', 'Idraulico. Bravissimo, sempre pieno.'],
  'pt-BR': ['Adora fazer trilha. Dois filhos, Tobi e Ada.', 'Conheci no congresso de Leeds. Alérgico a frutos do mar.', 'Recomendou “A trama”.', 'Café às sextas.', 'Tia. Mandar um cartão, não mensagem.', 'Alimenta o gato quando viajamos.', 'Volta de Quioto em maio.', 'Encanador. Muito bom, agenda lota rápido.'],
  'pt-PT': ['Adora caminhadas. Dois filhos, Tobi e Ada.', 'Conheci no congresso de Leeds. Alérgico a marisco.', 'Recomendou «A trama».', 'Café às sextas.', 'Tia. Mandar um postal, não uma mensagem.', 'Dá de comer ao gato quando estamos fora.', 'Volta de Quioto em maio.', 'Canalizador. Muito bom, fica cheio depressa.'],
  'tr-TR': ['Yürüyüşe bayılır. İki çocuk, Tobi ve Ada.', 'Leeds konferansında tanıştık. Deniz ürünlerine alerjisi var.', '“Üsthikâye”yi önerdi.', 'Cuma günleri kahve.', 'Teyze. Mesaj değil, kart gönder.', 'Biz yokken kediyi besliyor.', 'Mayısta Kyoto’dan dönüyor.', 'Tesisatçı. Çok iyi, hemen doluyor.'],
}

// The Notes tab's own notes (not a contact's), newest first: [title, details].
const PAGES = {
  'en-GB': [['Gift ideas', 'Amara: a good walking map of the Lakes\nBen: the new Overstory paperback'], ['Wi-Fi at Mum’s', 'Network: Garden\nThe password is on the fridge'], ['Book club, March', 'Hana hosts. Bring the cake this time.']],
  'de-DE': [['Geschenkideen', 'Amara: eine gute Wanderkarte vom Lake District\nBen: das neue Taschenbuch'], ['WLAN bei Mama', 'Netzwerk: Garten\nDas Passwort hängt am Kühlschrank'], ['Buchclub, März', 'Hana lädt ein. Diesmal bringe ich den Kuchen.']],
  'fr-FR': [['Idées cadeaux', 'Amara : une bonne carte de randonnée\nBen : le nouveau livre de poche'], ['Wi-Fi chez maman', 'Réseau : Jardin\nLe mot de passe est sur le frigo'], ['Club de lecture, mars', 'Chez Hana. Cette fois, j’apporte le gâteau.']],
  'es-ES': [['Ideas de regalo', 'Amara: un buen mapa de senderismo\nBen: el nuevo libro de bolsillo'], ['Wifi en casa de mamá', 'Red: Jardín\nLa contraseña está en la nevera'], ['Club de lectura, marzo', 'En casa de Hana. Esta vez llevo yo la tarta.']],
  'it-IT': [['Idee regalo', 'Amara: una bella mappa per le escursioni\nBen: il nuovo tascabile'], ['Wi-Fi dalla mamma', 'Rete: Giardino\nLa password è sul frigo'], ['Club del libro, marzo', 'Da Hana. Questa volta porto io la torta.']],
  'pt-BR': [['Ideias de presente', 'Amara: um bom mapa de trilhas\nBen: o novo livro de bolso'], ['Wi-Fi da mamãe', 'Rede: Jardim\nA senha está na geladeira'], ['Clube do livro, março', 'Na casa da Hana. Desta vez eu levo o bolo.']],
  'pt-PT': [['Ideias de prendas', 'Amara: um bom mapa de caminhadas\nBen: o novo livro de bolso'], ['Wi-Fi em casa da mãe', 'Rede: Jardim\nA palavra-passe está no frigorífico'], ['Clube do livro, março', 'Em casa da Hana. Desta vez levo eu o bolo.']],
  'tr-TR': [['Hediye fikirleri', 'Amara: iyi bir yürüyüş haritası\nBen: yeni cep kitabı'], ['Annemdeki Wi-Fi', 'Ağ: Bahçe\nŞifre buzdolabının üstünde'], ['Kitap kulübü, mart', 'Hana’da. Bu sefer pastayı ben getiriyorum.']],
}

/** Runs in the page: writes the book into IndexedDB. */
async function seed({ tags, notes, pages }) {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('blackbook', 1)
    r.onupgradeneeded = () => {
      const d = r.result
      for (const [n, k] of [['contacts', 'id'], ['categories', 'id']]) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: k })
      if (!d.objectStoreNames.contains('sync')) d.createObjectStore('sync')
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
  const now = Date.now()
  const day = 864e5
  const pad = (n) => String(n).padStart(2, '0')
  const born = (inDays, year) => {
    const d = new Date(now + inDays * day)
    return `${year ? year : '-'}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  const swatches = ['amber', 'sky', 'violet', 'emerald']
  const tagRecs = tags.map((name, i) => ({ id: `t${i}`, name, colour: swatches[i] }))
  const people = [
    ['Amara Okafor', 'amara.okafor@example.com', '07700 900145', ['t0'], born(3, 1988), notes[0]],
    ['Ben Hartley', 'ben@example.org', '+44 113 496 0821', ['t1'], born(41, 1979), notes[1]],
    ['Chloé Martin', 'chloe.martin@example.fr', '', ['t2'], born(0, 1992), notes[2]],
    ['Dev Patel', 'dev.patel@example.com', '07700 900372', ['t1', 't2'], born(12), notes[3]],
    ['Elena Rossi', '', '07700 900518', ['t0'], born(88, 1965), notes[4]],
    ['Farah Haddad', 'farah@example.net', '07700 900690', ['t3'], undefined, notes[5]],
    ['George Mensah', 'george.m@example.com', '', ['t1'], born(150, 1983), ''],
    ['Hana Sato', 'hana.sato@example.jp', '+81 90 0000 1234', ['t2'], born(6, 1995), notes[6]],
    ['Isaac Levi', 'isaac@example.com', '07700 900811', [], born(200), notes[7]],
    ['Jo Whitfield', 'jo.w@example.co.uk', '07700 900924', ['t3', 't0'], born(25, 1990), ''],
  ]
  await new Promise((res, rej) => {
    const t = db.transaction(['contacts', 'categories', 'sync'], 'readwrite')
    people.forEach(([name, email, phone, tagIds, birthdate, note], i) =>
      t.objectStore('contacts').put({
        id: `c${i}`, name, email, phone, tagIds, notes: note,
        ...(birthdate ? { birthdate } : {}),
        // Jo first in "Last added".
        createdAt: now - (people.length - i) * day * 3, updatedAt: now - (people.length - i) * day * 3,
      }),
    )
    tagRecs.forEach((g) => t.objectStore('categories').put(g))
    t.objectStore('sync').put(true, 'seed')
    t.objectStore('sync').put(
      pages.map(([title, details], i) => ({ id: `n${i}`, title, details, createdAt: now - (i + 1) * day, updatedAt: now - i * day * 2 - 3600e3 })),
      'pages',
    )
    t.oncomplete = res
    t.onerror = () => rej(t.error)
  })
  db.close()
}

// ── The screens ─────────────────────────────────────────────────────────────
// Found by structure (the tab bar's order, the page's bar), never by English
// words, so the same steps capture every language.
const openPerson = (page, name) => page.locator('main button', { hasText: name }).first().click()

const CAPTURES = {
  // The book: the list, with the newest at the top.
  '01-book': { dark: false, async run() {} },
  // One person: Call · Message · Email · Share, the countdown, the note.
  '02-person': {
    dark: false,
    async run(page) {
      await openPerson(page, 'Amara Okafor')
    },
  },
  // Birthdays, soonest first: Filters ▸ Birthdays.
  '03-birthdays': {
    dark: false,
    async run(page) {
      await page.locator('.bb-tab').first().click() // opens the search drawer (tab tapped while on it)
      await page.waitForTimeout(500)
      await page.locator('main button[aria-controls]').filter({ has: page.locator('svg') }).first().click()
      await page.waitForTimeout(500)
      await page.locator('.bb-sheet button[aria-pressed]').first().click()
      await page.waitForTimeout(300)
      await page.keyboard.press('Escape')
      await page.locator('main input[type=search]').blur()
      await page.evaluate(() => window.scrollTo(0, 0))
    },
  },
  // Fine-tuning somebody.
  '04-fine-tune': {
    dark: false,
    async run(page, { tags }) {
      const tag3 = tags[2]
      await openPerson(page, 'Ben Hartley')
      await page.waitForTimeout(500)
      await page.locator('.bb-page .unisim-phone-actions button').last().click()
      // The tags, collapsed: type the start of one and the box suggests it,
      // with "Add new tag" beside it.
      await page.waitForTimeout(500)
      const box = page.locator('.bb-page input[role=combobox]').first()
      await box.scrollIntoViewIfNeeded()
      await box.fill(tag3.slice(0, 2))
      await page.locator('.bb-page .unisim-phone-body').last().evaluate((b) => b.scrollBy(0, 400))
    },
  },
  // The black leather: the book in Dark.
  '05-dark': { dark: true, async run() {} },
  // The Notes tab: notes of your own, newest first.
  '07-notes': {
    dark: false,
    async run(page) {
      await page.locator('.bb-tab').nth(1).click()
    },
  },
  // Tune this app, in Dark: Light / Dark / Match my device and the switches.
  '06-tune': {
    dark: true,
    async run(page) {
      await page.locator('.bb-tab').last().click()
    },
  },
}

function pngInfo(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), colourType: buf[25] }
}

async function serve(ctx) {
  await ctx.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== ORIGIN) return route.abort()
    let p = decodeURIComponent(url.pathname)
    if (p.endsWith('/')) p += 'index.html'
    try {
      const file = path.join(dist, p)
      await route.fulfill({ body: await readFile(file), contentType: TYPES[path.extname(file)] ?? 'application/octet-stream' })
    } catch {
      await route.fulfill({ status: 404, body: '' })
    }
  })
}

const only = process.argv.slice(2)
const devices = DEVICES.filter((d) => !process.env.DEVICE || process.env.DEVICE.split(',').includes(d.key))
const locales = Object.keys(LOCALES).filter((l) => !process.env.LOCALE || process.env.LOCALE.split(',').includes(l))
const browser = await chromium.launch()
let bad = 0
for (const locale of locales) {
  for (const dev of devices) {
    const dir = path.join(here, 'raw', locale, dev.key)
    await mkdir(dir, { recursive: true })
    for (const [name, capture] of Object.entries(CAPTURES)) {
      if (only.length && !only.some((p) => name.startsWith(p))) continue
      const ctx = await browser.newContext({
        viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.dpr,
        isMobile: true, hasTouch: true, colorScheme: capture.dark ? 'dark' : 'light', locale,
      })
      await serve(ctx)
      await ctx.addInitScript(({ lang, dark }) => {
        try {
          sessionStorage.setItem('blackbook:store-capture', '1')
          localStorage.setItem('universal:language:blackbook', lang)
          localStorage.setItem('unisim-blackbook-theme', dark ? 'dark' : 'light')
          // The first-run "Pull down to search" belongs to somebody's first minute.
          localStorage.setItem('blackbook.pullSearchLearnt', '1')
          // The Notes tab on (Tune this app ▸ Notes), for 07-notes.
          localStorage.setItem('blackbook.settings', JSON.stringify({ emailLists: false, todos: false, notes: true, shownFields: [] }))
        } catch { /* fails loudly below */ }
      }, { lang: LOCALES[locale], dark: capture.dark })
      const page = await ctx.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await page.goto(`${ORIGIN}/index.html`)
      await page.evaluate(seed, { tags: TAGS[locale], notes: NOTES[locale], pages: PAGES[locale] })
      await page.reload()
      await page.locator('.bb-tab').first().waitFor()
      await page.waitForTimeout(900)
      try {
        await capture.run(page, { tags: TAGS[locale] })
        await page.waitForTimeout(900)
      } catch (err) {
        console.error(`FAIL ${locale}/${dev.key}/${name}: ${err.message.split('\n')[0]}`)
        bad++
      }
      const buf = await page.screenshot()
      await writeFile(path.join(dir, `${name}.png`), buf)
      const { w, h, colourType } = pngInfo(buf)
      const ok = w === dev.width * dev.dpr && h === dev.height * dev.dpr && colourType === 2
      if (!ok) bad++
      console.log(`${ok ? 'OK ' : 'BAD'} raw/${locale}/${dev.key}/${name}.png ${w}x${h}${errors.length ? ` (page errors: ${errors[0].slice(0, 120)})` : ''}`)
      await ctx.close()
    }
  }
}
await browser.close()
if (bad) {
  console.error(`${bad} problem(s) — check the output above`)
  process.exit(1)
}

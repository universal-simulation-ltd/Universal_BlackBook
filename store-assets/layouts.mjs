// Universal BlackBook's own screenshot layouts, rendered by the UNI·SIM store
// kit (Docs_UNI_SIM/store-kit/build.mjs reads them through store.json
// "layouts"; the look is store.css). store-listings README §7: a design that
// comes from what the app is, not the kit's orange default.
//
// The app is a little black book, so the set is one:
//   book-open / book-close  01 + 02, ONE double-width scene. 01 is a paper
//               page (the lockup, the headline, the book on a phone); 02 the
//               black leather cover (a person on a phone, thumb-index tabs
//               down the edge, the credit). A red silk ribbon marks the place
//               ON the join, so it is only whole with the two side by side.
//   book-page / book-leather  03 on: a serif headline, one phone, an italic
//               caption and the chips as index tabs (`hot` is the red one),
//               a short ribbon hanging from the top. Paper and leather
//               alternate, as the app's Light and Dark do.
//   FEATURE_GRAPHICS.book  Play's 1024×500 card: the cover with its ribbon.
//
// Geometry is per device class (the kit's frame name), in stage pixels.

const G = {
  iphone: {
    lockTop: 150, lock: 58, headTop: 290, head: 150, pad: 100,
    devW: 700, open: { left: 250, top: 880, rot: -5 }, close: { left: 190, top: 700, rot: 4 },
    ribbon: { w: 104, h: 2380, fork: 74 },
    index: { top: 600, w: 118, h: 150, gap: 14, size: 38, n: 8 },
    closeHead: { top: 210, size: 116 }, sub: 120, subSize: 42,
    feat: { headTop: 150, head: 124, devW: 700, devTop: 540, gap: 64, cap: 44, chip: 36, rib: { w: 70, h: 360, right: 130, fork: 52 } },
  },
  pixel: {
    lockTop: 120, lock: 54, headTop: 240, head: 132, pad: 110,
    devW: 640, open: { left: 300, top: 760, rot: -5 }, close: { left: 230, top: 600, rot: 4 },
    ribbon: { w: 108, h: 2180, fork: 74 },
    index: { top: 520, w: 116, h: 138, gap: 13, size: 36, n: 8 },
    closeHead: { top: 180, size: 104 }, sub: 100, subSize: 40,
    feat: { headTop: 120, head: 110, devW: 640, devTop: 450, gap: 56, cap: 40, chip: 34, rib: { w: 70, h: 320, right: 150, fork: 50 } },
  },
  ipad: {
    lockTop: 150, lock: 66, headTop: 300, head: 160, pad: 150,
    devW: 1180, open: { left: 420, top: 860, rot: -4 }, close: { left: 280, top: 700, rot: 3 },
    ribbon: { w: 150, h: 2380, fork: 100 },
    index: { top: 640, w: 150, h: 190, gap: 18, size: 48, n: 8 },
    closeHead: { top: 210, size: 128 }, sub: 120, subSize: 50,
    feat: { headTop: 150, head: 136, devW: 1260, devTop: 520, gap: 60, cap: 50, chip: 42, rib: { w: 96, h: 420, right: 200, fork: 66 } },
  },
}
const INDEX = ['A–C', 'D–F', 'G–I', 'J–L', 'M–O', 'P–R', 'S–U', 'V–Z']

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const rich = (s) => esc(s).replace(/\*(.+?)\*/g, '<span class="accent">$1</span>')
const asLines = (v) => (Array.isArray(v) ? v : String(v).split('\n'))
const lines = (v) => asLines(v).map((l) => `<span class="l">${rich(l)}</span>`).join('')
const breaks = (v) => asLines(v).map(rich).join('<br>')
const credit = (s) => breaks(s).replace(/UNI·SIM/g, '<span class="uni">UNI·SIM</span>')

function geo(ctx) {
  const g = G[ctx.cls.frame]
  if (!g) throw new Error(`the book layouts have no geometry for this device class (${ctx.cls.frame})`)
  return g
}

// The serif is the app's own (store.css), and nothing asks for it until the
// first layout, which is after the kit's READY has begun: without this its
// headline fitting measures the fallback font and a long line runs under the
// ribbon. The kit waits for window.__layoutReady before it fits anything.
const FONTS = `<script>window.__layoutReady = Promise.all([
  document.fonts.load('700 100px "BB Serif"', 'AaĞğŞşİı'),
  document.fonts.load('italic 600 40px "BB Serif"', 'AaĞğŞşİı'),
]).then(() => document.fonts.ready)</script>`

/** The kit's stage, wrapped in the book's own class. */
function stage(ctx, cls, inner) {
  const c = ctx.cls
  return `<div class="canvas bb ${cls}" style="--fit:${ctx.fit}"><div class="stage clip" style="--stage-w:${c.stage[0]}px;--stage-h:${c.stage[1]}px">${inner}</div></div>${FONTS}`
}

const mark = (ctx) => {
  const [size, left, bottom] = ctx.cls.mark
  return `<img class="bb-mark" src="/kit/brand/unisim-icon-orange.png" alt="UNI·SIM" style="width:${Math.round(size * 0.85)}px;left:${left}px;bottom:${bottom}px">`
}

const ribbon = (left, top, w, h, fork) =>
  `<div class="bb-ribbon" style="left:${Math.round(left)}px;top:${top}px;width:${w}px;height:${h}px;--fork:${fork}px"></div>`

/**
 * 01 and 02 as one scene, `half` 0 or 1: each file shows its half of a
 * double-width stage, so the ribbon on the join cannot drift.
 */
function bookScene(ctx, t, cap, half) {
  const c = ctx.cls, g = geo(ctx), [W, H] = c.stage, { device } = ctx.kit
  const ix = g.index
  const tabs = INDEX.slice(0, ix.n).map((x, i) =>
    `<span class="${i === 0 ? 'hot' : ''}" style="width:${ix.w}px;height:${ix.h}px;font-size:${ix.size}px">${x}</span>`).join('')
  const open = half === 0
  const words = open
    ? `<div class="bb-lock" data-fit style="left:${g.pad}px;width:${W - 2 * g.pad}px;top:${g.lockTop}px;font-size:${g.lock}px"><img src="/icon.png" alt=""><span>${esc(ctx.app)}</span></div>
       <div class="bb-head" data-fit style="left:${g.pad}px;width:${W - g.pad - g.ribbon.w}px;top:${g.headTop}px;font-size:${g.head}px">${lines(t.headline)}</div>
       ${t.sub ? `<div class="bb-sub" style="left:${g.pad}px;width:${W - g.pad - g.ribbon.w - 20}px;bottom:${g.sub}px;font-size:${g.subSize}px">${breaks(t.sub)}</div>` : ''}`
    : `<div class="bb-on-leather" style="position:absolute;inset:0">
         <div class="bb-head" data-fit style="left:${W + g.pad}px;width:${W - 2 * g.pad - ix.w}px;top:${g.closeHead.top}px;font-size:${g.closeHead.size}px">${lines(t.headline)}</div>
         ${t.sub ? `<div class="bb-sub" style="left:${W + g.pad}px;width:${W - 2 * g.pad - ix.w}px;bottom:${g.sub + c.mark[0] + 20}px;font-size:${g.subSize}px">${credit(t.sub)}</div>` : ''}
       </div>`
  const phone = open
    ? device(ctx, cap, { w: g.devW, left: g.open.left, top: g.open.top, rot: g.open.rot, z: 3 })
    : device(ctx, cap, { w: g.devW, left: W + g.close.left, top: g.close.top, rot: g.close.rot, z: 3 })
  return `<div class="bb-scene" style="left:${-half * W}px;width:${2 * W}px;height:${H}px">
    <div class="bb-ground bb-paper" style="left:0;width:${W}px"></div>
    <div class="bb-ground bb-leather" style="left:${W}px;width:${W}px"></div>
    <div class="bb-stitch" style="left:${W + 46}px"></div>
    ${ribbon(W - g.ribbon.w / 2, -10, g.ribbon.w, g.ribbon.h, g.ribbon.fork)}
    ${phone}
    ${open ? '' : `<div class="bb-index" style="left:${2 * W - ix.w}px;top:${ix.top}px;gap:${ix.gap}px">${tabs}</div>`}
    ${words}
  </div>`
}

// The pair fills the output's WIDTH (as the kit's band and sleeve do), so no
// hairline of canvas shows at the join on the 6.5" render.
const fillWidth = (ctx) => ({ ...ctx, fit: ctx.out ? ctx.out[0] / ctx.cls.stage[0] : ctx.fit })

export function bookOpen(ctx, t, [cap]) {
  const c = fillWidth(ctx)
  return stage(c, '', bookScene(c, t, cap, 0))
}

export function bookClose(ctx, t, [cap]) {
  const c = fillWidth(ctx)
  return stage(c, 'bb-on-leather', bookScene(c, t, cap, 1) + mark(c))
}

function bookFeature(tone) {
  return (ctx, t, [cap], hot) => {
    const c = ctx.cls, g = geo(ctx), f = g.feat, [W] = c.stage, { device, deviceHeight } = ctx.kit
    const deckTop = Math.round(f.devTop + deviceHeight(c.frame, f.devW, cap.aspect) + f.gap)
    const chips = (t.chips ?? []).map((x, i) => `<span class="${i === hot ? 'hot' : ''}">${esc(x)}</span>`).join('')
    const leather = tone === 'leather'
    return stage(ctx, leather ? 'bb-on-leather' : '', `
      <div class="bb-ground ${leather ? 'bb-leather' : 'bb-paper'}" style="left:0;width:${W}px"></div>
      ${leather ? `<div class="bb-stitch" style="left:46px"></div><div class="bb-stitch" style="left:${W - 46}px"></div>` : ''}
      ${ribbon(W - f.rib.right - f.rib.w, -10, f.rib.w, f.rib.h, f.rib.fork)}
      <div class="bb-head" data-fit style="left:${g.pad}px;right:${f.rib.right + f.rib.w + 30}px;top:${f.headTop}px;font-size:${f.head}px">${lines(t.headline)}</div>
      ${device(ctx, cap, { w: f.devW, top: f.devTop, center: true, z: 3 })}
      <div class="bb-deck" style="top:${deckTop}px">
        ${t.caption ? `<div class="bb-caption" style="font-size:${f.cap}px">${esc(t.caption)}</div>` : ''}
        ${chips ? `<div class="bb-tabs" style="font-size:${f.chip}px">${chips}</div>` : ''}
      </div>
      ${mark(ctx)}`)
  }
}

export const LAYOUTS = {
  'book-open': bookOpen,
  'book-close': bookClose,
  'book-page': bookFeature('paper'),
  'book-leather': bookFeature('leather'),
}

/** Play's feature graphic: the black cover, its ribbon, the name and the line. */
function bookFeatureGraphic(app, t) {
  return `<div class="bb bb-fg bb-on-leather">
    <div class="bb-ground bb-leather" style="left:0;width:1024px"></div>
    <div class="bb-stitch" style="left:28px"></div><div class="bb-stitch" style="left:996px"></div>
    ${ribbon(800, -10, 64, 430, 44)}
    <div class="bb-lock"><img src="/icon.png" alt=""><span>${esc(app)}</span></div>
    ${t?.tagline ? `<div class="bb-sub">${esc(t.tagline)}</div>` : ''}
  </div>${FONTS}`
}

export const FEATURE_GRAPHICS = { book: bookFeatureGraphic }

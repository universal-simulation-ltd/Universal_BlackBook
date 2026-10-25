import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { htmlToText, importFiles, parseDateLine, parseTimeLine, readBytes, titleFromName } from './noteImport'

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
const p = (text: string, style = '', extra = '') =>
  `<w:p>${style || extra ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extra}</w:pPr>` : ''}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
const li = (text: string, lvl = 0) => p(text, '', `<w:numPr><w:ilvl w:val="${lvl}"/><w:numId w:val="1"/></w:numPr>`)
const styles = `<?xml version="1.0"?><w:styles ${W}>
  <w:style w:type="paragraph" w:styleId="Titel"><w:name w:val="Title"/></w:style>
  <w:style w:type="paragraph" w:styleId="berschrift1"><w:name w:val="heading 1"/></w:style>
</w:styles>`
const docx = (body: string) =>
  zipSync({
    'word/document.xml': strToU8(`<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`),
    'word/styles.xml': strToU8(styles),
    '[Content_Types].xml': strToU8('<Types/>'),
  })

describe('importing notes (OneNote and friends)', () => {
  it('splits a OneNote section exported to Word on its page titles, with each page’s date', () => {
    const notes = readBytes(
      'docx',
      docx(
        p('Shopping', 'Titel') + p('Saturday, 25 October 2026') + p('10:32') + p('Things to buy:') + li('Milk') + li('Oat', 1) +
          p('Ideas &amp; plans', 'Titel') + p('25. Oktober 2026') + p('Line one') + p('') + p('Line two'),
      ),
      'Section.docx',
    )
    expect(notes.map((n) => n.title)).toEqual(['Shopping', 'Ideas & plans'])
    expect(notes[0].details).toBe('Things to buy:\n• Milk\n  • Oat')
    expect(new Date(notes[0].createdAt!)).toEqual(new Date(2026, 9, 25, 10, 32))
    expect(notes[1].details).toBe('Line one\n\nLine two')
    expect(new Date(notes[1].createdAt!)).toEqual(new Date(2026, 9, 25))
  })

  it('a Word file with no titles is one note named after the file, unless it has a heading', () => {
    expect(readBytes('docx', docx(p('Just text') + p('More')), 'My_notes.docx')).toEqual([{ title: 'My notes', details: 'Just text\nMore', file: 'My_notes.docx' }])
    const [one] = readBytes('docx', docx(p('Trip', 'berschrift1') + p('Pack light')), 'x.docx')
    expect(one.title).toBe('Trip')
    expect(one.details).toBe('Pack light')
  })

  it('splits on page breaks when there are no titles', () => {
    const notes = readBytes('docx', docx(p('First page') + p('a') + `<w:p><w:r><w:br w:type="page"/></w:r></w:p>` + p('Second page') + p('b')), 'x.docx')
    expect(notes.map((n) => [n.title, n.details])).toEqual([
      ['First page', 'a'],
      ['Second page', 'b'],
    ])
  })

  it('reads tables as tab-separated rows', () => {
    const table = '<w:tbl><w:tr><w:tc>' + p('A') + '</w:tc><w:tc>' + p('B') + '</w:tc></w:tr></w:tbl>'
    expect(readBytes('docx', docx(p('T', 'Titel') + table), 'x.docx')[0].details).toBe('A\tB')
  })

  it('turns a web page into plain text with its lists, title and created date', () => {
    const html = `<html><head><title>Recipe</title><meta name="created" content="2024-03-01T09:15:00.0000000"></head>
      <body><h1>Recipe</h1><p>Mix &amp; bake.</p><ul><li>Flour</li><li>Eggs<ul><li>Two</li></ul></li></ul><p>Done<br>now</p><script>x()</script></body></html>`
    const [n] = readBytes('html', strToU8(html), 'r.html')
    expect(n.title).toBe('Recipe')
    expect(n.details).toBe('Mix & bake.\n• Flour\n• Eggs\n  • Two\nDone\nnow')
    expect(n.createdAt).toBe(Date.parse('2024-03-01T09:15:00.0000000'))
    expect(htmlToText('<div>a</div><div>b</div>')).toBe('a\nb')
  })

  it('reads OneNote’s Single File Web Page (.mht)', () => {
    const mht = [
      'MIME-Version: 1.0',
      'Content-Type: multipart/related; boundary="----=_NextPart_01"',
      '',
      '------=_NextPart_01',
      'Content-Type: text/html; charset="utf-8"',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      '<html><head><title>Caf=C3=A9 list</title></head><body><p>Lin=',
      'e</p></body></html>',
      '------=_NextPart_01--',
    ].join('\r\n')
    expect(readBytes('mht', strToU8(mht), 'p.mht')).toEqual([{ title: 'Café list', details: 'Line', file: 'p.mht' }])
  })

  it('reads Markdown: the first heading is the title, the rest plain', () => {
    const [n] = readBytes('md', strToU8('# Books\n\nRead **soon**:\n- [x] Emma\n* [Site](https://x.org)\n```\n## Later\n'), 'b.md')
    expect(n.title).toBe('Books')
    expect(n.details).toBe('Read soon:\n• Emma\n• Site (https://x.org)\nLater')
  })

  it('takes a text file whole, named after the file, UTF-16 too', () => {
    const utf16 = new Uint8Array([0xff, 0xfe, ...Array.from('Hi\r\nthere').flatMap((c) => [c.charCodeAt(0), 0])])
    expect(readBytes('txt', utf16, 'note.txt')).toEqual([{ title: 'note', details: 'Hi\nthere', file: 'note.txt' }])
  })

  it('skips what it cannot read, and says why', async () => {
    const file = (name: string, bytes: Uint8Array) => ({ name, size: bytes.length, arrayBuffer: async () => bytes.slice().buffer })
    const res = await importFiles([file('a.pdf', strToU8('x')), file('b.docx', strToU8('not a zip')), file('c.txt', strToU8('  ')), file('d.txt', strToU8('ok'))])
    expect(res.notes.map((n) => n.title)).toEqual(['d'])
    expect(res.skipped).toEqual([
      { file: 'a.pdf', reason: 'type' },
      { file: 'b.docx', reason: 'damaged' },
      { file: 'c.txt', reason: 'empty' },
    ])
  })

  it('reads the dates OneNote writes, in the suite languages', () => {
    expect(parseDateLine('Saturday, 25 October 2026')).toEqual([2026, 9, 25])
    expect(parseDateLine('October 25, 2026')).toEqual([2026, 9, 25])
    expect(parseDateLine('samedi 25 octobre 2026')).toEqual([2026, 9, 25])
    expect(parseDateLine('25 de octubre de 2026')).toEqual([2026, 9, 25])
    expect(parseDateLine('25 Ekim 2026 Cumartesi')).toEqual([2026, 9, 25])
    expect(parseDateLine('2026-02-30')).toBeNull()
    expect(parseDateLine('We met on 25 October 2026 at the pub')).toBeNull()
    expect(parseTimeLine('10:32 PM')).toEqual([22, 32])
    expect(parseTimeLine('09.05')).toEqual([9, 5])
    expect(titleFromName('a_b.c.docx')).toBe('a b.c')
  })
})

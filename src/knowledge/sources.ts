import type { Source } from './types'

// The research, standards and reports behind each article, keyed by article
// id. The same in every language, so kept once here and attached by index.ts.
//
// Original research papers first, then the standards, then guidance — and
// only sources for what the app really does (checked against src/ on
// 2026-09-29: an RFC 4180 CSV parser in lib/csv.ts; birthdays as ISO 8601
// dates or vCard's year-less --MM-DD (RFC 6350 §6.2.5) in lib/birthday.ts;
// RFC 5322 quoted display names for copied email lists in lib/emailList.ts;
// the book in IndexedDB (lib/store.ts); the PIN kept only as a salted
// PBKDF2-SHA-256 digest at 600,000 iterations with doubling lock-outs after
// five misses (lib/lock.ts); the backup as AES-GCM-256 under a PBKDF2-SHA-256
// key via Web Crypto, remembered as a non-extractable CryptoKey
// (lib/vault.ts); and saves guarded by a revision check, `.eq('rev', …)`, so
// two devices conflict instead of overwriting (lib/cloud.ts). Device contacts
// come through @capacitor-community/contacts natively and the Contact Picker
// API in Chrome on Android.
//
// ⚠️ `pdf` (our hosted copy at opensource.unisim.co.uk/kb/papers/) ONLY where
// the licence allows redistribution: US Government works (NIST), CC BY papers,
// and RFCs that the RFC Editor publishes as PDF. Most RFCs here have no PDF
// rendition, so they link the .html. ACM, IACR, Springer (FC) and ISO
// documents link to the free author copy or the publisher's page.

const RFC_4180: Source = {
  kind: 'standard',
  title: 'Common Format and MIME Type for Comma-Separated Values (CSV) Files (RFC 4180)',
  authors: 'Yakov Shafranovich',
  publisher: 'IETF',
  year: 2005,
  href: 'https://www.rfc-editor.org/rfc/rfc4180.html',
}

const NIST_800_132: Source = {
  kind: 'guidance',
  title: 'NIST SP 800-132: Recommendation for Password-Based Key Derivation, Part 1: Storage Applications',
  authors: 'Meltem Sönmez Turan, Elaine Barker, William Burr, Lily Chen',
  publisher: 'NIST',
  year: 2010,
  href: 'https://doi.org/10.6028/NIST.SP.800-132',
  pdf: 'papers/nist-sp-800-132-pbkdf.pdf',
  licence: 'Public domain (US Government work)',
}

const LOCAL_FIRST: Source = {
  kind: 'paper',
  title: 'Local-first software: You own your data, in spite of the cloud',
  authors: 'Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, Mark McGranaghan',
  publisher: 'ACM Onward!',
  year: 2019,
  href: 'https://www.inkandswitch.com/local-first/static/local-first.pdf',
}

export const SOURCES: Record<string, Source[]> = {
  'what-is-a-csv-file': [
    RFC_4180,
    {
      kind: 'paper',
      title: 'Gene name errors are widespread in the scientific literature',
      authors: 'Mark Ziemann, Yotam Eren, Assam El-Osta',
      publisher: 'Genome Biology',
      year: 2016,
      href: 'https://doi.org/10.1186/s13059-016-1044-7',
      pdf: 'papers/gene-name-errors-2016.pdf',
      licence: 'CC BY 4.0 — Ziemann, Eren, El-Osta',
    },
    {
      kind: 'guidance',
      title: 'Using CSV file format',
      publisher: 'Government Digital Service',
      year: 2021,
      href: 'https://www.gov.uk/guidance/using-csv-file-format',
    },
  ],
  'where-your-book-lives': [
    {
      kind: 'standard',
      title: 'Indexed Database API 3.0',
      publisher: 'W3C',
      href: 'https://www.w3.org/TR/IndexedDB/',
    },
    {
      kind: 'standard',
      title: 'Storage Standard',
      publisher: 'WHATWG',
      href: 'https://storage.spec.whatwg.org/',
    },
    LOCAL_FIRST,
  ],
  'importing-and-exporting': [
    RFC_4180,
    {
      kind: 'standard',
      title: 'vCard Format Specification (RFC 6350), §6.2.5: BDAY',
      authors: 'Simon Perreault',
      publisher: 'IETF',
      year: 2011,
      href: 'https://www.rfc-editor.org/rfc/rfc6350.html#section-6.2.5',
    },
    {
      kind: 'standard',
      title: 'ISO 8601-1:2019 — Date and time — Representations for information interchange — Part 1: Basic rules',
      publisher: 'ISO',
      year: 2019,
      href: 'https://www.iso.org/standard/70907.html',
    },
    {
      kind: 'standard',
      title: 'Contact Picker API',
      publisher: 'W3C Devices and Sensors Working Group',
      href: 'https://w3c.github.io/contact-picker/',
    },
  ],
  'tags-lists-and-hiding': [
    {
      kind: 'standard',
      title: 'Internet Message Format (RFC 5322), §3.4: Address Specification',
      authors: 'Pete Resnick (ed.)',
      publisher: 'IETF',
      year: 2008,
      href: 'https://www.rfc-editor.org/rfc/rfc5322.html#section-3.4',
    },
  ],
  'the-pin-lock': [
    {
      kind: 'paper',
      title: 'A birthday present every eleven wallets? The security of customer-chosen banking PINs',
      authors: 'Joseph Bonneau, Sören Preibusch, Ross Anderson',
      publisher: 'Financial Cryptography and Data Security',
      year: 2012,
      href: 'https://www.jbonneau.com/doc/BPA12-FC-banking_pin_security.pdf',
    },
    {
      kind: 'standard',
      title: 'PKCS #5: Password-Based Cryptography Specification Version 2.1 (RFC 8018)',
      authors: 'Kathleen Moriarty, Burt Kaliski, Andreas Rusch',
      publisher: 'IETF',
      year: 2017,
      href: 'https://www.rfc-editor.org/rfc/rfc8018.html',
    },
    NIST_800_132,
    {
      kind: 'guidance',
      title: 'NIST SP 800-63B-4: Digital Identity Guidelines — Authentication and Authenticator Management',
      publisher: 'NIST',
      year: 2025,
      href: 'https://doi.org/10.6028/NIST.SP.800-63B-4',
      pdf: 'papers/nist-sp-800-63b-4-authentication.pdf',
      licence: 'Public domain (US Government work)',
    },
  ],
  'encrypted-online-backup': [
    {
      kind: 'paper',
      title: 'The Security and Performance of the Galois/Counter Mode (GCM) of Operation',
      authors: 'David A. McGrew, John Viega',
      publisher: 'INDOCRYPT',
      year: 2004,
      href: 'https://eprint.iacr.org/2004/193',
    },
    {
      kind: 'standard',
      title: 'NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation — Galois/Counter Mode (GCM) and GMAC',
      authors: 'Morris Dworkin',
      publisher: 'NIST',
      year: 2007,
      href: 'https://doi.org/10.6028/NIST.SP.800-38D',
      pdf: 'papers/nist-sp-800-38d-gcm.pdf',
      licence: 'Public domain (US Government work)',
    },
    {
      kind: 'guidance',
      title: 'Password Storage Cheat Sheet (PBKDF2-HMAC-SHA-256: 600,000 iterations)',
      publisher: 'OWASP',
      href: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html',
    },
    {
      kind: 'standard',
      title: 'Web Cryptography Level 2 (non-extractable CryptoKey)',
      publisher: 'W3C',
      year: 2025,
      href: 'https://www.w3.org/TR/webcrypto/',
    },
  ],
  'using-two-devices': [
    {
      kind: 'paper',
      title: 'On Optimistic Methods for Concurrency Control',
      authors: 'H. T. Kung, John T. Robinson',
      publisher: 'ACM Transactions on Database Systems',
      year: 1981,
      href: 'https://www.eecs.harvard.edu/~htk/publication/1981-tods-kung-robinson.pdf',
    },
    {
      kind: 'standard',
      title: 'HTTP Semantics (RFC 9110), §13.1.1: If-Match and the lost update problem',
      authors: 'Roy T. Fielding, Mark Nottingham, Julian Reschke',
      publisher: 'IETF',
      year: 2022,
      href: 'https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1',
      pdf: 'papers/rfc-9110-http-semantics.pdf',
      licence: 'IETF Trust — RFC, freely redistributable unmodified',
    },
    LOCAL_FIRST,
  ],
}

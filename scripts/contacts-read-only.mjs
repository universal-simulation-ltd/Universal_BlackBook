#!/usr/bin/env node
// Make @capacitor-community/contacts ask Android for READ_CONTACTS only.
//
//   node scripts/contacts-read-only.mjs           (postinstall: warns, never fails)
//   node scripts/contacts-read-only.mjs --strict  (cap:sync: fails if it cannot)
//
// BlackBook only ever READS the phone's contacts: it fills in someone you pick,
// or imports your contacts into your book, and never writes back. The plugin's
// Android side, though, puts READ_CONTACTS and WRITE_CONTACTS under one
// permission alias, and Capacitor treats an alias as granted only when EVERY
// permission in it is granted, and refuses to ask at all ("Missing the
// following permissions in AndroidManifest.xml") when any of them is
// undeclared. So with READ_CONTACTS alone in our manifest the plugin would
// never work, and the only way to make it work unpatched is to ask for write
// access to the user's contacts, which this app has no business holding.
//
// Gradle compiles the plugin straight from node_modules (see
// android/capacitor.settings.gradle), so this one-line edit of its Java source
// is what the Android app is built with. The app never calls the plugin's
// createContact or deleteContact, the only methods that would need write.
//
// AndroidManifest.xml declares READ_CONTACTS and removes WRITE_CONTACTS, so
// even an unpatched build cannot ask for write: it fails closed instead.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const strict = process.argv.includes('--strict')
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = join(
  ROOT,
  'node_modules/@capacitor-community/contacts/android/src/main/java/getcapacitor/community/contacts/ContactsPlugin.java',
)
const READ_WRITE = /strings\s*=\s*\{\s*Manifest\.permission\.READ_CONTACTS\s*,\s*Manifest\.permission\.WRITE_CONTACTS\s*\}/
const READ_ONLY = /strings\s*=\s*\{\s*Manifest\.permission\.READ_CONTACTS\s*\}/

function fail(message) {
  console.error(`contacts-read-only: ${message}`)
  process.exit(strict ? 1 : 0)
}

if (!existsSync(FILE)) fail(`not found: ${FILE}`)
const source = readFileSync(FILE, 'utf8')
if (READ_ONLY.test(source) && !/WRITE_CONTACTS/.test(source)) {
  console.log('contacts-read-only: already read-only')
} else if (READ_WRITE.test(source)) {
  writeFileSync(FILE, source.replace(READ_WRITE, 'strings = { Manifest.permission.READ_CONTACTS }'))
  console.log('contacts-read-only: patched the plugin to ask for READ_CONTACTS only')
} else {
  fail('the plugin source changed shape; check its permission annotation by hand before building Android')
}

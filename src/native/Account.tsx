/* eslint-disable react-refresh/only-export-components -- useBookTitle lives beside the Account group that sets the name it reads */
// The account, on the phone (James, 2026-10-26): "If signed in it should be
// clear from the personalisation — 'Bradley's Book' — as opposed to the
// traditional profile button. On the tuning page there should be an account
// management." BlackBook first, as the test of a rule meant for every app.
//
// So there is no avatar anywhere: the top bar's name IS the signed-in state
// (`useBookTitle`), and everything about the account — the name it shows,
// the online copy, signing out, deleting it — is Tune ▸ Account.

import { useEffect, useState } from 'react'
import { DeleteAccountDialog, signOut, useProfile, useUniversal, useUser } from '@unisim/sdk'
import { usePanelStore } from '../stores/panelStore'
import { useSyncStore } from '../stores/syncStore'
import { useEffectiveTheme } from '../stores/themeStore'
import { useT, type Key } from '../i18n'
import { usePhoneKit } from './kit'
import { Group, LinkRow } from './TuneScreen'

/** First word of the account's name, or null when it has none. */
function firstName(displayName: string | null | undefined): string | null {
  const first = displayName?.trim().split(/\s+/)[0]
  return first ? first : null
}

/**
 * The top bar's name: "BlackBook" signed out, "Bradley's Book" signed in —
 * "My Book" for an account with no name yet (Tune ▸ Account sets one).
 */
export function useBookTitle(): string {
  const t = useT()
  const { user } = useUser()
  const { profile } = useProfile()
  if (!user) return 'BlackBook'
  const name = firstName(profile?.display_name)
  return name ? t('book_of', { name }) : t('book_mine')
}

const BACKUP: Record<string, Key> = {
  'signed-out': 'tune_backup_off',
  off: 'tune_backup_off',
  locked: 'tune_backup_locked',
  on: 'tune_backup_on',
}

export function AccountGroup() {
  const t = useT()
  const { user } = useUser()
  const kit = usePhoneKit()
  const openPanel = usePanelStore((s) => s.open)
  const syncState = useSyncStore((s) => s.state)
  const [signingIn, setSigningIn] = useState(false)

  if (!user) {
    return (
      <Group title={t('tune_account')}>
        <LinkRow label={t('tune_sign_in')} note={t('tune_sign_in_note')} onClick={() => setSigningIn(true)} />
        {signingIn && kit && <kit.SignIn onClose={() => setSigningIn(false)} />}
      </Group>
    )
  }

  return (
    <Group title={t('tune_account')}>
      <NameRow />
      <div className="bb-row">
        <span className="min-w-0 flex-1">{t('tune_email')}</span>
        <span className="value truncate">{user.email}</span>
      </div>
      <LinkRow
        label={t('tune_online_backup')}
        value={t(BACKUP[syncState] ?? 'tune_backup_off')}
        onClick={() => openPanel('cloud')}
      />
      <SignOutRow />
      <DeleteAccountRow email={user.email ?? undefined} />
    </Group>
  )
}

/** The account's name, which names the book. Saved when the box is left. */
function NameRow() {
  const t = useT()
  const { profile, updateProfile } = useProfile()
  const saved = profile?.display_name ?? ''
  const [name, setName] = useState(saved)
  useEffect(() => setName(saved), [saved])
  const save = () => {
    const next = name.trim()
    if (next !== saved.trim()) void updateProfile({ display_name: next || null })
  }
  return (
    <label className="bb-cardpad block">
      <span className="mb-2 block text-[15px] font-medium text-slate-100">{t('tune_name')}</span>
      <input
        className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3 text-[16px] text-slate-100"
        value={name}
        autoComplete="name"
        enterKeyHint="done"
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
      <span className="mt-1.5 block text-[13px] text-slate-500">
        {t('tune_name_note', { book: firstName(name) ? t('book_of', { name: firstName(name)! }) : t('book_mine') })}
      </span>
    </label>
  )
}

/**
 * Sign out, after saying what it does: App's `leaveDevice` takes the book off
 * this phone when all of it is online, and keeps it (with a notice) when not.
 */
function SignOutRow() {
  const t = useT()
  const { supabase } = useUniversal()
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!asking) return <LinkRow label={t('tune_sign_out')} onClick={() => setAsking(true)} />
  return (
    <div className="bb-cardpad space-y-3">
      <p className="text-[15px] text-slate-300">{t('tune_sign_out_ask')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-[44px] rounded-xl bg-orange-600 px-4 text-[15px] font-semibold text-white disabled:opacity-50"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await signOut(supabase)
            setBusy(false)
            setAsking(false)
          }}
        >
          {t('tune_sign_out')}
        </button>
        <button type="button" className="min-h-[44px] rounded-xl px-4 text-[15px] font-semibold text-slate-300" onClick={() => setAsking(false)}>
          {t('c.cancel')}
        </button>
      </div>
    </div>
  )
}

function DeleteAccountRow({ email }: { email?: string }) {
  const t = useT()
  const theme = useEffectiveTheme()
  const [open, setOpen] = useState(false)
  return (
    <>
      <LinkRow label={t('tune_delete_account')} danger onClick={() => setOpen(true)} />
      <DeleteAccountDialog open={open} onClose={() => setOpen(false)} email={email} theme={theme} />
    </>
  )
}

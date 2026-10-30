// The account, on the phone (James, 2026-10-26): "If signed in it should be
// clear from the personalisation — 'Bradley's Book' — as opposed to the
// traditional profile button. On the tuning page there should be an account
// management." BlackBook first, as the test of a rule meant for every app.
//
// So there is no avatar anywhere: the top bar's name IS the signed-in state
// (`useBookTitle`), and everything about the account — the name it shows,
// the online copy, signing out, deleting it — is Tune ▸ Account. The title
// and its choice are shared with the website (../components/bookTitle.ts).

import { useEffect, useRef, useState } from 'react'
import { DeleteAccountDialog, signOut, useAppTitleChoice, useProfile, useUniversal, useUser, type AppTitleChoice } from '@unisim/sdk'
import { personalBookTitle, useBookTitle, useNamedTitle } from '../components/bookTitle'
import { usePanelStore } from '../stores/panelStore'
import { useSettingsStore } from '../stores/settingsStore'
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
 * The choice of name at the top (James, 2026-10-27: "if tap and hold on the
 * [Name]'s book then show a choice to change to 'Your Book'"). Opened by a
 * hold on the name, and by Tune ▸ Account ▸ Book's name.
 */
// ⚠️ `choice` comes from the opener, which stays mounted. The SDK saves a
// choice inside a state updater (useUserPrefs), and the sheet unmounts in the
// same tap that picks — so with its own useAppTitleChoice the pick was lost.
export function BookNameSheet({ choice, onClose }: { choice: AppTitleChoice; onClose: () => void }) {
  const t = useT()
  const kit = usePhoneKit()
  const named = useNamedTitle()
  const yours = t('book_yours')
  const { mode, custom, setMode, setCustom } = choice
  if (!kit) return null
  // "Your Book" is App name's typed name, in the words of the language it was
  // picked in, so the website (which offers typing one) shows the same.
  const picked = mode === 'custom' && custom.trim() ? custom.trim() : null
  const row = 'flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left text-[16px] text-slate-100 active:bg-slate-800'
  const option = (label: string, on: boolean, choose: () => void) => (
    <button
      type="button"
      className={row}
      aria-pressed={on}
      onClick={() => {
        choose()
        onClose()
      }}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {on && (
        <span className="font-semibold text-orange-400" aria-hidden>
          ✓
        </span>
      )}
    </button>
  )
  return (
    <kit.Sheet title={t('book_name_label')} onClose={onClose}>
      {option(named, mode === 'personal' || (mode === 'custom' && !picked), () => setMode('personal'))}
      {option(yours, picked === yours, () => {
        setCustom(yours)
        setMode('custom')
      })}
      {/* A name typed on the website, kept as one of the choices. */}
      {picked && picked !== yours && option(picked, true, () => setMode('custom'))}
      {option('BlackBook', mode === 'product', () => setMode('product'))}
    </kit.Sheet>
  )
}

/**
 * The name in the top bar. Signed in, holding it opens `BookNameSheet`;
 * signed out ("BlackBook") there is nothing to choose.
 */
export function BookTitle() {
  const { user } = useUser()
  const title = useBookTitle()
  const [naming, setNaming] = useState(false)
  const choice = useAppTitleChoice()
  useCarryYourBook(choice)
  const hold = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null)
  const cancel = () => {
    if (hold.current) clearTimeout(hold.current.timer)
    hold.current = null
  }
  // The lift that ends a hold is not a tap: its click would land on the
  // sheet's backdrop, under the finger, and shut the sheet it just opened.
  const swallowClick = () => {
    const swallow = (ev: Event) => {
      ev.preventDefault()
      ev.stopPropagation()
    }
    document.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 600)
  }
  useEffect(() => cancel, [])
  return (
    <>
      <span
        className="truncate select-none"
        style={{ WebkitTouchCallout: 'none' }}
        onContextMenu={(e) => user && e.preventDefault()}
        onTouchStart={(e) => {
          if (!user || e.touches.length !== 1) return
          cancel()
          const { clientX: x, clientY: y } = e.touches[0]
          hold.current = {
            x,
            y,
            timer: setTimeout(() => {
              hold.current = null
              navigator.vibrate?.(12)
              swallowClick()
              setNaming(true)
            }, 450),
          }
        }}
        onTouchMove={(e) => {
          const h = hold.current
          const p = e.touches[0]
          if (h && p && Math.hypot(p.clientX - h.x, p.clientY - h.y) > 10) cancel()
        }}
        onTouchEnd={cancel}
        onTouchCancel={cancel}
      >
        {title}
      </span>
      {naming && <BookNameSheet choice={choice} onClose={() => setNaming(false)} />}
    </>
  )
}

/**
 * "Your Book" was a setting on this phone alone until the website got the
 * title too (2026-10-30). Once signed in, an old pick moves to App name — the
 * choice that follows the account — unless one was made there already.
 */
function useCarryYourBook({ mode, setMode, setCustom }: AppTitleChoice) {
  const t = useT()
  const { user } = useUser()
  const old = useSettingsStore((s) => s.bookYours)
  const set = useSettingsStore((s) => s.set)
  useEffect(() => {
    if (!user || !old) return
    if (mode === 'personal') {
      setCustom(t('book_yours'))
      setMode('custom')
    }
    set({ bookYours: false })
  }, [user, old, mode, set, setCustom, setMode, t])
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
  const [naming, setNaming] = useState(false)
  const choice = useAppTitleChoice()
  const bookTitle = useBookTitle()

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
      <LinkRow label={t('book_name_label')} value={bookTitle} onClick={() => setNaming(true)} />
      {naming && <BookNameSheet choice={choice} onClose={() => setNaming(false)} />}
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
        {t('tune_name_note', { book: personalBookTitle(t, firstName(name) ?? undefined) })}
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

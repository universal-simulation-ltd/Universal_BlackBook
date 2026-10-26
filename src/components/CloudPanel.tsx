import { useEffect, useMemo, useRef, useState } from 'react'
import { SignInDialog, useRevealOnOpen, useUniversal, useUser } from '@unisim/sdk'
import { mergeBooks } from '../lib/merge'
import { payloadTags } from '../lib/cloud'
import { useBookStore } from '../stores/bookStore'
import { offlineMessage, useSyncStore } from '../stores/syncStore'
import { Modal } from './Modal'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, checkboxCls, inputCls, label } from './ui'
import { autoFocusOK, usePhoneKit } from '../native/kit'
import { currentT, useT } from '../i18n'

const MIN_PASSPHRASE = 10

/**
 * The online backup — the Universal ID half of the app.
 *
 * ⚠️ Signing in is the whole of the front door (owner's call, 2026-09-17).
 * There used to be a separate "Save online" step beside the navbar's Sign in,
 * and two ways in read as two features. Since 2026-10-26 signing in starts the
 * backup by itself, without a passphrase (syncStore `hydrate`), and the
 * passphrase is an opt-in here: add, change or remove it. App still opens this
 * panel by itself for a backup WITH one that this device cannot open yet, and
 * for one that was turned off.
 *
 * BlackBook still works completely without an account.
 */
export function CloudPanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { supabase } = useUniversal()
  const { user } = useUser()
  const contacts = useBookStore((s) => s.contacts)
  const tags = useBookStore((s) => s.tags)

  const sync = useSyncStore()
  const [signInOpen, setSignInOpen] = useState(false)
  const kit = usePhoneKit()
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  // Optional, so unticked (the suite rule for tick boxes).
  const [withPassphrase, setWithPassphrase] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [changing, setChanging] = useState<PassphraseMode | null>(null)
  const revealConfirmRef = useRevealOnOpen()

  const busy = sync.status === 'working'

  // Done once the book is open (owner's call, 2026-10-08): entering the
  // passphrase — or choosing one — closes the panel, and the list behind it
  // already holds the online copy with any guest entries merged in. Only when
  // THIS panel saw the backup locked or off: opened from Advanced on a book
  // that is already on, it stays open for Save now and the rest.
  const wasClosed = useRef(sync.state === 'locked' || sync.state === 'off')
  if (sync.state === 'locked' || sync.state === 'off') wasClosed.current = true
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (wasClosed.current && sync.state === 'on' && !sync.pending && sync.status !== 'error') onCloseRef.current()
  }, [sync.state, sync.pending, sync.status])

  // What "Merge" would add, so the question can say so before it is answered.
  const { pending } = sync
  const preview = useMemo(
    () =>
      pending
        ? mergeBooks({ contacts: pending.contacts ?? [], tags: payloadTags(pending) }, { contacts, tags })
        : null,
    [pending, contacts, tags],
  )

  return (
    <>
      <Modal title={t('online_backup')} onClose={onClose} wide>
        <div className="space-y-4">
          <PrivacyNote account={sync.state === 'on' ? !sync.hasPassphrase : sync.state !== 'locked' && !withPassphrase} />

          {sync.state === 'signed-out' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                {t('cp.signin_why')}
              </p>
              <button type="button" className={btnPrimary} onClick={() => setSignInOpen(true)}>
                {t('cp.signin')}
              </button>
              <p className="text-xs text-slate-500">{t('cp.one_account')}</p>
            </div>
          )}

          {sync.state === 'off' && user && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void sync.enable(supabase, user.id, withPassphrase ? passphrase : null, remember)
              }}
            >
              <p className="text-sm text-slate-300">
                {t('cp.signed_in_as')}
                <span className="font-medium text-slate-100">{user.email}</span>
                {t('cp.none_yet')}
              </p>
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className={`${checkboxCls} mt-0.5`}
                  checked={withPassphrase}
                  onChange={(e) => setWithPassphrase(e.target.checked)}
                />
                <span>
                  {t('cp.with_passphrase')}
                  <span className="block text-xs text-slate-500">{t('cp.add_note')}</span>
                </span>
              </label>
              {withPassphrase && (
              <>
              <div>
                <label className={label} htmlFor="cp-pass">
                  {t('cp.passphrase')}
                </label>
                <input
                  id="cp-pass"
                  className={inputCls}
                  type="password"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={t('cp.at_least', { count: MIN_PASSPHRASE })}
                />
              </div>
              <div>
                <label className={label} htmlFor="cp-confirm">
                  {t('cp.again')}
                </label>
                <input
                  id="cp-confirm"
                  className={inputCls}
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className={`${checkboxCls} mt-0.5`}
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>
                  {t('cp.remember')}
                  <span className="block text-xs text-slate-500">{t('cp.remember_note')}</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className={`${checkboxCls} mt-0.5`}
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>
                  {t('cp.ack_before')}
                  <strong className="font-semibold">{t('cp.ack_strong')}</strong>
                  {t('cp.ack_after')}
                </span>
              </label>
              </>
              )}
              <button
                type="submit"
                className={btnPrimary}
                disabled={
                  busy ||
                  (withPassphrase && (!acknowledged || passphrase.length < MIN_PASSPHRASE || passphrase !== confirm))
                }
              >
                {busy ? t('cp.encrypting') : t('cp.turn_on')}
              </button>
              {withPassphrase && passphrase.length > 0 && passphrase.length < MIN_PASSPHRASE && (
                <p className="text-xs text-slate-500">{t('cp.more_chars', { count: MIN_PASSPHRASE })}</p>
              )}
              {withPassphrase && confirm.length > 0 && passphrase !== confirm && (
                <p className="text-xs text-rose-300">{t('cp.mismatch')}</p>
              )}
            </form>
          )}

          {sync.state === 'locked' && user && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void sync.unlock(supabase, user.id, passphrase, remember)
              }}
            >
              <p className="text-sm text-slate-300">
                {t('cp.signed_in_as')}
                <span className="font-medium text-slate-100">{user.email}</span>
                {t('cp.locked')}
              </p>
              <div>
                <label className={label} htmlFor="cp-unlock">
                  {t('cp.passphrase')}
                </label>
                <input
                  id="cp-unlock"
                  className={inputCls}
                  type="password"
                  autoComplete="current-password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoFocus={autoFocusOK()}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className={checkboxCls}
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                {t('cp.remember')}
              </label>
              <button type="submit" className={btnPrimary} disabled={busy || passphrase.length === 0}>
                {busy ? t('cp.downloading') : t('cp.download')}
              </button>
            </form>
          )}

          {pending && preview && (
            <ChoiceBlock
              title={t.plural('cp.merge_title', contacts.length)}
              body={t('cp.merge_body', {
                online: t.plural('c.contacts', pending.contacts.length),
                summary: mergeSummary(preview.added, contacts.length),
              })}
              primary={{ label: t('cp.merge'), onClick: () => void sync.mergePending(supabase) }}
              secondary={{ label: t('cp.online_only'), onClick: () => void sync.adoptPending() }}
            />
          )}

          {sync.status === 'conflict' && !sync.pending && (
            <ChoiceBlock
              title={t('cp.conflict_title')}
              body={t('cp.conflict_body')}
              primary={{ label: t('cp.take_online'), onClick: () => void sync.pull(supabase) }}
              secondary={{
                label: t('cp.keep_device'),
                onClick: () => void sync.push(supabase, true),
              }}
            />
          )}

          {sync.state === 'on' && !sync.pending && sync.status !== 'conflict' && (
            <div className="space-y-3">
              {/* ⚠️ Green only when it is true. A save that did not get through
                  used to leave "backed up online" showing in green directly
                  above the red error that said otherwise (iPhone, 2026-09-29). */}
              {sync.dirty || sync.offline > 0 ? (
                <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 px-3 py-2.5">
                  <p className="text-sm font-medium text-amber-300">{t('cp.unsaved')}</p>
                  <p className="mt-0.5 text-xs text-amber-200/70">
                    {sync.offline > 0 ? t('cp.waiting') : t('bk.saving')}
                    {sync.lastPushedAt && ` ${t('cp.last_saved_sentence', { when: new Date(sync.lastPushedAt).toLocaleString(t.locale) })}`}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-3 py-2.5">
                  <p className="text-sm font-medium text-emerald-300">{t('cp.backed_up')}</p>
                  <p className="mt-0.5 text-xs text-emerald-200/70">
                    {sync.lastPushedAt
                      ? t('cp.last_saved', { when: new Date(sync.lastPushedAt).toLocaleString(t.locale) })
                      : t('cp.encrypted_here')}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} disabled={busy} onClick={() => void sync.push(supabase)}>
                  {t('cp.save_now')}
                </button>
                <button type="button" className={btnGhost} disabled={busy} onClick={() => void sync.pull(supabase)}>
                  {t('cp.fetch')}
                </button>
                {sync.remembered && (
                  <button type="button" className={btnGhost} onClick={() => void sync.forgetDevice()}>
                    {t('cp.forget')}
                  </button>
                )}
                {!changing && sync.hasPassphrase && (
                  <>
                    <button type="button" className={btnGhost} disabled={busy} onClick={() => setChanging('change')}>
                      {t('cp.change')}
                    </button>
                    <button type="button" className={btnGhost} disabled={busy} onClick={() => setChanging('remove')}>
                      {t('cp.remove')}
                    </button>
                  </>
                )}
                {!changing && !sync.hasPassphrase && (
                  <button type="button" className={btnGhost} disabled={busy} onClick={() => setChanging('add')}>
                    {t('cp.add')}
                  </button>
                )}
              </div>
              {changing && (
                <PassphraseForm
                  mode={changing}
                  busy={busy}
                  onSubmit={async (current, next, keep) => {
                    if (await sync.changePassphrase(supabase, current, next, keep)) setChanging(null)
                  }}
                  onCancel={() => setChanging(null)}
                />
              )}
              <div className="border-t border-slate-800 pt-3">
                {confirmDelete ? (
                  <div ref={revealConfirmRef} className="space-y-2">
                    <p className="text-sm text-rose-300">
                      {t('cp.delete_ask')}
                    </p>
                    <div className="flex gap-2">
                      <button type="button" className={btnDanger} onClick={() => void sync.disable(supabase)}>
                        {t('cp.delete_it')}
                      </button>
                      <button type="button" className={btnGhost} onClick={() => setConfirmDelete(false)}>
                        {t('c.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className={btnSubtle} onClick={() => setConfirmDelete(true)}>
                    {t('cp.turn_off')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* The offline message is the amber box above; red as well would say it twice. */}
          {sync.message && !(sync.state === 'on' && sync.message === offlineMessage()) && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                sync.status === 'error' ? 'bg-rose-950/50 text-rose-300' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {sync.message}
            </p>
          )}
        </div>
      </Modal>
      {/* The phone screens sign in on a page of their own, Apple and Google
          in the phone's own sheet (native/SignInScreen.tsx). */}
      {kit ? (
        signInOpen && <kit.SignIn onClose={() => setSignInOpen(false)} />
      ) : (
        <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
      )}
    </>
  )
}

type PassphraseMode = 'add' | 'change' | 'remove'

/**
 * Add, change or remove the online copy's passphrase.
 *
 * Change and remove ask for the current one even when this device remembers
 * the key — see `changePassphrase` in syncStore for why. Adding one has
 * nothing to prove: without a passphrase, signing in already opens the copy.
 */
function PassphraseForm({
  mode,
  busy,
  onSubmit,
  onCancel,
}: {
  mode: PassphraseMode
  busy: boolean
  onSubmit: (current: string | null, next: string | null, remember: boolean) => Promise<void>
  onCancel: () => void
}) {
  const t = useT()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  const revealRef = useRevealOnOpen<HTMLFormElement>()
  const title = { add: t('cp.add'), change: t('cp.change'), remove: t('cp.remove') }[mode]
  const asksNew = mode !== 'remove'
  const ready =
    (mode === 'add' || current.length > 0) &&
    (!asksNew || (acknowledged && next.length >= MIN_PASSPHRASE && next === confirm))

  return (
    <form
      ref={revealRef}
      className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault()
        void onSubmit(mode === 'add' ? null : current, asksNew ? next : null, remember)
      }}
    >
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {mode !== 'add' && (
        <div>
          <label className={label} htmlFor="cp-current">
            {t('cp.current')}
          </label>
          <input
            id="cp-current"
            className={inputCls}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoFocus={autoFocusOK()}
          />
        </div>
      )}
      {asksNew && (
        <>
          <div>
            <label className={label} htmlFor="cp-new">
              {mode === 'add' ? t('cp.passphrase') : t('cp.new')}
            </label>
            <input
              id="cp-new"
              className={inputCls}
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder={t('cp.at_least', { count: MIN_PASSPHRASE })}
              autoFocus={mode === 'add' && autoFocusOK()}
            />
          </div>
          <div>
            <label className={label} htmlFor="cp-new-confirm">
              {mode === 'add' ? t('cp.again') : t('cp.new_again')}
            </label>
            <input
              id="cp-new-confirm"
              className={inputCls}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </>
      )}
      <p className="text-xs text-slate-500">
        {{ add: t('cp.add_note'), change: t('cp.change_note'), remove: t('cp.remove_note') }[mode]}
      </p>
      {mode === 'add' && (
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className={`${checkboxCls} mt-0.5`}
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>
            {t('cp.remember')}
            <span className="block text-xs text-slate-500">{t('cp.remember_note')}</span>
          </span>
        </label>
      )}
      {asksNew && (
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className={`${checkboxCls} mt-0.5`}
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>
            {t('cp.ack_before')}
            <strong className="font-semibold">{t('cp.ack_strong')}</strong>
            {mode === 'add' ? t('cp.ack_after') : t('cp.ack_new_after')}
          </span>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary} disabled={busy || !ready}>
          {busy ? t('cp.reencrypting') : title}
        </button>
        <button type="button" className={btnGhost} onClick={onCancel}>
          {t('c.cancel')}
        </button>
      </div>
      {asksNew && next.length > 0 && next.length < MIN_PASSPHRASE && (
        <p className="text-xs text-slate-500">{t('cp.more_chars', { count: MIN_PASSPHRASE })}</p>
      )}
      {asksNew && confirm.length > 0 && next !== confirm && (
        <p className="text-xs text-rose-300">{t('cp.mismatch')}</p>
      )}
    </form>
  )
}

/** How many of this device's contacts a merge would actually bring in. */
function mergeSummary(added: number, local: number): string {
  const t = currentT()
  if (added === 0) return t('cp.merge_none')
  if (added === local) return t('cp.merge_all', { count: local })
  return t('cp.merge_some', { count: added, rest: local - added })
}

/**
 * What protects the online copy, said honestly for each kind: without a
 * passphrase its key is kept with the account, so "we cannot read your book"
 * would not be true there.
 */
function PrivacyNote({ account }: { account: boolean }) {
  const t = useT()
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
      <p>
        <strong className="font-semibold text-slate-200">{t(account ? 'cp.privacy_account_strong' : 'cp.privacy_strong')}</strong>{' '}
        {t(account ? 'cp.privacy_account' : 'cp.privacy')}
      </p>
    </div>
  )
}

function ChoiceBlock({
  title,
  body,
  primary,
  secondary,
}: {
  title: string
  body: string
  primary: { label: string; onClick: () => void }
  secondary: { label: string; onClick: () => void }
}) {
  return (
    <div className="space-y-2.5 rounded-xl border border-orange-900/60 bg-orange-950/20 px-3 py-3">
      <p className="text-sm font-semibold text-orange-200">{title}</p>
      <p className="text-sm text-slate-300">{body}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={primary.onClick}>
          {primary.label}
        </button>
        <button type="button" className={btnGhost} onClick={secondary.onClick}>
          {secondary.label}
        </button>
      </div>
    </div>
  )
}

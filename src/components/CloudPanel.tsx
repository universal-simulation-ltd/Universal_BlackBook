import { useState } from 'react'
import { SignInDialog, useUniversal, useUser } from '@unisim/sdk'
import { useBookStore } from '../stores/bookStore'
import { useSyncStore } from '../stores/syncStore'
import { Modal } from './Modal'
import { btnDanger, btnGhost, btnPrimary, btnSubtle, checkboxCls, inputCls, label } from './ui'

const MIN_PASSPHRASE = 10

/**
 * "Save my book online" — the Universal ID half of the app.
 *
 * Everything here is opt-in and reversible. BlackBook works completely without
 * an account; this exists so a book survives a lost laptop and turns up on a
 * phone, and it is deliberately described in those terms rather than as
 * "sync", which promises a merge this does not do.
 */
export function CloudPanel({ onClose }: { onClose: () => void }) {
  const { supabase } = useUniversal()
  const { user } = useUser()
  const contacts = useBookStore((s) => s.contacts)

  const sync = useSyncStore()
  const [signInOpen, setSignInOpen] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const busy = sync.status === 'working'

  return (
    <>
      <Modal title="Save online" onClose={onClose} wide>
        <div className="space-y-4">
          <PrivacyNote />

          {sync.state === 'signed-out' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Sign in with your Universal ID and BlackBook can keep an encrypted copy of your book, so
                it survives a lost device and opens on your phone.
              </p>
              <button type="button" className={btnPrimary} onClick={() => setSignInOpen(true)}>
                Sign in with Universal ID
              </button>
              <p className="text-xs text-slate-500">
                One account across every UNI·SIM app. BlackBook works perfectly well without one — your
                book stays on this device.
              </p>
            </div>
          )}

          {sync.state === 'off' && user && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void sync.enable(supabase, user.id, passphrase, remember)
              }}
            >
              <p className="text-sm text-slate-300">
                Signed in as <span className="font-medium text-slate-100">{user.email}</span>. Choose a
                passphrase to encrypt your book with — it never leaves this device.
              </p>
              <div>
                <label className={label} htmlFor="cp-pass">
                  Passphrase
                </label>
                <input
                  id="cp-pass"
                  className={inputCls}
                  type="password"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={`At least ${MIN_PASSPHRASE} characters`}
                />
              </div>
              <div>
                <label className={label} htmlFor="cp-confirm">
                  Passphrase again
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
                  Remember on this device
                  <span className="block text-xs text-slate-500">
                    Keeps the key here so you don't retype the passphrase. Leave it off on a shared
                    computer.
                  </span>
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
                  I understand there is <strong className="font-semibold">no way to recover</strong> this
                  passphrase. Lose it and the online copy is gone for good.
                </span>
              </label>
              <button
                type="submit"
                className={btnPrimary}
                disabled={
                  busy ||
                  !acknowledged ||
                  passphrase.length < MIN_PASSPHRASE ||
                  passphrase !== confirm
                }
              >
                {busy ? 'Encrypting…' : `Save ${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'} online`}
              </button>
              {passphrase.length > 0 && passphrase.length < MIN_PASSPHRASE && (
                <p className="text-xs text-slate-500">A few more characters — {MIN_PASSPHRASE} minimum.</p>
              )}
              {confirm.length > 0 && passphrase !== confirm && (
                <p className="text-xs text-rose-300">The two passphrases don't match.</p>
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
                You have an online copy saved. Enter the passphrase you chose to open it.
              </p>
              <div>
                <label className={label} htmlFor="cp-unlock">
                  Passphrase
                </label>
                <input
                  id="cp-unlock"
                  className={inputCls}
                  type="password"
                  autoComplete="current-password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className={checkboxCls}
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember on this device
              </label>
              <button type="submit" className={btnPrimary} disabled={busy || passphrase.length === 0}>
                {busy ? 'Opening…' : 'Unlock'}
              </button>
            </form>
          )}

          {sync.pending && (
            <ChoiceBlock
              title="Two books"
              body={`This device has ${contacts.length} ${
                contacts.length === 1 ? 'contact' : 'contacts'
              }; the online copy has ${sync.pending.contacts.length}. Only one can be kept — whichever you don't choose is replaced.`}
              primary={{ label: 'Use the online copy', onClick: () => void sync.adoptPending() }}
              secondary={{
                label: 'Keep this device, overwrite online',
                onClick: () => void sync.discardPending(supabase),
              }}
            />
          )}

          {sync.status === 'conflict' && !sync.pending && (
            <ChoiceBlock
              title="Saved somewhere else too"
              body="Another device saved a newer copy since this one last synced. Choose which to keep — the other is replaced."
              primary={{ label: 'Take the newer online copy', onClick: () => void sync.pull(supabase) }}
              secondary={{
                label: 'Keep this device, overwrite online',
                onClick: () => void sync.push(supabase, true),
              }}
            />
          )}

          {sync.state === 'on' && !sync.pending && sync.status !== 'conflict' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-3 py-2.5">
                <p className="text-sm font-medium text-emerald-300">Saving online is on</p>
                <p className="mt-0.5 text-xs text-emerald-200/70">
                  {sync.lastPushedAt
                    ? `Last saved ${new Date(sync.lastPushedAt).toLocaleString('en-GB')}`
                    : 'Encrypted on this device before it is sent.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} disabled={busy} onClick={() => void sync.push(supabase)}>
                  Save now
                </button>
                <button type="button" className={btnGhost} disabled={busy} onClick={() => void sync.pull(supabase)}>
                  Fetch online copy
                </button>
                {sync.remembered && (
                  <button type="button" className={btnGhost} onClick={() => void sync.forgetDevice()}>
                    Forget this device
                  </button>
                )}
              </div>
              <div className="border-t border-slate-800 pt-3">
                {confirmDelete ? (
                  <div className="space-y-2">
                    <p className="text-sm text-rose-300">
                      Delete the online copy? Your book stays on this device — only the encrypted copy on
                      our servers is removed.
                    </p>
                    <div className="flex gap-2">
                      <button type="button" className={btnDanger} onClick={() => void sync.disable(supabase)}>
                        Delete it
                      </button>
                      <button type="button" className={btnGhost} onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className={btnSubtle} onClick={() => setConfirmDelete(true)}>
                    Turn off and delete the online copy
                  </button>
                )}
              </div>
            </div>
          )}

          {sync.message && (
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
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </>
  )
}

function PrivacyNote() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
      <p>
        <strong className="font-semibold text-slate-200">We cannot read your book.</strong> It is
        encrypted in your browser with a passphrase only you know, and the server stores bytes it has no
        key for. That matters here more than in most apps: the names, emails and notes in a BlackBook
        belong to people who never signed up for anything.
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

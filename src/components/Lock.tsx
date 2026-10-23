import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { onlyDigits, PIN_LENGTH } from '../lib/lock'
import { useLockStore, type PinResult } from '../stores/lockStore'
import ProductLogo from './Header/ProductLogo'
import { Modal } from './Modal'
import { autoFocusOK } from '../native/kit'
import { useT, type Translator } from '../i18n'
import { btnDanger, btnGhost, btnPrimary, inputBase, label } from './ui'

/**
 * The keypad the app opens on when a PIN is set.
 *
 * ⚠️ It replaces the whole page rather than covering it — no navbar actions,
 * no menu, no list underneath. A lock screen drawn ON TOP of the app is a lock
 * screen you can screenshot around, scroll behind, or defeat by exporting the
 * book from a menu that is still there; and on a phone it is one rubber-band
 * scroll away from showing the names it is meant to be hiding.
 */
export function LockScreen() {
  const unlock = useLockStore((s) => s.unlock)
  const blockedUntil = useLockStore((s) => s.blockedUntil)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const waiting = useCountdown(blockedUntil)
  const t = useT()

  const submit = async (value: string) => {
    if (busy) return
    setBusy(true)
    setError(errorFor(await unlock(value), t))
    setPin('')
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 pt-[env(safe-area-inset-top)] text-slate-200">
      <main className="gutter mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {/* The mark is `aria-hidden`, so the product is NAMED here — this
              screen is the whole app for as long as it is up, and the navbar
              that usually does the naming is not rendered behind it. */}
          <div className="flex items-center gap-2">
            <ProductLogo />
            <h1 className="text-lg font-semibold text-slate-100">Universal BlackBook</h1>
          </div>
          <p className="text-sm text-slate-400">
            <span aria-hidden className="mr-1">&#128274;</span>
            {t('lock.locked', { count: PIN_LENGTH })}
          </p>
        </div>

        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            void submit(pin)
          }}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20"
        >
          <PinInput
            id="lock-pin"
            name={t('lock.pin')}
            value={pin}
            autoFocus
            disabled={busy || waiting > 0}
            onChange={(v) => {
              setPin(v)
              setError(null)
              // Submitted as soon as the fourth digit lands. The PIN is a fixed
              // length, so there is nothing a Enter keypress would add beyond a
              // second deliberate action for a value that cannot be extended.
              if (v.length === PIN_LENGTH) void submit(v)
            }}
          />
          {waiting > 0 ? (
            <p className="mt-3 text-center text-sm text-rose-300" role="alert">
              {t.plural('lock.wait', waiting)}
            </p>
          ) : (
            error && (
              <p className="mt-3 text-center text-sm text-rose-300" role="alert">
                {error}
              </p>
            )
          )}
          {/* Mostly a fallback: the fourth digit submits on its own. It stays
              because a form whose only submit is a side effect of typing is
              one that a screen reader user cannot see the end of. */}
          <button
            type="submit"
            className={`${btnPrimary} mt-4 w-full`}
            disabled={busy || waiting > 0 || pin.length !== PIN_LENGTH}
          >
            {busy ? t('lock.checking') : t('lock.unlock')}
          </button>
        </form>

        <Forgotten />
      </main>
    </div>
  )
}

/**
 * "Forgotten your PIN?" — and the way back is to throw this device away.
 *
 * ⚠️ **The reset does not just clear the PIN, and it must never be changed so
 * that it does.** The book sits in IndexedDB in the clear (see lib/lock.ts), so
 * a reset that opened the door without the PIN would be a bypass that any
 * stranger holding the phone could use, and the lock would protect nobody. What
 * this offers instead is the trade that keeps both halves honest: the door
 * opens, and the room behind it is emptied. Somebody who is not the owner
 * gains nothing they could not already do by deleting the app; the owner gets
 * a working app back instead of a phone they have to reinstall.
 *
 * ⚠️ **Which warning is shown depends on whether a push has actually landed**,
 * not on whether sync is set up — see `hasOnlineCopy`. Telling somebody their
 * book will come back when it will not is worse than telling them nothing, so
 * "could not tell" is shown as the unrecoverable case.
 *
 * The confirmation is a typed word, not a second button. A two-tap destructive
 * action on the screen a thief is already looking at is one fumble away from
 * being the thief's best outcome; typing DELETE is deliberate in a way that
 * tapping is not.
 */
function Forgotten() {
  const t = useT()
  // The word typed to confirm, in the language on screen ("DELETE", "LÖSCHEN").
  const RESET_WORD = t('reset.word').toLocaleUpperCase(t.locale)
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState<boolean | null | 'checking'>('checking')
  const hasOnlineCopy = useLockStore((s) => s.hasOnlineCopy)
  const resetDevice = useLockStore((s) => s.resetDevice)

  // Asked only once the panel is opened: it is a disk read, and until somebody
  // says they have forgotten the PIN there is no reason to have gone looking.
  useEffect(() => {
    if (!open) return
    let live = true
    void hasOnlineCopy().then((v) => live && setOnline(v))
    return () => {
      live = false
    }
  }, [open, hasOnlineCopy])

  const confirm = async () => {
    if (busy || typed !== RESET_WORD) return
    setBusy(true)
    await resetDevice()
    // No success state and no `setBusy(false)`: `resetDevice` reloads the page,
    // so this component is on its way out. Anything drawn here would be a
    // flash of the wrong thing.
  }

  return (
    <div className="mt-6">
      <div className="text-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          {t('lock.forgotten')}
        </button>
      </div>
      {open && (
        <div id={panelId} className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">
          <p className="text-xs leading-relaxed text-slate-400">
            {t('lock.forgotten_body')}
          </p>

          {online === 'checking' ? (
            <p className="mt-3 text-xs text-slate-500">{t('lock.checking_online')}</p>
          ) : online === true ? (
            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-xs leading-relaxed text-slate-300">
              <p className="font-semibold text-slate-100">{t('lock.online_yes')}</p>
              <p className="mt-1">{t('lock.online_yes_body')}</p>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-rose-900/60 bg-rose-950/30 px-3 py-2.5 text-xs leading-relaxed text-rose-200">
              <p className="font-semibold">
                {online === null
                  ? t('lock.online_unknown')
                  : t('lock.online_no')}
              </p>
              <p className="mt-1">{t('lock.online_no_body')}</p>
            </div>
          )}

          <label className={`${label} mt-4`} htmlFor="lock-reset-confirm">
            {t('lock.type_word', { word: RESET_WORD })}
          </label>
          <input
            id="lock-reset-confirm"
            className={`${inputBase} w-full`}
            value={typed}
            disabled={busy}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value.toLocaleUpperCase(t.locale))}
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className={btnGhost}
              disabled={busy}
              onClick={() => {
                setOpen(false)
                setTyped('')
              }}
            >
              {t('lock.keep_trying')}
            </button>
            <button
              type="button"
              className={btnDanger}
              disabled={busy || typed !== RESET_WORD}
              onClick={() => void confirm()}
            >
              {busy ? t('lock.erasing') : t('lock.erase')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The lock's one settings screen, opened from the padlock link under the page
 * title. Two shapes, decided by whether a PIN is already set: turn it on, or
 * turn it off with the PIN that is on.
 *
 * Changing a PIN is deliberately not a third shape — turning it off and on
 * again is two dialogs' worth of the same thing, and every extra route into
 * this code is another way to end up with a record that no PIN opens.
 */
export function LockPanel({ onClose }: { onClose: () => void }) {
  const record = useLockStore((s) => s.record)
  const t = useT()
  return (
    <Modal title={record ? t('lock.panel_on') : t('lock.panel_off')} onClose={onClose}>
      {record ? <TurnOff onDone={onClose} /> : <TurnOn onDone={onClose} />}
    </Modal>
  )
}

function TurnOn({ onDone }: { onDone: () => void }) {
  const setPinLock = useLockStore((s) => s.setPin)
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const t = useT()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (pin.length !== PIN_LENGTH) return setError(t('lock.digits', { count: PIN_LENGTH }))
    // Checked here rather than only by the button's disabled state: a mismatch
    // is the one mistake with a lasting cost, because the PIN that gets saved
    // is the one nobody typed twice.
    if (pin !== again) return setError(t('lock.mismatch'))
    setBusy(true)
    const result = await setPinLock(pin)
    setBusy(false)
    if (result === 'ok') return onDone()
    setError(errorFor(result, t))
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-400">{t('lock.will_ask')}</p>

      <PinInput
        id="lock-new"
        name={t('lock.choose', { count: PIN_LENGTH })}
        value={pin}
        autoFocus={autoFocusOK()}
        disabled={busy}
        onChange={(v) => {
          setPin(v)
          setError(null)
        }}
      />
      <PinInput
        id="lock-again"
        name={t('bk.repeat')}
        value={again}
        disabled={busy}
        onChange={(v) => {
          setAgain(v)
          setError(null)
        }}
      />

      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}

      {/* ⚠️ Said BEFORE the PIN is set, not after it is forgotten — this is the
          only moment the person can still do anything about it. There IS a
          reset now, and the warning names what it costs rather than claiming
          there is no way out: an accurate warning is the one that gets read
          twice, and "no way to reset" stopped being true. */}
      <div className="rounded-xl border border-orange-900/60 bg-orange-950/30 px-3 py-2.5 text-xs leading-relaxed text-orange-200">
        <p className="font-semibold">{t('lock.no_reset')}</p>
        <p className="mt-1">{t('lock.no_reset_body')}</p>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        {t('lock.not_encryption')}
      </p>

      <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
        <button type="button" className={btnGhost} onClick={onDone}>
          {t('c.cancel')}
        </button>
        <button
          type="submit"
          className={btnPrimary}
          disabled={busy || pin.length !== PIN_LENGTH || again.length !== PIN_LENGTH}
        >
          {busy ? t('lock.locking') : t('lock.lock')}
        </button>
      </div>
    </form>
  )
}

function TurnOff({ onDone }: { onDone: () => void }) {
  const removePin = useLockStore((s) => s.removePin)
  const blockedUntil = useLockStore((s) => s.blockedUntil)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const waiting = useCountdown(blockedUntil)
  const t = useT()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const result = await removePin(pin)
    setBusy(false)
    if (result === 'ok') return onDone()
    setPin('')
    setError(errorFor(result, t))
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-400">{t('lock.asks')}</p>
      <PinInput
        id="lock-current"
        name={t('lock.enter_off')}
        value={pin}
        autoFocus={autoFocusOK()}
        disabled={busy || waiting > 0}
        onChange={(v) => {
          setPin(v)
          setError(null)
        }}
      />
      {waiting > 0 ? (
        <p className="text-sm text-rose-300" role="alert">
          {t.plural('lock.wait', waiting)}
        </p>
      ) : (
        error && (
          <p className="text-sm text-rose-300" role="alert">
            {error}
          </p>
        )
      )}
      <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
        <button type="button" className={btnGhost} onClick={onDone}>
          {t('lock.keep_on')}
        </button>
        <button
          type="submit"
          className={btnDanger}
          disabled={busy || waiting > 0 || pin.length !== PIN_LENGTH}
        >
          {busy ? t('lock.checking') : t('lock.turn_off')}
        </button>
      </div>
    </form>
  )
}

/**
 * One PIN box.
 *
 * `inputMode="numeric"` gets the phone keypad; `onlyDigits` is what actually
 * enforces the four digits, because an input mode is a hint and a hardware
 * keyboard ignores it. `type="password"` masks it — over-the-shoulder is half
 * of what the lock is for — and `autoComplete="off"` keeps a browser from
 * offering to remember it as a password for the site.
 */
function PinInput({
  id,
  name,
  value,
  onChange,
  autoFocus = false,
  disabled = false,
}: {
  id: string
  name: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  disabled?: boolean
}) {
  return (
    <div>
      <label className={label} htmlFor={id}>
        {name}
      </label>
      <input
        id={id}
        className={`${inputBase} w-full text-center text-lg tracking-[0.6em] tabular-nums`}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        // Sets iOS's keyboard to digits and stops Safari suggesting a strong
        // password over the field.
        pattern="[0-9]*"
        maxLength={PIN_LENGTH}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={(e) => onChange(onlyDigits(e.target.value))}
      />
    </div>
  )
}

/** Seconds left on a cooldown, ticking down to 0. */
function useCountdown(until: number): number {
  const [left, setLeft] = useState(() => secondsLeft(until))
  // Kept in a ref so the interval below can be created once per cooldown
  // rather than once per tick.
  const target = useRef(until)
  target.current = until

  useEffect(() => {
    setLeft(secondsLeft(until))
    if (until <= Date.now()) return
    const t = setInterval(() => setLeft(secondsLeft(target.current)), 250)
    return () => clearInterval(t)
  }, [until])

  return left
}

function secondsLeft(until: number): number {
  return Math.max(0, Math.ceil((until - Date.now()) / 1000))
}

function errorFor(result: PinResult, t: Translator): string | null {
  switch (result) {
    case 'ok':
      return null
    case 'bad':
      return t('lock.digits', { count: PIN_LENGTH })
    case 'wait':
      return t('lock.wait_moment')
    case 'wrong':
      return t('lock.wrong')
  }
}

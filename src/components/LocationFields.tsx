import { useEffect, useId, useState } from 'react'
import {
  countryName,
  divisionWord,
  loadGeo,
  suggestCountries,
  suggestDivisions,
  suggestTowns,
  townFills,
  type Location,
  type Suggestion,
} from '../lib/geo'
import { useT, type Key } from '../i18n'
import { inputCls, label, textareaCls } from './ui'

const WORD: Record<ReturnType<typeof divisionWord>, Key> = {
  county: 'loc.county',
  state: 'loc.state',
  province: 'loc.province',
  region: 'loc.region',
}

/**
 * Place (optional), Street, City, County, Country (James, 2026-10-25), with
 * City, County and Country suggested from real lists (lib/geo.ts, GeoNames,
 * offline). The lists load when this opens. A town picked from the list
 * fills its county and country; anything typed that is not in a list is kept
 * as typed. The County box is named as the country names it: County, State,
 * Province or Region.
 */
export function LocationFields({ value, onChange, withPlace = true }: { value: Location; onChange: (next: Location) => void; withPlace?: boolean }) {
  const t = useT()
  const ids = useId()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let live = true
    loadGeo()
      .then(() => live && setReady(true))
      .catch(() => {
        // Offline and never loaded: the boxes still take what is typed.
      })
    return () => {
      live = false
    }
  }, [])
  const set = (p: Partial<Location>) => {
    const next = { ...value, ...p }
    for (const k of Object.keys(next) as (keyof Location)[]) if (!next[k]) delete next[k]
    onChange(next)
  }
  // The country box shows the name; the code is what is kept.
  const [countryText, setCountryText] = useState(() => countryName(value.country, t.locale))
  useEffect(() => setCountryText(countryName(value.country, t.locale)), [value.country, t.locale])
  const word = WORD[divisionWord(value.country)]

  return (
    <div className="space-y-4">
      {withPlace && (
        <div>
          <label htmlFor={`${ids}-p`} className={label}>
            {t('loc.place')}
          </label>
          <input id={`${ids}-p`} className={inputCls} value={value.place ?? ''} placeholder={t('place.name_placeholder')} onChange={(e) => set({ place: e.target.value })} />
        </div>
      )}
      <div>
        <label htmlFor={`${ids}-s`} className={label}>
          {t('loc.street')}
        </label>
        <textarea id={`${ids}-s`} className={textareaCls} rows={2} value={value.street ?? ''} onChange={(e) => set({ street: e.target.value })} />
      </div>
      <SuggestInput
        id={`${ids}-c`}
        label={t('loc.city')}
        value={value.city ?? ''}
        onChange={(city) => set({ city })}
        suggest={(q) => (ready ? suggestTowns(q, { country: value.country, county: value.county, locale: t.locale }) : [])}
        onPick={(s) => set(s.town ? townFills(s.town) : { city: s.value })}
      />
      <SuggestInput
        id={`${ids}-d`}
        label={t(word)}
        value={value.county ?? ''}
        onChange={(county) => set({ county })}
        suggest={(q) => (ready ? suggestDivisions(q, value.country) : [])}
        onPick={(s) => set({ county: s.value })}
      />
      <SuggestInput
        id={`${ids}-n`}
        label={t('loc.country')}
        value={countryText}
        onChange={(text) => {
          setCountryText(text)
          // Typed in full and it is a country: keep its code; else as typed.
          const exact = ready ? suggestCountries(text, t.locale, 1).find((s) => s.value.toLowerCase() === text.trim().toLowerCase()) : undefined
          set({ country: exact?.code ?? text })
        }}
        suggest={(q) => (ready ? suggestCountries(q, t.locale) : [])}
        onPick={(s) => {
          setCountryText(s.value)
          set({ country: s.code ?? s.value })
        }}
      />
    </div>
  )
}

/**
 * A box with a short list of suggestions under it while you type: tap one (or
 * arrow down and Enter) to take it. An inline list, not a popup, so it works
 * the same in a phone sheet and a website dialog.
 */
function SuggestInput({
  id,
  label: name,
  value,
  onChange,
  suggest,
  onPick,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  suggest: (q: string) => Suggestion[]
  onPick: (s: Suggestion) => void
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const list = open && value.trim() ? suggest(value) : []
  const shown = list.length === 1 && list[0].value === value ? [] : list
  const pick = (s: Suggestion) => {
    onPick(s)
    setOpen(false)
    setActive(-1)
  }
  return (
    <div>
      <label htmlFor={id} className={label}>
        {name}
      </label>
      <input
        id={id}
        className={inputCls}
        value={value}
        role="combobox"
        aria-expanded={shown.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!shown.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(shown.length - 1, a + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(0, a - 1))
          } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault()
            pick(shown[active])
          } else if (e.key === 'Escape') setOpen(false)
        }}
      />
      {shown.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="mt-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {shown.map((s, i) => (
            <li key={`${s.value}-${s.detail ?? ''}-${i}`} id={`${id}-o${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className={`flex w-full flex-col items-start px-3 py-2 text-left ${i === active ? 'bg-slate-800' : 'hover:bg-slate-800'}`}
              >
                <span className="text-sm text-slate-100">{s.value}</span>
                {s.detail && <span className="text-xs text-slate-500">{s.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

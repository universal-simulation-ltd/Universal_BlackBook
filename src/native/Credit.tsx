import { Fragment } from 'react'
import { useT } from '../i18n'

/**
 * Who made it, in BlackBook's own words — the app's one pointer outward
 * (store-listings §8: no "More from UNI·SIM" row; each app stands alone).
 * *James Markey MBE* links to jamesmarkey.co.uk and *the UNI·SIM team* to
 * unisim.co.uk (James, 2026-10-20). The sentence is a whole sentence per
 * language with the two links as `{james}` and `{team}`, so a translation can
 * put them wherever its grammar wants them.
 */
export function Credit() {
  const t = useT()
  const nodes: Record<string, JSX.Element> = {
    james: (
      <a href="https://jamesmarkey.co.uk" target="_blank" rel="noreferrer">
        James Markey MBE
      </a>
    ),
    team: (
      <a href="https://www.unisim.co.uk" target="_blank" rel="noreferrer">
        {t('credit_team')}
      </a>
    ),
  }
  const parts = t('credit_line').split(/(\{\w+\})/)
  return (
    <p className="bb-credit">
      {parts.map((part, i) => {
        const m = /^\{(\w+)\}$/.exec(part)
        return <Fragment key={i}>{m && nodes[m[1]] ? nodes[m[1]] : part}</Fragment>
      })}
    </p>
  )
}

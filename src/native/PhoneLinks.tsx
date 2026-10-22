// Links in a note, company or address, on the phone. The same guard as the
// website's (@unisim/sdk's link check: an address that hides where it really
// goes stops first and says so), but the warning is a bottom sheet rather than
// the SDK's dialog — no website popups on the phone.

import { Fragment, useState } from 'react'
import { classifyLink, linkifyText, linkReasonText, linkSafetyCopy, useLanguage, type LinkVerdict } from '@unisim/sdk'
import { Sheet } from './layers'

const openLink = (href: string) => window.open(href, '_blank', 'noopener')

export function PhoneLinkified({ text, linkClassName }: { text: string; linkClassName?: string }) {
  const { language } = useLanguage()
  const [asking, setAsking] = useState<LinkVerdict | null>(null)
  const copy = linkSafetyCopy(language)

  return (
    <>
      {linkifyText(text).map((seg, i) =>
        seg.href ? (
          <a
            key={i}
            href={seg.href}
            className={linkClassName}
            onClick={(e) => {
              e.preventDefault()
              const verdict = classifyLink(seg.href!)
              if (verdict.risky || !verdict.href) setAsking(verdict)
              else openLink(verdict.href)
            }}
          >
            {seg.text}
          </a>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
      {asking && (
        <Sheet title={asking.href ? copy.titleRisky : copy.titleBlocked} onClose={() => setAsking(null)}>
          {asking.host && (
            <p className="text-[15px] text-slate-400">
              {copy.goesTo} <span className="break-all font-semibold text-slate-100">{asking.host}</span>
            </p>
          )}
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-slate-300">
            {asking.reasons.map((r) => (
              <li key={r}>{linkReasonText(r, language, { host: asking.host, scheme: asking.scheme })}</li>
            ))}
          </ul>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              className="min-h-[48px] rounded-xl bg-orange-500 text-[16px] font-semibold text-slate-950"
              onClick={() => setAsking(null)}
            >
              {asking.href ? copy.cancel : copy.close}
            </button>
            {asking.href && (
              <button
                type="button"
                className="min-h-[48px] rounded-xl text-[16px] font-medium text-rose-400"
                onClick={() => {
                  const href = asking.href!
                  setAsking(null)
                  openLink(href)
                }}
              >
                {copy.openAnyway}
              </button>
            )}
          </div>
        </Sheet>
      )}
    </>
  )
}

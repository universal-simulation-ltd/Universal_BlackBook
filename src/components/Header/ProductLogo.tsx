// GENERATED FILE — do not edit by hand.
// Source: backoffice/universal-platform/scripts/app-marks/marks.mjs
// Regenerate: node scripts/app-marks/build.mjs (from backoffice/universal-platform)
// Mark: Universal BlackBook — A little black book — thumb-index tabs down the edge, ribbon still in it.
// Hover: The tabs fan out one after another and the ribbon is drawn further out.
//
// Icon-only by design: the SDK's UniversalAppsNavBar renders the product name
// from its catalogue beside this slot, so a wordmark here would print it twice.

const CSS = `
  /* Resting states */
  .uam-blackbook-tab1 { transform: translateX(0); transition: transform .3s cubic-bezier(0.16,1,0.3,1) 0s; }
  .uam-blackbook-tab2 { transform: translateX(0); transition: transform .3s cubic-bezier(0.16,1,0.3,1) .05s; }
  .uam-blackbook-tab3 { transform: translateX(0); transition: transform .3s cubic-bezier(0.16,1,0.3,1) .1s; }
  .uam-blackbook-ribbon { transform: translateY(0); transition: transform .45s cubic-bezier(0.16,1,0.3,1); }

  /* Active states */
  .uam-host-blackbook:hover .uam-blackbook-tab1,
  .uam-host-blackbook:focus-visible .uam-blackbook-tab1 { transform: translateX(1.5px); }
  .uam-host-blackbook:hover .uam-blackbook-tab2,
  .uam-host-blackbook:focus-visible .uam-blackbook-tab2 { transform: translateX(1.5px); }
  .uam-host-blackbook:hover .uam-blackbook-tab3,
  .uam-host-blackbook:focus-visible .uam-blackbook-tab3 { transform: translateX(1.5px); }
  .uam-host-blackbook:hover .uam-blackbook-ribbon,
  .uam-host-blackbook:focus-visible .uam-blackbook-ribbon { transform: translateY(3px); }

  @media (prefers-reduced-motion: reduce) {
    .uam-blackbook-tab1,
    .uam-blackbook-tab2,
    .uam-blackbook-tab3,
    .uam-blackbook-ribbon { transition: none !important; }
  }
`

export default function ProductLogo() {
  return (
    <span
      className="uam-host-blackbook inline-flex h-6 w-6 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <style>{CSS}</style>
      <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden="true">
        <defs>
          <linearGradient id="uam-nav-blackbook-tile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fe8c01" />
            <stop offset="1" stopColor="#e05504" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#uam-nav-blackbook-tile)" />
        <rect x={16} y={7} width={32} height={40} rx={4} fill="#ffffff" />
        <rect x={16} y={7} width={6} height={40} rx={3} fill="#fdba74" />
        <rect x={40.5} y={18} width={6} height={3} rx={1.5} fill="#e05504" className="uam-blackbook-tab1" />
        <rect x={40.5} y={26} width={6} height={3} rx={1.5} fill="#e05504" className="uam-blackbook-tab2" />
        <rect x={40.5} y={34} width={6} height={3} rx={1.5} fill="#e05504" className="uam-blackbook-tab3" />
        <path d="M28.5 45 h7 v12 l-3.5 -3.5 -3.5 3.5 z" fill="#ffffff" className="uam-blackbook-ribbon" />
      </svg>
    </span>
  )
}

import { useId } from 'react'
import { inkFor, type Pattern } from '../lib/patterns'

/**
 * A tag's mark: the plain dot, or the same colour in a pattern (lib/patterns.ts)
 * — dots, stripes, a star, rings, checks. Drawn in a 14-unit box so it sits in
 * the chip's icon slot, the cards' lights and the Tags panel alike. The
 * pattern's marks are dark on a light colour and white on a dark one, inside
 * the shape, so they read the same on either page.
 */
export function TagMark({ colour, pattern, className }: { colour: string; pattern?: Pattern; className?: string }) {
  const clip = useId().replace(/:/g, '')
  const ink = inkFor(colour)
  const box = { viewBox: '0 0 14 14', className, 'aria-hidden': true as const }
  switch (pattern) {
    case 'dots':
      return (
        <svg {...box}>
          <circle cx="7" cy="7" r="6" fill={colour} />
          {[
            [4.9, 4.9],
            [9.1, 4.9],
            [4.9, 9.1],
            [9.1, 9.1],
          ].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="1.25" fill={ink} />
          ))}
        </svg>
      )
    case 'stripes':
      return (
        <svg {...box}>
          <clipPath id={clip}>
            <circle cx="7" cy="7" r="6" />
          </clipPath>
          <circle cx="7" cy="7" r="6" fill={colour} />
          <g clipPath={`url(#${clip})`} stroke={ink} strokeWidth="1.5">
            <path d="M-1 7 7 -1M1 13 13 1M7 15 15 7" />
          </g>
        </svg>
      )
    case 'stars':
      return (
        <svg {...box}>
          <path
            d="M7 .6l1.9 4.1 4.5.5-3.4 3 1 4.4L7 10.4l-4 2.2 1-4.4-3.4-3 4.5-.5Z"
            fill={colour}
            stroke={ink}
            strokeOpacity="0.35"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'rings':
      return (
        <svg {...box}>
          <circle cx="7" cy="7" r="5.2" fill="none" stroke={colour} strokeWidth="2.2" />
          <circle cx="7" cy="7" r="1.9" fill={colour} />
        </svg>
      )
    case 'checks':
      return (
        <svg {...box}>
          <rect x="1.2" y="1.2" width="11.6" height="11.6" rx="2.4" fill={colour} />
          <path d="M1.2 1.2h5.8v5.8H1.2zM7 7h5.8v5.8H7z" fill={ink} fillOpacity="0.55" />
        </svg>
      )
    default:
      return (
        <svg {...box}>
          <circle cx="7" cy="7" r="4" fill={colour} />
        </svg>
      )
  }
}

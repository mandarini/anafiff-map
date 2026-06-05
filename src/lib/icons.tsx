import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

function base({ size = 20, ...rest }: IconProps): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  }
}

export function TextIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <line x1="6" y1="8" x2="18" y2="8" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="6" y1="16" x2="14" y2="16" />
    </svg>
  )
}

export function ImageIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M4 17l4.5-4.5 4 4 3-3L20 17" />
    </svg>
  )
}

export function AudioIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <rect x="9.5" y="3.5" width="5" height="11" rx="2.5" />
      <path d="M6 11.5a6 6 0 0 0 12 0" />
      <line x1="12" y1="17.5" x2="12" y2="20.5" />
      <line x1="9" y1="20.5" x2="15" y2="20.5" />
    </svg>
  )
}

export function FlagIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <line x1="5.5" y1="3" x2="5.5" y2="21" />
      <path d="M5.5 4h11l-2.5 3.5L16.5 11h-11" />
    </svg>
  )
}

export function LocateIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden>
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="8" />
      <line x1="12" y1="1.5" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22.5" y2="12" />
    </svg>
  )
}

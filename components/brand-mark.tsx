import { BRAND_RED, PLAY_PATH } from '@/lib/brand'

/** Just the play triangle; colour it with `fill-*` from the caller. */
export function PlayMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={PLAY_PATH} />
    </svg>
  )
}

/** The full logo: white triangle on the red rounded square. */
export function BrandBadge({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg bg-brand ${className}`}>
      <PlayMark className="h-1/2 w-1/2 fill-white" />
    </span>
  )
}

/**
 * The same badge as one self-contained SVG with no CSS, for `next/og`.
 * Satori draws inline SVG directly; data-URI <img> sources resolve in dev but
 * come out blank when the metadata routes are prerendered at build time.
 */
export function BrandBadgeSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5.5" fill={BRAND_RED} />
      <path d={PLAY_PATH} fill="#ffffff" />
    </svg>
  )
}

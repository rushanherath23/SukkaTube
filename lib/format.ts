/** 999 → "999", 1500 → "1.5K", 2_000_000 → "2M". */
function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(value)
}

export function formatViews(views: number): string {
  return views === 1 ? '1 view' : `${compact(views)} views`
}

export function formatLikes(likes: number): string {
  return likes === 1 ? '1 like' : `${compact(likes)} likes`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function formatTimeAgo(iso: string): string {
  const elapsed = (Date.now() - new Date(iso).getTime()) / 1000
  if (elapsed < 60) return 'just now'

  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (elapsed >= seconds) return relative.format(-Math.floor(elapsed / seconds), unit)
  }
  return 'just now'
}

/** A stable colour per uploader, used for the avatar circle. */
export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360
  return `hsl(${hash} 65% 45%)`
}

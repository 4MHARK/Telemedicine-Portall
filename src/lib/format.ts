/** Presentation helpers for dates and counts. */

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? '—' : dateTimeFormatter.format(new Date(ms))
}

/** "No availability" when the provider has nothing free (nextAvailableAt: null). */
export function formatAvailability(value: string | null): string {
  return value ? formatDateTime(value) : 'No availability'
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB'] as const
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const unit = units[exponent] ?? 'B'
  const value = bytes / 1024 ** exponent
  return `${exponent === 0 ? Math.round(value) : value.toFixed(1)} ${unit}`
}

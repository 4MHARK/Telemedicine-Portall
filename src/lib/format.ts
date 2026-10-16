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

/** Formats an ISO timestamp for a `datetime-local` input's value, in the viewer's local time zone. */
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const localMs = date.getTime() - date.getTimezoneOffset() * 60_000
  return new Date(localMs).toISOString().slice(0, 16)
}

/** Parses a `datetime-local` input's value (local time, no zone) back into an ISO timestamp. */
export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString()
}

export function formatSessionTimeRange(startTime: string, endTime: string | null): string {
  const start = new Date(startTime)
  const dateLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const startLabel = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (!endTime) return `${dateLabel} · ${startLabel}`
  const endLabel = new Date(endTime).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${dateLabel} · ${startLabel} – ${endLabel}`
}

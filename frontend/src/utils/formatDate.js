// R2: one shared date formatter (was copied into 4 views).
// Dates are stored as UTC midnight, so format in UTC to avoid off-by-one days.

// '2026-10-29T00:00:00.000Z' -> '10/29/2026'
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d)) return ''
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${month}/${day}/${d.getUTCFullYear()}`
}

// '2026-10-29T00:00:00.000Z' -> '2026-10-29' (for <input type="date">)
export function toInputDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return isNaN(d) ? '' : d.toISOString().slice(0, 10)
}

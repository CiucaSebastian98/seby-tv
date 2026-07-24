/** "18:30" din Date, în ora locală. */
export function formatTime(date) {
  if (!(date instanceof Date)) return ''
  return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
}

/** Prima literă a numelui, pentru fallback de logo. */
export function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?'
}

/** "Joi, 24 iul." din Date — etichetă de zi pentru grila EPG. */
export function formatDayLabel(date) {
  if (!(date instanceof Date)) return ''
  const s = date.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Cheie de zi (YYYY-MM-DD, oră locală) pentru a detecta schimbarea zilei. */
export function dayKey(date) {
  if (!(date instanceof Date)) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

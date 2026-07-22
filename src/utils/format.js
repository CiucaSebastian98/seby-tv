/** "18:30" din Date, în ora locală. */
export function formatTime(date) {
  if (!(date instanceof Date)) return ''
  return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
}

/** Prima literă a numelui, pentru fallback de logo. */
export function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?'
}

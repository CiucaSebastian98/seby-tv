/**
 * Serviciu EPG: descarcă un XMLTV (opțional .gz), îl parsează și îl indexează
 * pe channel id. iptv-org folosește channel id ca `channel` în XMLTV, deci
 * cheia se potrivește direct cu `channel.id` din catalog.
 *
 * Fără sursă configurată (EPG_URL gol) întoarce un index gol — UI degradează elegant.
 */

/** XMLTV: "20260722180000 +0000" -> Date */
function parseXmltvDate(value) {
  if (!value) return null
  // Grupuri: YYYYMMDDHHMMSS + offset opțional
  const m = value.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/,
  )
  if (!m) return null
  const [, y, mo, d, h, mi, s = '00', tz] = m
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${formatTz(tz)}`
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatTz(tz) {
  if (!tz) return 'Z'
  return `${tz.slice(0, 3)}:${tz.slice(3)}` // +0200 -> +02:00
}

/** Descarcă text, decomprimând gzip dacă e cazul (.gz sau content-encoding). */
async function fetchXmltvText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`EPG: ${res.status} ${res.statusText}`)

  const isGzip =
    url.endsWith('.gz') ||
    (res.headers.get('content-type') || '').includes('gzip')

  if (isGzip && typeof DecompressionStream !== 'undefined' && res.body) {
    const stream = res.body.pipeThrough(new DecompressionStream('gzip'))
    return new Response(stream).text()
  }
  return res.text()
}

/**
 * @returns {{byChannel: Object<string, Array<{start, stop, title, desc}>>}}
 */
export async function fetchEpg(url) {
  if (!url) return { byChannel: {} }

  const text = await fetchXmltvText(url)
  const doc = new DOMParser().parseFromString(text, 'application/xml')

  if (doc.querySelector('parsererror')) {
    throw new Error('EPG: XMLTV invalid')
  }

  const byChannel = {}
  for (const el of doc.querySelectorAll('programme')) {
    const channel = el.getAttribute('channel')
    if (!channel) continue
    const start = parseXmltvDate(el.getAttribute('start'))
    const stop = parseXmltvDate(el.getAttribute('stop'))
    if (!start) continue

    const entry = {
      start,
      stop,
      title: el.querySelector('title')?.textContent?.trim() || '',
      desc: el.querySelector('desc')?.textContent?.trim() || '',
    }
    if (!byChannel[channel]) byChannel[channel] = []
    byChannel[channel].push(entry)
  }

  // Sortăm programele cronologic per canal.
  for (const list of Object.values(byChannel)) {
    list.sort((a, b) => a.start - b.start)
  }

  return { byChannel }
}

/**
 * Din lista de programe a unui canal, întoarce ce e „acum" și „urmează".
 * @returns {{now: object|null, next: object|null}}
 */
export function pickNowNext(programmes, at = new Date()) {
  if (!programmes || programmes.length === 0) return { now: null, next: null }
  let now = null
  let next = null
  for (let i = 0; i < programmes.length; i++) {
    const p = programmes[i]
    const ends = p.stop || (programmes[i + 1] && programmes[i + 1].start)
    if (p.start <= at && (!ends || at < ends)) {
      now = p
      next = programmes[i + 1] || null
      break
    }
    if (p.start > at) {
      next = p
      break
    }
  }
  return { now, next }
}

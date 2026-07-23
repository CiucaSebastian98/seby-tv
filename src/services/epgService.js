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

/**
 * Formatul compact servit de proxy (`/epg`): deja potrivit cu tvg-id-urile din
 * playlist și redus la fereastra utilă. Convertim doar datele în obiecte Date.
 */
function fromProxyJson(payload) {
  const byChannel = {}
  for (const [id, list] of Object.entries(payload.byChannel || {})) {
    byChannel[id] = list
      .map((p) => ({
        start: new Date(p.s),
        stop: p.e ? new Date(p.e) : null,
        title: p.t || '',
        desc: p.d || '',
      }))
      .filter((p) => !Number.isNaN(p.start.getTime()))
  }
  return { byChannel }
}

/**
 * @returns {{byChannel: Object<string, Array<{start, stop, title, desc}>>}}
 */
export async function fetchEpg(url) {
  if (!url) return { byChannel: {} }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`EPG: ${res.status} ${res.statusText}`)

  // Proxy-ul propriu răspunde JSON; orice altă sursă e XMLTV (eventual gzip).
  const ctype = res.headers.get('content-type') || ''
  if (ctype.includes('application/json')) {
    return fromProxyJson(await res.json())
  }

  const isGzip = url.endsWith('.gz') || ctype.includes('gzip')
  const text =
    isGzip && typeof DecompressionStream !== 'undefined' && res.body
      ? await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).text()
      : await res.text()

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

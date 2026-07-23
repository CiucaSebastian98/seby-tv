import { gunzipSync } from 'node:zlib'

/**
 * EPG: descarcă un XMLTV, îl potrivește cu canalele din playlist și îl reduce
 * la un JSON compact pe care browserul îl poate mesteca instant.
 *
 * De ce pe server și nu în browser:
 *  - sursa nu trimite CORS, deci fetch-ul din pagină ar fi blocat;
 *  - fișierul are ~54 MB decomprimat și ~36.000 de programe — parsarea în
 *    browser ar bloca firul principal secunde bune, pe telefon mult mai mult.
 *
 * Potrivirea canalelor e problema reală: playlist-ul folosește `Antena1.ro@SD`,
 * XMLTV-ul folosește `Antena.1.ro`. Normalizăm ambele (litere mici, doar
 * alfanumerice, fără sufixul @FEED) și, ca plasă de siguranță, încercăm și
 * potrivirea după numele afișat.
 */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decodeXml(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X'
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}

/** Cheie de potrivire: „Antena.1.ro" și „Antena1.ro@SD" ajung amândouă „antena1ro". */
export function normalizeId(id) {
  return String(id).replace(/@.*/, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** XMLTV: „20260723180000 +0200" → ISO. Fără offset, tratăm ca UTC. */
function toIso(value) {
  const m = String(value).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/)
  if (!m) return null
  const [, y, mo, d, h, mi, s = '00', tz] = m
  const off = tz ? `${tz.slice(0, 3)}:${tz.slice(3)}` : 'Z'
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${off}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`))
  return m ? decodeXml(m[1]) : ''
}

const inner = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`))
  return m ? decodeXml(m[1]).trim() : ''
}

/**
 * @param {string} xml
 * @param {Array<{tvgId: string, name: string}>} playlist canalele de păstrat
 * @param {{fromMs: number, toMs: number}} window fereastra de timp păstrată
 */
export function buildEpgIndex(xml, playlist, { fromMs, toMs }) {
  // 1. Indexăm canalele din XMLTV: normalizat → id real.
  const byNormId = new Map()
  const byNormName = new Map()
  for (const block of xml.match(/<channel\b[\s\S]*?<\/channel>/g) || []) {
    const id = attr(block.slice(0, block.indexOf('>') + 1), 'id')
    if (!id) continue
    byNormId.set(normalizeId(id), id)
    const display = inner(block, 'display-name')
    if (display) {
      const k = normalizeId(display)
      if (!byNormName.has(k)) byNormName.set(k, id)
    }
  }

  // 2. Pentru fiecare canal din playlist, găsim id-ul din EPG.
  //    `wanted`: id EPG → lista de tvg-id-uri din playlist care îl folosesc
  //    (mai multe feed-uri, ex. @SD și @HD, pot împărți același program).
  const wanted = new Map()
  const matched = []
  for (const ch of playlist) {
    if (!ch.tvgId) continue
    const epgId =
      byNormId.get(normalizeId(ch.tvgId)) ||
      byNormName.get(normalizeId(ch.tvgId)) ||
      byNormName.get(normalizeId(ch.name))
    if (!epgId) continue
    if (!wanted.has(epgId)) wanted.set(epgId, [])
    wanted.get(epgId).push(ch.tvgId)
    matched.push(ch.tvgId)
  }

  // 3. Extragem doar programele canalelor cerute, din fereastra de timp.
  const byChannel = {}
  for (const block of xml.match(/<programme\b[\s\S]*?<\/programme>/g) || []) {
    const head = block.slice(0, block.indexOf('>') + 1)
    const targets = wanted.get(attr(head, 'channel'))
    if (!targets) continue

    const start = toIso(attr(head, 'start'))
    if (!start) continue
    const startMs = Date.parse(start)
    if (startMs < fromMs || startMs > toMs) continue

    const entry = {
      s: start,
      e: toIso(attr(head, 'stop')),
      t: inner(block, 'title'),
      d: inner(block, 'desc').slice(0, 300),
    }
    for (const id of targets) (byChannel[id] ||= []).push(entry)
  }

  for (const list of Object.values(byChannel)) list.sort((a, b) => (a.s < b.s ? -1 : 1))

  return {
    byChannel,
    stats: {
      playlistChannels: playlist.length,
      matchedChannels: new Set(matched).size,
      withProgrammes: Object.keys(byChannel).length,
      programmes: Object.values(byChannel).reduce((n, l) => n + l.length, 0),
    },
  }
}

/** Descarcă XMLTV (gz sau simplu) și îl întoarce ca text. */
export async function fetchXmltv(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const isGz = buf[0] === 0x1f && buf[1] === 0x8b
  return (isGz ? gunzipSync(buf) : buf).toString('utf8')
}

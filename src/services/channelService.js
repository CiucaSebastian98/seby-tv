import { parseM3U, countryFromTvgId } from './m3uParser.js'
import { STREAM_PROXY, STREAM_TOKEN } from '../constants.js'

/**
 * Cheie deterministă din URL-ul sursă. TREBUIE să fie IDENTICĂ cu `keyFor` din
 * server/index.js, ca rescrierea către proxy să se potrivească.
 *
 * Două „benzi" djb2 independente (64 de biți efectivi în loc de 32): playlist-ul
 * are mii de intrări, iar o coliziune ar însemna că userul cere un canal și
 * primește altul.
 */
function keyFor(url) {
  let h1 = 5381
  let h2 = 52711
  for (let i = 0; i < url.length; i++) {
    const c = url.charCodeAt(i)
    h1 = ((h1 << 5) + h1 + c) >>> 0
    h2 = ((h2 << 5) + h2 + (c ^ 0x5f)) >>> 0
  }
  return h1.toString(36) + '-' + h2.toString(36)
}

/** Pagina rulează pe https? Atunci sursele http:// sunt blocate (mixed content). */
const IS_HTTPS_PAGE =
  typeof window !== 'undefined' && window.location?.protocol === 'https:'

/**
 * Rutare explicită, pe schemă + extensie (nu „tot ce nu e .m3u8 e MPEG-TS"):
 *
 *   http(s) + .m3u8 / .mpd  → ffmpeg (/stream)        — remux în HLS
 *   http(s) + altceva       → pass-through (/direct-stream) — TS brut, 0% CPU
 *   rtmp/udp/rtsp/…         → ffmpeg (/stream)        — singurul care le poate citi
 *
 * Fără proxy configurat se poate reda doar HLS servit peste un protocol
 * compatibil cu pagina; restul primesc `type: 'unsupported'` + un motiv, ca
 * player-ul să explice concret de ce nu merge.
 */
function resolveStreamUrl(rawUrl) {
  const isHls = /\.m3u8(\?|$)/i.test(rawUrl)
  const isDash = /\.mpd(\?|$)/i.test(rawUrl)
  const isHttp = /^https?:\/\//i.test(rawUrl)

  if (STREAM_PROXY) {
    const key = keyFor(rawUrl)
    if (isHttp && !isHls && !isDash) {
      return {
        url: `${STREAM_PROXY}/direct-stream/${key}?token=${STREAM_TOKEN}`,
        type: 'mpegts',
      }
    }
    return {
      url: `${STREAM_PROXY}/stream/${key}/index.m3u8?token=${STREAM_TOKEN}`,
      type: 'hls',
    }
  }

  if (!isHttp) return { url: rawUrl, type: 'unsupported', reason: 'protocol' }
  if (!isHls) return { url: rawUrl, type: 'unsupported', reason: 'raw-ts' }
  if (IS_HTTPS_PAGE && /^http:\/\//i.test(rawUrl)) {
    return { url: rawUrl, type: 'unsupported', reason: 'mixed-content' }
  }
  return { url: rawUrl, type: 'hls' }
}

/**
 * Suprascrieri de logo pentru canale al căror `tvg-logo` din playlist e mort
 * (ex. link imgur expirat). Cheie = tvg-id (ex. "PROTV.ro@SD"), valoare = URL
 * logo funcțional. Adaugă aici pe măsură ce găsești/hostezi logo-uri bune.
 */
export const LOGO_OVERRIDES = {
  'PROTV.ro@SD': 'https://www.protv.ro/html/assets/logo.svg',
  'PrimaNews.ro@SD': 'https://primanews.ro/assets/imgs/logo-primanews.png',
  'PrimaSport5.ro@SD':
    'https://static.wikia.nocookie.net/logopedia/images/3/3d/Prima_Sport_5_%28new%29.svg/revision/latest?cb=20220416111908',
  'ProArena.ro@SD':
    'https://static.wikia.nocookie.net/logopedia/images/0/0a/Pro_Arena_no_bg.svg/revision/latest?cb=20220407184756',
  'ProCinema.ro@SD':
    'https://static.wikia.nocookie.net/logopedia/images/a/a6/Pro_Cinema_logo_2022.svg/revision/latest?cb=20220419100521',
  'PROTVInternational.ro@SD':
    'https://static.wikia.nocookie.net/logopedia/images/4/4f/PRO_TV_Interna%C8%9Bional_%282017%29.svg/revision/latest?cb=20220821114700',
  'PROTVNews.ro@SD':
    'https://static.wikia.nocookie.net/logopedia/images/8/85/Pro_TV_News_%282017%29.png/revision/latest?cb=20171005155753',
  'SportExtra.ro@SD':
    'https://static.wikia.nocookie.net/logopedia/images/a/a7/Sport_Extra_osb.svg/revision/latest/scale-to-width-down/1000?cb=20250815133118',
}

/**
 * Construiește catalogul din playlist-ul M3U (iptv-org index.m3u).
 * Fiecare intrare M3U are deja canal + URL + logo + categorie, deci nu mai e
 * nevoie de fuzionare channels+streams. `countries.json` (opțional) e folosit
 * doar pentru a afișa nume de țară + steag în loc de coduri seci.
 *
 * Produce EXACT aceeași formă de catalog ca înainte, deci restul aplicației
 * (context, hooks, componente) rămâne neschimbat.
 */

// Diacritice românești -> ASCII (pentru slug-uri curate în URL).
const RO_DIACRITICS = /[ăâîșşțţ]/gi
const RO_MAP = { ă: 'a', â: 'a', î: 'i', ș: 's', ş: 's', ț: 't', ţ: 't' }

/**
 * Slug din numele canalului, pentru URL: "PRO TV (1080p)" -> "pro-tv".
 * Taie sufixele de calitate ((1080p), [Not 24/7]) și normalizează diacriticele.
 */
export function slugify(name) {
  const base = String(name).split(/[([]/)[0] // înainte de "(" sau "["
  return (
    base
      .trim()
      .replace(RO_DIACRITICS, (ch) => RO_MAP[ch.toLowerCase()] || ch)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'canal'
  )
}

/** @returns {Map<string, {name, flag}>} indexat pe cod țară (ex: "ro") */
function indexCountries(countries = []) {
  const map = new Map()
  for (const c of countries) {
    map.set(String(c.code).toLowerCase(), { name: c.name, flag: c.flag || '' })
  }
  return map
}

/**
 * @param {{playlistText: string, countries?: Array}} data
 * @returns {{channels: Array, countries: Array, categories: Array}}
 */
export function buildCatalog({ playlistText, countries = [] }) {
  const countryIndex = indexCountries(countries)
  const entries = parseM3U(playlistText)

  const usedCountries = new Set()
  const usedCategories = new Set()
  const seenIds = new Set()

  const slugCounts = new Map()

  const catalog = []
  entries.forEach((e, i) => {
    if (!e.url) return

    const cc = countryFromTvgId(e.tvgId)
    const country = cc ? countryIndex.get(cc) : null

    // group-title poate conține mai multe categorii separate prin ";".
    const groups = (e.group || '')
      .split(';')
      .map((g) => g.trim())
      .filter(Boolean)
    const categories = groups.length ? groups : ['Necategorizat']

    // Id unic: tvg-id include deja @SD/@HD, dar ne asigurăm contra coliziunilor.
    let id = e.tvgId || `ch-${i}`
    if (seenIds.has(id)) id = `${id}#${i}`
    seenIds.add(id)

    // Slug unic pentru URL (ex: /pro-tv, /antena-1). Coliziuni -> -2, -3...
    const name = e.name || e.tvgId || 'Fără nume'
    let slug = slugify(name)
    const seen = slugCounts.get(slug) || 0
    slugCounts.set(slug, seen + 1)
    if (seen > 0) slug = `${slug}-${seen + 1}`

    if (cc) usedCountries.add(cc)
    categories.forEach((g) => usedCategories.add(g))

    const { url, type, reason } = resolveStreamUrl(e.url)

    catalog.push({
      id,
      slug,
      name,
      logo: LOGO_OVERRIDES[e.tvgId] || e.logo || '',
      countryCode: cc,
      countryName: country?.name || (cc ? cc.toUpperCase() : 'Necunoscut'),
      flag: country?.flag || '',
      categoryIds: categories,
      categoryNames: categories,
      streams: [{ url, type }],
      url,
      type,
      reason: reason || '',
      sourceUrl: e.url,
    })
  })

  catalog.sort((a, b) => a.name.localeCompare(b.name))

  const filterCountries = countries
    .filter((c) => usedCountries.has(String(c.code).toLowerCase()))
    .map((c) => ({ code: String(c.code).toLowerCase(), name: c.name, flag: c.flag || '' }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const filterCategories = [...usedCategories]
    .sort((a, b) => a.localeCompare(b))
    .map((g) => ({ id: g, name: g }))

  return { channels: catalog, countries: filterCountries, categories: filterCategories }
}

/**
 * Împarte canalele în favorite + restul, păstrând ordinea de intrare (alfabetică)
 * în fiecare grup. Pur — folosit pentru a afișa favoritele în capul listei.
 * @returns {{ favorites: Array, rest: Array }}
 */
export function partitionFavorites(channels, favoriteIds) {
  const favSet = favoriteIds instanceof Set ? favoriteIds : new Set(favoriteIds)
  const favorites = []
  const rest = []
  for (const ch of channels) {
    ;(favSet.has(ch.id) ? favorites : rest).push(ch)
  }
  return { favorites, rest }
}

/**
 * Grupează canalele pe categorie (un canal poate apărea în mai multe rânduri,
 * exact ca la Netflix). Ordinea canalelor din intrare (alfabetică) e păstrată.
 * @returns {Array<{id, name, channels}>} sortat alfabetic după numele categoriei
 */
export function groupByCategory(channels) {
  const map = new Map()
  for (const ch of channels) {
    for (const cat of ch.categoryIds) {
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(ch)
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, chans]) => ({ id: name, name, channels: chans }))
}

/**
 * Selector: aplică filtrele (search/country/category) peste catalog.
 * Pur, memoizabil — nu ține state. (neschimbat față de varianta JSON)
 */
export function selectVisibleChannels(channels, filters) {
  const q = filters.search.trim().toLowerCase()
  return channels.filter((ch) => {
    if (filters.country && ch.countryCode !== filters.country) return false
    if (filters.category && !ch.categoryIds.includes(filters.category)) return false
    if (q && !ch.name.toLowerCase().includes(q)) return false
    return true
  })
}

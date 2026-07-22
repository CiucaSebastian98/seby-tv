import { parseM3U, countryFromTvgId } from './m3uParser.js'

/**
 * Construiește catalogul din playlist-ul M3U (iptv-org index.m3u).
 * Fiecare intrare M3U are deja canal + URL + logo + categorie, deci nu mai e
 * nevoie de fuzionare channels+streams. `countries.json` (opțional) e folosit
 * doar pentru a afișa nume de țară + steag în loc de coduri seci.
 *
 * Produce EXACT aceeași formă de catalog ca înainte, deci restul aplicației
 * (context, hooks, componente) rămâne neschimbat.
 */

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

    if (cc) usedCountries.add(cc)
    categories.forEach((g) => usedCategories.add(g))

    catalog.push({
      id,
      name: e.name || e.tvgId || 'Fără nume',
      logo: e.logo || '',
      countryCode: cc,
      countryName: country?.name || (cc ? cc.toUpperCase() : 'Necunoscut'),
      flag: country?.flag || '',
      categoryIds: categories,
      categoryNames: categories,
      streams: [e.url],
      url: e.url,
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

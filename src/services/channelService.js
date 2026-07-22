/**
 * Fuzionează channels + streams într-un catalog redabil.
 * Păstrează DOAR canalele care au cel puțin un stream (deci pot fi redate),
 * și îmbogățește fiecare canal cu numele categoriilor și țării + flag.
 */

/** @returns {Map<string, {name, flag}>} indexat pe cod țară (ex: "RO") */
function indexCountries(countries) {
  const map = new Map()
  for (const c of countries) {
    map.set(c.code, { name: c.name, flag: c.flag || '' })
  }
  return map
}

/** @returns {Map<string, string>} id categorie -> nume */
function indexCategories(categories) {
  const map = new Map()
  for (const cat of categories) map.set(cat.id, cat.name)
  return map
}

/** @returns {Map<string, string[]>} channelId -> listă URL-uri stream */
function indexStreams(streams) {
  const map = new Map()
  for (const s of streams) {
    const id = s.channel
    if (!id || !s.url) continue
    if (!map.has(id)) map.set(id, [])
    map.get(id).push(s.url)
  }
  return map
}

/**
 * @returns {{channels: Array, countries: Array, categories: Array}}
 *   channels — catalog fuzionat, sortat alfabetic
 *   countries/categories — doar cele care apar efectiv în catalog (pt. filtre)
 */
export function buildCatalog({ channels, streams, categories, countries }) {
  const countryIndex = indexCountries(countries)
  const categoryIndex = indexCategories(categories)
  const streamIndex = indexStreams(streams)

  const usedCountries = new Set()
  const usedCategories = new Set()

  const catalog = []
  for (const ch of channels) {
    const urls = streamIndex.get(ch.id)
    if (!urls || urls.length === 0) continue // fără stream => nu-l putem reda
    if (ch.closed || ch.replaced_by) continue // canal închis/migrat

    const country = countryIndex.get(ch.country)
    const categoryNames = (ch.categories || []).map(
      (id) => categoryIndex.get(id) || id,
    )

    usedCountries.add(ch.country)
    ;(ch.categories || []).forEach((id) => usedCategories.add(id))

    catalog.push({
      id: ch.id,
      name: ch.name,
      logo: ch.logo || '',
      countryCode: ch.country,
      countryName: country?.name || ch.country,
      flag: country?.flag || '',
      categoryIds: ch.categories || [],
      categoryNames,
      isNsfw: !!ch.is_nsfw,
      streams: urls,
      url: urls[0], // stream implicit
    })
  }

  catalog.sort((a, b) => a.name.localeCompare(b.name))

  const filterCountries = countries
    .filter((c) => usedCountries.has(c.code))
    .map((c) => ({ code: c.code, name: c.name, flag: c.flag || '' }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const filterCategories = categories
    .filter((c) => usedCategories.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return { channels: catalog, countries: filterCountries, categories: filterCategories }
}

/**
 * Selector: aplică filtrele (search/country/category) peste catalog.
 * Pur, memoizabil — nu ține state.
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

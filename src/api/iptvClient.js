import { endpoints } from './endpoints.js'

// Cache în memorie per sesiune.
const cache = new Map()

async function get(url, parse) {
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Eroare la ${url}: ${res.status} ${res.statusText}`)
  const data = await (parse === 'json' ? res.json() : res.text())
  cache.set(url, data)
  return data
}

/**
 * Descarcă playlist-ul M3U + countries.json (pentru steaguri/nume).
 * countries.json e best-effort: dacă pică, continuăm cu coduri de țară.
 * @returns {Promise<{playlistText: string, countries: Array}>}
 */
export async function fetchIptvData() {
  const playlistPromise = get(endpoints.playlist, 'text')
  const countriesPromise = get(endpoints.countries, 'json').catch(() => [])

  const [playlistText, countries] = await Promise.all([
    playlistPromise,
    countriesPromise,
  ])
  return { playlistText, countries }
}

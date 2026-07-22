import { endpoints } from './endpoints.js'

// Cache în memorie per sesiune (fișierele iptv-org sunt mari și rar se schimbă).
const cache = new Map()

async function getJSON(url) {
  if (cache.has(url)) return cache.get(url)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Eroare la ${url}: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  cache.set(url, data)
  return data
}

/**
 * Descarcă în paralel toate datele necesare din iptv-org.
 * @returns {Promise<{channels, streams, categories, countries}>}
 */
export async function fetchIptvData() {
  const [channels, streams, categories, countries] = await Promise.all([
    getJSON(endpoints.channels),
    getJSON(endpoints.streams),
    getJSON(endpoints.categories),
    getJSON(endpoints.countries),
  ])
  return { channels, streams, categories, countries }
}

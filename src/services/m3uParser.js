/**
 * Parser M3U (playlist iptv-org index.m3u).
 * Format per intrare:
 *   #EXTINF:-1 tvg-id="Name.cc@FEED" tvg-logo="..." group-title="Categorie",Nume canal
 *   [#EXTVLCOPT:...]        (opțional, ignorat)
 *   https://.../stream.m3u8
 *
 * @returns {Array<{tvgId, name, logo, group, url}>}
 */
export function parseM3U(text) {
  const lines = text.split(/\r?\n/)
  const entries = []
  let current = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF')) {
      current = parseExtinf(line)
    } else if (line.startsWith('#')) {
      // #EXTM3U, #EXTVLCOPT, #EXTGRP etc. — nu ne interesează pentru redare web.
      continue
    } else if (current) {
      current.url = line
      entries.push(current)
      current = null
    }
  }

  return entries
}

function parseExtinf(line) {
  const attrs = {}
  const attrRe = /([\w-]+)="([^"]*)"/g
  let m
  while ((m = attrRe.exec(line)) !== null) attrs[m[1]] = m[2]

  return {
    tvgId: attrs['tvg-id'] || '',
    logo: attrs['tvg-logo'] || '',
    group: attrs['group-title'] || '',
    name: extractName(line),
    url: '',
  }
}

/**
 * Numele e textul de după virgula care urmează ultimului atribut.
 * Folosim ultimul `"` ca ancoră ca să nu ne încurce virgulele din atribute/URL.
 */
function extractName(line) {
  const lastQuote = line.lastIndexOf('"')
  const from = lastQuote === -1 ? line.indexOf(':') : lastQuote
  const comma = line.indexOf(',', from)
  return comma === -1 ? '' : line.slice(comma + 1).trim()
}

/** Codul de țară din tvg-id: "Name.cc@FEED" | "Name.cc" -> "cc" (lowercase). */
export function countryFromTvgId(tvgId) {
  const m = String(tvgId).match(/\.([a-z]{2})(?:@|$)/i)
  return m ? m[1].toLowerCase() : ''
}

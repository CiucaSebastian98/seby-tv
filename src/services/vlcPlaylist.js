/**
 * Generează un fișier `.m3u` pentru „Open in VLC" și îl oferă la descărcare.
 *
 * Ideea: butonul nu redă prin proxy, ci dă VLC-ului URL-ul ORIGINAL al sursei
 * (`channel.sourceUrl`, de regulă ip:port TS brut). VLC îl decodează nativ, la
 * calitate plină, fără transcodarea serverului — exact ce browserul nu poate face.
 */

/**
 * Construiește conținutul `.m3u` din canal. Întoarce `null` dacă lipsește sursa
 * (butonul se ascunde în acest caz).
 *
 * @param {{name?: string, sourceUrl?: string, userAgent?: string}} channel
 * @returns {string|null}
 */
export function buildM3u(channel) {
  const sourceUrl = channel?.sourceUrl
  if (!sourceUrl) return null

  // Numele din #EXTINF trebuie să stea pe o singură linie (newline-urile ar rupe
  // formatul M3U). Virgulele sunt permise — numele e tot ce urmează primei virgule.
  const name = String(channel.name || 'Canal').replace(/[\r\n]+/g, ' ').trim()

  const lines = ['#EXTM3U', `#EXTINF:-1,${name}`]
  // Unele surse cer un user-agent anume (ex. VLC/…); îl transmitem doar dacă există.
  if (channel.userAgent) {
    lines.push(`#EXTVLCOPT:http-user-agent=${channel.userAgent}`)
  }
  lines.push(sourceUrl)
  return lines.join('\n') + '\n'
}

/**
 * Declanșează descărcarea fișierului `.m3u` în browser. MIME-ul `audio/x-mpegurl`
 * e cel clasic asociat cu VLC, ca sistemul să propună deschiderea cu el.
 *
 * @param {{name?: string, slug?: string, sourceUrl?: string, userAgent?: string}} channel
 * @returns {boolean} false dacă nu s-a putut genera (fără sursă)
 */
export function downloadM3u(channel) {
  const m3u = buildM3u(channel)
  if (!m3u) return false

  const blob = new Blob([m3u], { type: 'audio/x-mpegurl' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${channel.slug || 'canal'}.m3u`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revocăm după un tick, ca descărcarea să apuce să înceapă.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

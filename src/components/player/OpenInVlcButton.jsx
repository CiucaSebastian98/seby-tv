import { useState } from 'react'
import { downloadM3u } from '../../services/vlcPlaylist.js'

/**
 * Buton „Open in VLC": descarcă un `.m3u` cu URL-ul ORIGINAL al sursei, pe care
 * VLC îl redă nativ la calitate plină (fără transcodarea serverului). Sub el, un
 * link discret care copiază URL-ul — util pe mobil, unde `.m3u` nu se
 * auto-deschide mereu în VLC.
 *
 * Se ascunde complet dacă acest canal nu are o sursă directă (`sourceUrl`).
 *
 * @param {{ channel: object }} props
 */
export default function OpenInVlcButton({ channel }) {
  const [copied, setCopied] = useState(false)

  if (!channel?.sourceUrl) return null

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(channel.sourceUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocat (ex. context non-secure) — ignorăm
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => downloadM3u(channel)}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-white shadow-card ring-1 ring-white/10 transition-all hover:scale-[1.02] hover:bg-accent/90"
      >
        <span aria-hidden className="text-lg">▶</span>
        Open in VLC
      </button>

      <button
        onClick={copyUrl}
        className="text-sm text-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
      >
        {copied ? '✓ URL copiat' : 'sau copiază URL-ul pentru VLC'}
      </button>
    </div>
  )
}

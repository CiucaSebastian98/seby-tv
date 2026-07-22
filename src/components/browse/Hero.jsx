import { useEffect, useState } from 'react'
import { useNowNext } from '../../hooks/useEpg.js'
import { initials, formatTime } from '../../utils/format.js'

/**
 * Spotlight-ul de sus (stil Netflix): canal recomandat cu backdrop, EPG now/next
 * și buton de redare focalizabil (un singur item în grila TV).
 */
export default function Hero({ channel, rowIndex, isFocused, registerRef, isFavorite, onSelect }) {
  const { now, next, hasEpg } = useNowNext(channel?.id)
  const [logoBad, setLogoBad] = useState(false)
  useEffect(() => setLogoBad(false), [channel?.id])

  if (!channel) return null

  const focused = isFocused(rowIndex, 0)
  const showLogo = channel.logo && !logoBad

  // imgur redirecționează linkurile expirate către removed.png (161×81), 200 OK.
  const checkLogo = (e) => {
    const img = e.currentTarget
    if (/imgur\.com/.test(img.src) && img.naturalWidth === 161 && img.naturalHeight === 81) {
      setLogoBad(true)
    }
  }

  return (
    <section className="relative mx-8 mt-6 mb-12 overflow-hidden rounded-3xl border border-white/5 md:mx-12 lg:mx-16 animate-fade-in">
      {/* backdrop: glow + logo estompat */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-accent/20" />
      {showLogo && (
        <img
          src={channel.logo}
          alt=""
          aria-hidden
          referrerPolicy="no-referrer"
          className="absolute right-0 top-1/2 h-[130%] -translate-y-1/2 object-contain opacity-20 blur-md"
        />
      )}

      <div className="relative grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
        <div className="max-w-xl">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-2" />
            Acum la TV
          </p>

          <h2 className="font-display text-4xl font-extrabold leading-none tracking-tight text-white md:text-6xl">
            {channel.name}
          </h2>

          <p className="mt-3 text-sm text-zinc-400">
            {channel.flag} {channel.countryName}
            {channel.categoryNames.length ? ` · ${channel.categoryNames.join(' · ')}` : ''}
          </p>

          {hasEpg && now && (
            <p className="mt-4 text-sm text-slate-300">
              <span className="font-semibold text-white">{now.title}</span>
              {next && <span className="text-zinc-400"> · Urmează: {next.title}</span>}
              {now.stop && (
                <span className="block text-xs text-zinc-400">
                  {formatTime(now.start)} – {formatTime(now.stop)}
                </span>
              )}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              ref={registerRef(rowIndex, 0)}
              tabIndex={-1}
              onClick={() => onSelect(channel)}
              className={`flex items-center gap-2 rounded-full px-6 py-3 font-display text-base font-bold outline-none transition-all ${
                focused
                  ? 'scale-105 bg-focus text-black shadow-focus'
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              ▶ Redă
            </button>
          </div>
        </div>

        {/* logo mare (dreapta) */}
        <div className="hidden h-40 w-56 place-items-center rounded-2xl bg-black/40 ring-1 ring-white/10 md:grid">
          {showLogo ? (
            <img
              src={channel.logo}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setLogoBad(true)}
              onLoad={checkLogo}
              className="max-h-28 max-w-44 object-contain"
            />
          ) : (
            <span className="font-display text-5xl font-bold text-zinc-400">
              {initials(channel.name)}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

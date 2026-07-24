import { useEffect, useState } from 'react'
import { useNowNext } from '../../hooks/useEpg.js'
import { initials, formatTime } from '../../utils/format.js'

/** La câte secunde trece automat la următorul canal din carusel. */
const ROTATE_MS = 7000

/**
 * Spotlight-ul de sus (stil Netflix): rotește AUTOMAT printr-o listă de canale
 * (favorite + ultimele vizionate), cu backdrop, EPG now/next și buton de redare.
 * Rotația se oprește la hover, iar punctele de jos permit sărirea manuală.
 * Rămâne un singur item focalizabil în grila TV (butonul „Redă").
 *
 * @param {{ channels: Array, rowIndex, isFocused, registerRef, setPos, onSelect,
 *          onCurrentChange?: (channel) => void }} props
 */
export default function Hero({
  channels,
  rowIndex,
  isFocused,
  registerRef,
  setPos,
  onSelect,
  onCurrentChange,
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [logoBad, setLogoBad] = useState(false)

  const count = channels?.length || 0
  const current = count ? channels[Math.min(index, count - 1)] : null
  const { now, next, hasEpg } = useNowNext(current?.id)

  // Dacă lista se scurtează (ex. scoatem o favorită), readucem indexul în interval.
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0)
  }, [count, index])

  // Reset logo-error + anunțăm canalul curent (pentru Enter din grilă).
  useEffect(() => {
    setLogoBad(false)
    if (current) onCurrentChange?.(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  // Rotație automată — se resetează la fiecare schimbare de index și se oprește
  // la hover sau când e un singur canal.
  useEffect(() => {
    if (paused || count < 2) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearTimeout(t)
  }, [index, paused, count])

  if (!current) return null

  const focused = isFocused(rowIndex, 0)
  const showLogo = current.logo && !logoBad

  // imgur redirecționează linkurile expirate către removed.png (161×81), 200 OK.
  const checkLogo = (e) => {
    const img = e.currentTarget
    if (/imgur\.com/.test(img.src) && img.naturalWidth === 161 && img.naturalHeight === 81) {
      setLogoBad(true)
    }
  }

  return (
    <section
      className="relative mx-8 mt-6 mb-12 overflow-hidden rounded-3xl border border-white/5 md:mx-12 lg:mx-16 animate-fade-in"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* backdrop: glow + logo estompat (reînnoit la fiecare canal) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-accent/20" />
      {showLogo && (
        <img
          key={current.id}
          src={current.logo}
          alt=""
          aria-hidden
          referrerPolicy="no-referrer"
          className="absolute right-0 top-1/2 h-[130%] -translate-y-1/2 object-contain opacity-20 blur-md animate-fade-in"
        />
      )}

      <div className="relative grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
        <div key={current.id} className="max-w-xl animate-fade-in">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-2" />
            Acum la TV
          </p>

          <h2 className="font-display text-4xl font-extrabold leading-none tracking-tight text-white md:text-6xl">
            {current.name}
          </h2>

          <p className="mt-3 text-sm text-zinc-400">
            {current.flag} {current.countryName}
            {current.categoryNames.length ? ` · ${current.categoryNames.join(' · ')}` : ''}
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
              onClick={() => onSelect(current)}
              onMouseEnter={() => setPos({ r: rowIndex, c: 0 })}
              className={`flex items-center gap-2 rounded-full px-6 py-3 font-display text-base font-bold outline-none transition-all ${
                focused
                  ? 'scale-105 bg-focus text-black shadow-focus'
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              ▶ Redă
            </button>
          </div>

          {/* Indicatori de carusel — click = sări la acel canal (și repune pauza). */}
          {count > 1 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {channels.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => setIndex(i)}
                  aria-label={`Arată ${ch.name}`}
                  title={ch.name}
                  className={`h-2 rounded-full transition-all ${
                    i === index
                      ? 'w-6 bg-white'
                      : 'w-2 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* logo mare (dreapta) */}
        <div className="hidden h-40 w-56 place-items-center rounded-2xl bg-black/40 ring-1 ring-white/10 md:grid">
          {showLogo ? (
            <img
              key={current.id}
              src={current.logo}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setLogoBad(true)}
              onLoad={checkLogo}
              className="max-h-28 max-w-44 object-contain animate-fade-in"
            />
          ) : (
            <span className="font-display text-5xl font-bold text-zinc-400">
              {initials(current.name)}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

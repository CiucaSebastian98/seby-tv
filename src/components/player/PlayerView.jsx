import { useEffect, useRef, useState } from 'react'
import { useHlsPlayer } from '../../hooks/useHlsPlayer.js'
import { useNowNext } from '../../hooks/useEpg.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useAppActions, useCurrentChannel } from '../../context/AppContext.jsx'
import { formatTime } from '../../utils/format.js'
import Spinner from '../ui/Spinner.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'

/**
 * Redare pe tot ecranul. Overlay-ul (înapoi / titlu / EPG / favorite) se
 * auto-ascunde după inactivitate. Escape/Backspace = înapoi, f = favorite.
 */
export default function PlayerView() {
  const channel = useCurrentChannel()
  const { setCurrentChannel } = useAppActions()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { now, next, hasEpg } = useNowNext(channel?.id)

  const videoRef = useRef(null)
  const { state, error } = useHlsPlayer(videoRef, channel?.url || null)
  const [showUi, setShowUi] = useState(true)

  const back = () => setCurrentChannel(null)

  // Auto-hide overlay.
  useEffect(() => {
    let t
    const reveal = () => {
      setShowUi(true)
      clearTimeout(t)
      t = setTimeout(() => setShowUi(false), 3500)
    }
    reveal()
    window.addEventListener('mousemove', reveal)
    window.addEventListener('keydown', reveal)
    return () => {
      clearTimeout(t)
      window.removeEventListener('mousemove', reveal)
      window.removeEventListener('keydown', reveal)
    }
  }, [channel?.id])

  // Comenzi telecomandă.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') back()
      else if ((e.key === 'f' || e.key === 'F') && channel) toggleFavorite(channel.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel])

  if (!channel) return null
  const fav = isFavorite(channel.id)

  return (
    <div className="fixed inset-0 z-40 bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        autoPlay
        className="h-full w-full object-contain"
      />

      {/* Overlay superior */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent p-6 transition-opacity duration-300 md:p-8 ${
          showUi ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-4">
          <button
            onClick={back}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/20"
          >
            ← Înapoi
          </button>

          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold md:text-2xl">
              {channel.flag} {channel.name}
            </h2>
            {hasEpg && now && (
              <p className="truncate text-sm text-muted">
                <span className="text-slate-200">{now.title}</span>
                {now.stop ? ` · ${formatTime(now.start)}–${formatTime(now.stop)}` : ''}
                {next ? ` · Urmează: ${next.title}` : ''}
              </p>
            )}
          </div>

          <button
            onClick={() => toggleFavorite(channel.id)}
            className={`ml-auto shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              fav ? 'bg-focus text-black' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {fav ? '★ Favorit' : '☆ Favorite'}
          </button>
        </div>
      </div>

      {state === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <Spinner label="Se conectează la stream…" />
        </div>
      )}

      {state === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="max-w-md">
            <ErrorBanner title="Stream indisponibil" message={error} />
            <button
              onClick={back}
              className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
            >
              ← Înapoi la canale
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

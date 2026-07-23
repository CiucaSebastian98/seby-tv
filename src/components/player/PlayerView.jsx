import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useHlsPlayer } from '../../hooks/useHlsPlayer.js'
import { useNowNext } from '../../hooks/useEpg.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useAppState } from '../../context/AppContext.jsx'
import { formatTime } from '../../utils/format.js'
import Spinner from '../ui/Spinner.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'

/**
 * Redare pe tot ecranul, pe URL propriu (/pro-tv etc.). Canalul e rezolvat din
 * slug-ul din URL. Overlay-ul se auto-ascunde. Escape/Backspace = înapoi, f = favorite.
 */
export default function PlayerView() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { channels } = useAppState()
  const { isFavorite, toggleFavorite } = useFavorites()

  const channel = useMemo(
    () => channels.find((c) => c.slug === slug) || null,
    [channels, slug],
  )
  const { now, next, hasEpg } = useNowNext(channel?.id)

  const videoRef = useRef(null)
  const { state, error, isMutedByPolicy, unmute } = useHlsPlayer(
    videoRef,
    channel?.url || null,
    channel?.type || 'hls',
    channel?.reason || '',
    channel?.proxyUrl || '',
  )
  const [showUi, setShowUi] = useState(true)

  const back = () => navigate('/')

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

  // Sunet „no signal" în buclă cât timp stream-ul e în eroare.
  useEffect(() => {
    if (state !== 'error') return
    const audio = new Audio('/no-signal.mp3')
    audio.loop = true
    audio.volume = 0.5
    audio.play().catch(() => {}) // autoplay poate fi blocat de browser
    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [state])

  // Slug invalid (canal inexistent) → înapoi la răsfoire.
  if (!channel) return <Navigate to="/" replace />
  const fav = isFavorite(channel.id)

  return (
    <div className="fixed inset-0 z-40 bg-black text-white">
      <video
        ref={videoRef}
        controls
        playsInline
        autoPlay
        className="h-full w-full object-contain"
      />

      {/* Fundal GIF la eroare (în spatele barei de sus și al bannerului) */}
      {state === 'error' && (
        <>
          <img
            src="https://i.imgur.com/2346ftT.gif"
            alt=""
            aria-hidden
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </>
      )}

      {/* Overlay superior */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent p-6 transition-opacity duration-300 md:p-8 ${
          showUi ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-4">
          <button
            onClick={back}
            className="shrink-0 whitespace-nowrap rounded-full bg-black/60 px-4 py-2 text-sm font-semibold ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/80"
          >
            ← Înapoi
          </button>

          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold md:text-2xl">
              {channel.flag} {channel.name}
            </h2>
            {hasEpg && now && (
              <p className="truncate text-sm text-zinc-400">
                <span className="text-slate-200">{now.title}</span>
                {now.stop ? ` · ${formatTime(now.start)}–${formatTime(now.stop)}` : ''}
                {next ? ` · Urmează: ${next.title}` : ''}
              </p>
            )}
          </div>

          <button
            onClick={() => toggleFavorite(channel.id)}
            className={`ml-auto shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-1 backdrop-blur transition-colors ${
              fav
                ? 'bg-focus text-black ring-transparent'
                : 'bg-black/60 ring-white/25 hover:bg-black/80'
            }`}
          >
            {fav ? '★ Favorit' : '☆ Favorite'}
          </button>
        </div>
      </div>

      {state === 'loading' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black">
          <Spinner label="Se conectează la stream…" />
        </div>
      )}

      {isMutedByPolicy && state === 'playing' && (
        <button
          onClick={unmute}
          className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 animate-pulse rounded-full bg-accent px-6 py-3 text-base font-bold text-white shadow-lg ring-2 ring-white/30 transition-all hover:scale-105 hover:bg-accent/90"
        >
          🔊 Apasă pentru sunet
        </button>
      )}

      {state === 'error' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
          <div className="pointer-events-auto max-w-md rounded-2xl bg-black/80 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
            <ErrorBanner title="Stream indisponibil" message={error} />
            <div className="mt-4 flex justify-center">
              <button
                onClick={back}
                className="rounded-full bg-white/15 px-5 py-2 text-sm font-semibold ring-1 ring-white/25 transition-colors hover:bg-white/25"
              >
                ← Înapoi la canale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

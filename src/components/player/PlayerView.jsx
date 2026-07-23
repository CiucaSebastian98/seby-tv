import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useHlsPlayer } from '../../hooks/useHlsPlayer.js'
import { useNowNext } from '../../hooks/useEpg.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { usePlayerPrefs } from '../../hooks/usePlayerPrefs.js'
import { useRecent } from '../../hooks/useRecent.js'
import { useAppState } from '../../context/AppContext.jsx'
import { selectVisibleChannels } from '../../services/channelService.js'
import { formatTime } from '../../utils/format.js'
import Spinner from '../ui/Spinner.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'

/**
 * Redare pe tot ecranul, pe URL propriu (/pro-tv etc.). Canalul e rezolvat din
 * slug-ul din URL. Overlay-ul se auto-ascunde.
 *
 * Taste: Escape/Backspace = înapoi, f = favorite, ←/→ = canal anterior/următor,
 * p = picture-in-picture, Enter = fullscreen. Pe mobil, swipe orizontal schimbă
 * canalul.
 */
export default function PlayerView() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { channels, filters } = useAppState()
  const { isFavorite, toggleFavorite } = useFavorites()
  const { markWatched } = useRecent()

  const channel = useMemo(
    () => channels.find((c) => c.slug === slug) || null,
    [channels, slug],
  )
  const { now, next, hasEpg } = useNowNext(channel?.id)

  // Lista de zapping: aceleași filtre ca în ecranul de răsfoire, ca ordinea să
  // fie cea pe care userul tocmai o vedea. Dacă filtrele exclud canalul curent
  // (ex. a ajuns aici pe link direct), cădem pe catalogul întreg.
  const zapList = useMemo(() => {
    const visible = selectVisibleChannels(channels, filters)
    return visible.some((c) => c.slug === slug) ? visible : channels
  }, [channels, filters, slug])

  const videoRef = useRef(null)
  const { state, error, isMutedByPolicy, unmute } = useHlsPlayer(
    videoRef,
    channel?.url || null,
    channel?.type || 'hls',
    channel?.reason || '',
    channel?.proxyUrl || '',
  )
  const [showUi, setShowUi] = useState(true)
  const [isPip, setIsPip] = useState(false)
  const [isFull, setIsFull] = useState(false)

  usePlayerPrefs(videoRef, channel?.id, isMutedByPolicy)

  const back = () => navigate('/')

  // Marchează canalul ca vizionat abia după ce redarea chiar pornește — altfel
  // un canal mort ar polua lista de „ultimele vizionate".
  useEffect(() => {
    if (state === 'playing' && channel?.id) markWatched(channel.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, channel?.id])

  // ── Zapping ──
  const zapTo = (dir) => {
    if (!channel || zapList.length < 2) return
    const i = zapList.findIndex((c) => c.slug === channel.slug)
    if (i < 0) return
    const nextIdx = (i + dir + zapList.length) % zapList.length
    navigate(`/${zapList[nextIdx].slug}`)
  }

  // ── Picture-in-Picture ──
  const togglePip = async () => {
    const video = videoRef.current
    if (!video || !document.pictureInPictureEnabled) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch {
      // ex. video-ul n-are încă metadate, sau utilizatorul a refuzat
    }
  }

  // ── Fullscreen ──
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      // iOS Safari nu expune Fullscreen API pe elemente arbitrare
    }
  }

  // Sincronizăm starea butoanelor cu realitatea (userul poate ieși din PiP sau
  // fullscreen prin controalele native ale browserului).
  useEffect(() => {
    const video = videoRef.current
    const onFs = () => setIsFull(!!document.fullscreenElement)
    const onPipIn = () => setIsPip(true)
    const onPipOut = () => setIsPip(false)

    document.addEventListener('fullscreenchange', onFs)
    video?.addEventListener('enterpictureinpicture', onPipIn)
    video?.addEventListener('leavepictureinpicture', onPipOut)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      video?.removeEventListener('enterpictureinpicture', onPipIn)
      video?.removeEventListener('leavepictureinpicture', onPipOut)
    }
  }, [])

  // ── Swipe orizontal pe mobil ──
  const touch = useRef(null)
  const onTouchStart = (e) => {
    const t = e.changedTouches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    // Prag generos pe orizontală + gardă pe verticală, ca scroll-ul accidental
    // să nu schimbe canalul.
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) zapTo(dx < 0 ? 1 : -1)
  }

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
      // Nu furăm tastele când userul e într-un câmp (ex. controalele native).
      if (e.target.matches?.('input, textarea, select')) return

      if (e.key === 'Escape' || e.key === 'Backspace') back()
      else if ((e.key === 'f' || e.key === 'F') && channel) toggleFavorite(channel.id)
      else if (e.key === 'ArrowRight') { e.preventDefault(); zapTo(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); zapTo(-1) }
      else if (e.key === 'p' || e.key === 'P') togglePip()
      else if (e.key === 'Enter') toggleFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, zapList])

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

  const zapIndex = zapList.findIndex((c) => c.slug === channel.slug)
  const prevCh = zapIndex >= 0 && zapList.length > 1
    ? zapList[(zapIndex - 1 + zapList.length) % zapList.length]
    : null
  const nextCh = zapIndex >= 0 && zapList.length > 1
    ? zapList[(zapIndex + 1) % zapList.length]
    : null

  return (
    <div
      className="fixed inset-0 z-40 bg-black text-white"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
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

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {document.pictureInPictureEnabled && (
              <button
                onClick={togglePip}
                title="Picture-in-Picture (P)"
                aria-label="Picture-in-Picture"
                className={`grid h-10 w-10 place-items-center rounded-full text-base ring-1 backdrop-blur transition-colors ${
                  isPip
                    ? 'bg-focus text-black ring-transparent'
                    : 'bg-black/60 ring-white/25 hover:bg-black/80'
                }`}
              >
                ⧉
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              title={isFull ? 'Ieși din ecran complet (Enter)' : 'Ecran complet (Enter)'}
              aria-label="Ecran complet"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-base ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/80"
            >
              {isFull ? '⤡' : '⛶'}
            </button>

            <button
              onClick={() => toggleFavorite(channel.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-1 backdrop-blur transition-colors ${
                fav
                  ? 'bg-focus text-black ring-transparent'
                  : 'bg-black/60 ring-white/25 hover:bg-black/80'
              }`}
            >
              {fav ? '★ Favorit' : '☆ Favorite'}
            </button>
          </div>
        </div>
      </div>

      {/* Zapping: săgeți laterale, ascunse odată cu restul overlay-ului.
          `pointer-events-none` pe container ca zona moartă din mijloc să nu
          blocheze controalele native ale video-ului. */}
      {(prevCh || nextCh) && (
        <div
          className={`pointer-events-none absolute inset-y-0 inset-x-0 flex items-center justify-between px-2 transition-opacity duration-300 md:px-4 ${
            showUi ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ZapButton dir={-1} channel={prevCh} onClick={() => zapTo(-1)} />
          <ZapButton dir={1} channel={nextCh} onClick={() => zapTo(1)} />
        </div>
      )}

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

/** Săgeata de zapping, cu numele canalului dezvăluit la hover (doar pe desktop). */
function ZapButton({ dir, channel, onClick }) {
  if (!channel) return <span />

  const isNext = dir === 1
  return (
    <button
      onClick={onClick}
      title={`${isNext ? 'Următorul' : 'Anteriorul'}: ${channel.name}`}
      aria-label={`${isNext ? 'Canalul următor' : 'Canalul anterior'}: ${channel.name}`}
      className="pointer-events-auto group flex items-center gap-2 rounded-full bg-black/60 px-3 py-3 text-lg ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/80"
    >
      {!isNext && <span aria-hidden>‹</span>}
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover:max-w-[12rem] group-hover:opacity-100 md:inline">
        {channel.name}
      </span>
      {isNext && <span aria-hidden>›</span>}
    </button>
  )
}

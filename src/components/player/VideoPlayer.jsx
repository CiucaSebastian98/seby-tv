import { useEffect, useRef, useState } from 'react'
import { useHlsPlayer } from '../../hooks/useHlsPlayer.js'
import { usePlayerPrefs } from '../../hooks/usePlayerPrefs.js'
import { useRecent } from '../../hooks/useRecent.js'
import Spinner from '../ui/Spinner.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'

/**
 * Playerul propriu-zis, într-un cadru 16:9 (nu pe tot ecranul). Încapsulează
 * redarea (hls/mpegts/nativ prin `useHlsPlayer`), overlay-urile de stare,
 * deblocarea sunetului, fullscreen și Picture-in-Picture.
 *
 * Nu știe nimic de rutare sau zapping — primește doar canalul de redat.
 *
 * @param {{ channel: object }} props
 */
export default function VideoPlayer({ channel }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)

  const { state, error, isMutedByPolicy, unmute } = useHlsPlayer(
    videoRef,
    channel?.url || null,
    channel?.type || 'hls',
    channel?.reason || '',
    channel?.proxyUrl || '',
  )

  const { markWatched } = useRecent()
  usePlayerPrefs(videoRef, channel?.id, isMutedByPolicy)

  const [isPip, setIsPip] = useState(false)
  const [isFull, setIsFull] = useState(false)
  const [airplayAvailable, setAirplayAvailable] = useState(false)

  // Marchează canalul ca vizionat abia după ce redarea chiar pornește — altfel
  // un canal mort ar polua lista de „ultimele vizionate".
  useEffect(() => {
    if (state === 'playing' && channel?.id) markWatched(channel.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, channel?.id])

  // ── AirPlay (doar Safari/Apple) ──
  // API-ul `webkit…` există numai pe Safari (iPhone/iPad/Mac). Butonul apare
  // doar când chiar există un dispozitiv AirPlay disponibil, semnalat de eveniment.
  useEffect(() => {
    const video = videoRef.current
    if (!video || typeof video.webkitShowPlaybackTargetPicker !== 'function') return
    video.setAttribute('x-webkit-airplay', 'allow')
    const onAvail = (e) => setAirplayAvailable(e.availability === 'available')
    video.addEventListener('webkitplaybacktargetavailabilitychanged', onAvail)
    return () => video.removeEventListener('webkitplaybacktargetavailabilitychanged', onAvail)
  }, [])

  const showAirplay = () => {
    try {
      videoRef.current?.webkitShowPlaybackTargetPicker()
    } catch {
      // nesuportat / refuzat — ignorăm
    }
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

  // ── Fullscreen ── (cadrul playerului, nu toată pagina)
  const toggleFullscreen = async () => {
    const el = containerRef.current
    const video = videoRef.current
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else if (el?.requestFullscreen) {
        await el.requestFullscreen()
      } else if (video?.webkitEnterFullscreen) {
        // iOS Safari nu suportă Fullscreen API pe elemente — doar pe <video>.
        video.webkitEnterFullscreen()
      }
    } catch {
      // refuzat / nesuportat — ignorăm
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

  // Scurtături proprii playerului: Enter = fullscreen, p = Picture-in-Picture.
  // (Navigarea între canale / înapoi e gestionată de pagina care ne conține.)
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches?.('input, textarea, select')) return
      if (e.key === 'Enter') toggleFullscreen()
      else if (e.key === 'p' || e.key === 'P') togglePip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-edge"
    >
      <video
        ref={videoRef}
        controls
        playsInline
        autoPlay
        className="h-full w-full object-contain"
      />

      {/* Butoane AirPlay + PiP + fullscreen, colț dreapta-sus */}
      <div className="absolute right-3 top-3 flex items-center gap-2">
        {airplayAvailable && (
          <button
            onClick={showAirplay}
            title="AirPlay"
            aria-label="AirPlay"
            className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/80"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
              <path d="M12 15l5 6H7l5-6z" fill="currentColor" stroke="none" />
            </svg>
          </button>
        )}
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
          className="grid h-10 w-10 place-items-center rounded-full bg-black/60 text-base text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/80"
        >
          {isFull ? '⤡' : '⛶'}
        </button>
      </div>

      {state === 'loading' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black">
          <Spinner label="Se conectează la stream…" />
        </div>
      )}

      {isMutedByPolicy && state === 'playing' && (
        <button
          onClick={unmute}
          className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 animate-pulse rounded-full bg-accent px-6 py-3 text-base font-bold text-white shadow-lg ring-2 ring-white/30 transition-all hover:scale-105 hover:bg-accent/90"
        >
          🔊 Apasă pentru sunet
        </button>
      )}

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
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="max-w-md rounded-2xl bg-black/80 p-5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
              <ErrorBanner title="Stream indisponibil" message={error} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

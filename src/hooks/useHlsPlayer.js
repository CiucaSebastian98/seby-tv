import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import mpegts from 'mpegts.js'

/**
 * Atașează un stream video la elementul <video> referit.
 *  - tip 'hls': hls.js (Chrome) sau Nativ (Safari)
 *  - tip 'mpegts': mpegts.js (MSE pentru pass-through proxy)
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef
 * @param {string|null} url
 * @param {'hls'|'mpegts'} type
 * @returns {{ state, error, isMutedByPolicy, unmute }}
 */
export function useHlsPlayer(videoRef, url, type = 'hls') {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [isMutedByPolicy, setIsMutedByPolicy] = useState(false)
  const retryCount = useRef(0)
  const playAttempted = useRef(false)

  /** Încearcă play — dacă Chrome blochează, pornește muted. */
  function tryPlay(video) {
    if (!video || playAttempted.current) return
    playAttempted.current = true

    video.play().catch((err) => {
      if (err.name === 'NotAllowedError') {
        // Autoplay cu sunet blocat — pornim muted
        video.muted = true
        setIsMutedByPolicy(true)
        video.play().catch(() => {})
      }
      // Resetăm flag-ul ca să permitem retry dacă e nevoie
      playAttempted.current = false
    })
  }

  /** Apelat de user (click) — deblocăm sunetul. */
  function unmute() {
    const video = videoRef.current
    if (video) {
      video.muted = false
      setIsMutedByPolicy(false)
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) {
      setState('idle')
      setError(null)
      return
    }

    setState('loading')
    setError(null)
    setIsMutedByPolicy(false)
    retryCount.current = 0
    playAttempted.current = false

    // ── Detectare redare ──
    let playbackDetected = false

    let loadingTimeout = setTimeout(() => {
      if (!playbackDetected && video.readyState < 3) {
        setState('error')
        setError('Stream-ul nu a pornit la timp. Sursa poate fi offline, geo-blocată sau incompatibilă.')
      }
    }, 25_000)

    const clearLoadingTimeout = () => {
      if (loadingTimeout) { clearTimeout(loadingTimeout); loadingTimeout = null }
    }

    const markPlaying = () => {
      if (!playbackDetected) {
        playbackDetected = true
        clearLoadingTimeout()
        setState('playing')
      }
    }

    video.addEventListener('playing', markPlaying)
    const onTimeUpdate = () => {
      if (video.currentTime > 0 && !video.paused) markPlaying()
    }
    video.addEventListener('timeupdate', onTimeUpdate)

    const isHls = /\.m3u8(\?|$)/i.test(url)



    const fail = (msg) => {
      clearLoadingTimeout()
      setState('error')
      setError(msg || 'Stream indisponibil. Verificați conexiunea.')
    }
    // Timeout mărit la 30s. Fluxurile brute au nevoie de timp să umple buffer-ul MSE.
    // Când timeout-ul dădea kill la 10s, Chrome raporta "CORS error" în mod fals pentru fetch-ul anulat.
    const timer = setTimeout(() => { if (video.readyState < 3) fail('Timeout la conectarea la stream.') }, 30000)
    const onErr = (e) => { clearTimeout(timer); fail(e?.message) }

    // ── MPEG-TS brut (Pass-Through) ──
    if (type === 'mpegts') {
      if (mpegts.getFeatureList().mseLivePlayback) {
        const player = mpegts.createPlayer({
          type: 'mse',
          isLive: true,
          url,
        }, {
          enableStashBuffer: true,     // Ajută la fluxurile cu desincronizare A/V
          stashInitialSize: 384,       // Buffer mai mare la început
          liveBufferLatencyChasing: true, // Sare peste gap-uri

          // Bypasăm pagina de warning de la Ngrok
          headers: {
            'ngrok-skip-browser-warning': '1'
          }
        })
        
        player.attachMediaElement(video)
        player.load()
        
        player.on(mpegts.Events.ERROR, (errType, errDetail) => {
          onErr(new Error(`Eroare MPEG-TS: ${errType} - ${errDetail}`))
        })

        // mpegts nu emite playing mereu la fel, depindem de event-urile video native
        video.addEventListener('playing', markPlaying)
        tryPlay(video)

        return () => {
          clearTimeout(timer); clearLoadingTimeout()
          video.removeEventListener('playing', markPlaying)
          video.removeEventListener('timeupdate', onTimeUpdate)
          video.removeEventListener('error', onErr)
          player.destroy()
          video.removeAttribute('src'); video.load()
        }
      } else {
        // Fallback dacă MSE nu e suportat (ex. iOS)
        setError('Acest tip de stream (MPEG-TS) nu este suportat pe dispozitivele iOS. Folosiți Windows, Android sau Mac.')
        setState('error')
        return
      }
    }

    // ── hls.js (Chrome/Firefox/Edge) ──
    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: function (xhr, url) {
          // Trece automat de pagina de avertizare Ngrok (conturile gratuite o pun implicit)
          if (url.includes('ngrok-free') || url.includes('ngrok.io')) {
            xhr.setRequestHeader('ngrok-skip-browser-warning', '1')
          }
        },
        enableWorker: true,
        lowLatencyMode: false,
        fragLoadingMaxRetry: 10,
        fragLoadingRetryDelay: 1000,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 10,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferHole: 2,
        maxSeekHole: 5,
        appendErrorMaxRetry: 10,
        liveDurationInfinity: true,
        liveBackBufferLength: 0,
      })

      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        playAttempted.current = false
        tryPlay(video)
      })

      // Doar O DATĂ: dacă video-ul s-a blocat în pauză după buffer
      let fragPlayRetried = false
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (!fragPlayRetried && video.readyState >= 3 && video.paused) {
          fragPlayRetried = true
          playAttempted.current = false
          tryPlay(video)
        }
      })

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (retryCount.current < 8) {
              retryCount.current++
              hls.startLoad()
            } else {
              clearLoadingTimeout(); hls.destroy()
              setState('error')
              setError('Stream indisponibil — eroare de rețea persistentă.')
            }
            break

          case Hls.ErrorTypes.MEDIA_ERROR:
            retryCount.current++
            if (retryCount.current <= 2) {
              hls.recoverMediaError()
            } else if (retryCount.current <= 4) {
              hls.swapAudioCodec()
              hls.recoverMediaError()
            } else if (retryCount.current <= 8) {
              hls.loadSource(url)
              hls.startLoad()
            } else {
              clearLoadingTimeout(); hls.destroy()
              setState('error')
              setError('Eroare media persistentă — codec incompatibil.')
            }
            break

          default:
            clearLoadingTimeout(); hls.destroy()
            setState('error')
            setError('Stream indisponibil (CORS / geo-block / offline).')
        }
      })

      return () => {
        clearLoadingTimeout()
        video.removeEventListener('playing', markPlaying)
        video.removeEventListener('timeupdate', onTimeUpdate)
        hls.destroy()
      }
    }

    // ── Fallback: HLS nativ (Safari) ──
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.addEventListener('loadedmetadata', () => tryPlay(video), { once: true })
      const onErr = () => {
        clearLoadingTimeout(); setState('error')
        setError('Stream-ul nu a putut fi redat (nativ).')
      }
      video.addEventListener('error', onErr)
      return () => {
        clearLoadingTimeout()
        video.removeEventListener('playing', markPlaying)
        video.removeEventListener('timeupdate', onTimeUpdate)
        video.removeEventListener('error', onErr)
        video.removeAttribute('src'); video.load()
      }
    }

    clearLoadingTimeout(); setState('error')
    setError('Browserul nu suportă HLS.')
    video.removeEventListener('playing', markPlaying)
    video.removeEventListener('timeupdate', onTimeUpdate)
  }, [videoRef, url])

  return { state, error, isMutedByPolicy, unmute }
}

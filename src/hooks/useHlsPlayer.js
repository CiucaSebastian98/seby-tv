import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import mpegts from 'mpegts.js'
import { STREAM_PROXY } from '../constants.js'

/**
 * Cât așteptăm PRIMA redare înainte de a declara stream-ul mort. Un singur
 * watchdog pentru toate tipurile — se anulează în clipa în care apar date.
 */
const WATCHDOG_MS = 30_000

/** Mesaje pentru canalele pe care browserul nu le poate reda fără proxy. */
const UNSUPPORTED_MESSAGES = {
  'mixed-content':
    'Sursa acestui canal e pe http://, iar aplicația rulează pe https:// — browserul blochează fluxul. E nevoie de proxy (VITE_STREAM_PROXY).',
  'raw-ts':
    'Canal cu flux MPEG-TS brut (IP:port), nu HLS. Browserul nu îl poate reda direct — e nevoie de proxy (VITE_STREAM_PROXY).',
  protocol:
    'Protocol nesuportat de browser (rtmp/udp/rtsp). E nevoie de proxy (VITE_STREAM_PROXY), care îl remuxează cu ffmpeg.',
}

/**
 * `/health` e singura rută fără token și cu CORS deschis. Dacă nici ea nu
 * răspunde, problema nu e sursa TV, ci proxy-ul: oprit, tunel căzut sau un
 * intermediar (ex. ngrok peste limita de trafic) care înlocuiește răspunsul cu
 * o pagină de eroare fără headere CORS. Distincția asta scutește ore de
 * debugging pe „NetworkError" din player.
 */
async function proxyIsReachable() {
  if (!STREAM_PROXY) return null
  try {
    const res = await fetch(`${STREAM_PROXY}/health`, { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

const PROXY_DOWN_MESSAGE =
  'Proxy-ul de stream nu răspunde — server oprit, tunel căzut sau limită de trafic atinsă. Restul canalelor prin proxy vor da aceeași eroare.'

/**
 * Atașează un stream video la elementul <video> referit.
 *  - tip 'hls': hls.js (Chrome) sau Nativ (Safari)
 *  - tip 'mpegts': mpegts.js (MSE pentru pass-through proxy)
 *  - tip 'unsupported': nu se încearcă redarea, se explică de ce
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef
 * @param {string|null} url
 * @param {'hls'|'mpegts'|'unsupported'} type
 * @param {string} [reason] motivul pentru type === 'unsupported'
 * @returns {{ state, error, isMutedByPolicy, unmute }}
 */
export function useHlsPlayer(videoRef, url, type = 'hls', reason = '') {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [isMutedByPolicy, setIsMutedByPolicy] = useState(false)
  const retryCount = useRef(0)
  const playAttempted = useRef(false)
  // Identifică rularea curentă a efectului, ca un diagnostic asincron întârziat
  // să nu suprascrie eroarea altui canal.
  const runRef = useRef(0)

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
    const run = ++runRef.current
    const isCurrent = () => runRef.current === run

    const video = videoRef.current
    if (!video || !url) {
      setState('idle')
      setError(null)
      return
    }

    // Canal pe care browserul nu are cum să îl redea — explicăm, nu încercăm.
    if (type === 'unsupported') {
      setState('error')
      setError(UNSUPPORTED_MESSAGES[reason] || UNSUPPORTED_MESSAGES.protocol)
      return
    }

    setState('loading')
    setError(null)
    setIsMutedByPolicy(false)
    retryCount.current = 0
    playAttempted.current = false

    // ── Detectare redare ──
    let playbackDetected = false

    const markPlaying = () => {
      if (playbackDetected) return
      playbackDetected = true
      clearWatchdog()
      setState('playing')
    }

    // UN SINGUR watchdog. Se anulează la prima redare, iar la expirare verifică
    // dacă între timp au sosit date — altfel un stream care merge (dar are un
    // readyState scăzut momentan) primea overlay-ul „Timeout la conectare".
    let watchdog = setTimeout(() => {
      watchdog = null
      if (playbackDetected) return
      if (video.readyState >= 2) return markPlaying()
      fail('Stream-ul nu a pornit la timp. Sursa poate fi offline, geo-blocată sau incompatibilă.')
    }, WATCHDOG_MS)

    function clearWatchdog() {
      if (watchdog) { clearTimeout(watchdog); watchdog = null }
    }

    /**
     * Eroare fatală: oprește watchdog-ul și afișează overlay-ul. Dacă fluxul
     * trecea prin proxy, verificăm în fundal dacă proxy-ul e viu și rafinăm
     * mesajul — „NetworkError" nu spune nimic utile despre cine a picat.
     */
    function fail(msg) {
      clearWatchdog()
      setState('error')
      setError(msg || 'Stream indisponibil. Verificați conexiunea.')

      if (STREAM_PROXY && url.startsWith(STREAM_PROXY)) {
        proxyIsReachable().then((reachable) => {
          if (reachable === false && isCurrent()) setError(PROXY_DOWN_MESSAGE)
        })
      }
    }

    video.addEventListener('playing', markPlaying)
    const onTimeUpdate = () => {
      if (video.currentTime > 0 && !video.paused) markPlaying()
    }
    video.addEventListener('timeupdate', onTimeUpdate)
    // Datele au ajuns și sunt decodabile — chiar dacă autoplay e blocat, nu e
    // o problemă de conexiune, deci watchdog-ul nu mai are ce căuta.
    video.addEventListener('loadeddata', markPlaying)

    const onErr = (e) => fail(e?.message)

    // ── MPEG-TS brut (Pass-Through) ──
    if (type === 'mpegts') {
      if (mpegts.getFeatureList().mseLivePlayback) {
        const player = mpegts.createPlayer({
          type: 'mse',
          isLive: true,
          url,
        }, {
          enableStashBuffer: false,
          fixAudioTimestampGap: true,
          liveBufferLatencyChasing: true,
          // Bypasăm pagina de warning de la Ngrok
          headers: {
            'ngrok-skip-browser-warning': '1'
          }
        })
        
        player.attachMediaElement(video)
        player.load()

        // mpegts.js emite ERROR și pentru hopuri tranzitorii de loader. Dacă
        // redarea deja merge, verificăm întâi dacă chiar s-a oprit ceasul
        // video-ului — altfel am acoperi un stream funcțional cu overlay.
        let stallCheck = null
        player.on(mpegts.Events.ERROR, (errType, errDetail) => {
          const msg = `Eroare MPEG-TS: ${errType} - ${errDetail}`
          if (!playbackDetected) return onErr(new Error(msg))
          if (stallCheck) return
          const before = video.currentTime
          stallCheck = setTimeout(() => {
            stallCheck = null
            if (video.currentTime <= before) fail(msg)
          }, 5000)
        })

        tryPlay(video)

        // Force jump-start pentru stream-uri IPTV cu timestamp-uri murdare
        const chaseInterval = setInterval(() => {
          if (video.buffered.length > 0 && video.readyState >= 1) {
            const end = video.buffered.end(video.buffered.length - 1)
            // Dacă playerul a rămas blocat la 0 și s-au descărcat date, forțăm seek
            if (video.currentTime === 0 && end > 0.5) {
              video.currentTime = end - 0.2
            }
          }
        }, 1000)

        return () => {
          clearInterval(chaseInterval)
          if (stallCheck) clearTimeout(stallCheck)
          clearWatchdog()
          video.removeEventListener('playing', markPlaying)
          video.removeEventListener('timeupdate', onTimeUpdate)
          video.removeEventListener('loadeddata', markPlaying)
          player.destroy()
          video.removeAttribute('src'); video.load()
        }
      } else {
        // Fallback dacă MSE nu e suportat (ex. iOS)
        fail('Acest tip de stream (MPEG-TS) nu este suportat pe dispozitivele iOS. Folosiți Windows, Android sau Mac.')
        return () => {
          video.removeEventListener('playing', markPlaying)
          video.removeEventListener('timeupdate', onTimeUpdate)
          video.removeEventListener('loadeddata', markPlaying)
        }
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
              hls.destroy()
              fail('Stream indisponibil — eroare de rețea persistentă.')
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
              hls.destroy()
              fail('Eroare media persistentă — codec incompatibil.')
            }
            break

          default:
            hls.destroy()
            fail('Stream indisponibil (CORS / geo-block / offline).')
        }
      })

      return () => {
        clearWatchdog()
        video.removeEventListener('playing', markPlaying)
        video.removeEventListener('timeupdate', onTimeUpdate)
        video.removeEventListener('loadeddata', markPlaying)
        hls.destroy()
      }
    }

    // ── Fallback: HLS nativ (Safari) ──
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.addEventListener('loadedmetadata', () => tryPlay(video), { once: true })
      const onNativeErr = () => fail('Stream-ul nu a putut fi redat (nativ).')
      video.addEventListener('error', onNativeErr)
      return () => {
        clearWatchdog()
        video.removeEventListener('playing', markPlaying)
        video.removeEventListener('timeupdate', onTimeUpdate)
        video.removeEventListener('loadeddata', markPlaying)
        video.removeEventListener('error', onNativeErr)
        video.removeAttribute('src'); video.load()
      }
    }

    fail('Browserul nu suportă HLS.')
    return () => {
      clearWatchdog()
      video.removeEventListener('playing', markPlaying)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadeddata', markPlaying)
    }
  }, [videoRef, url, type, reason])

  return { state, error, isMutedByPolicy, unmute }
}

import { useEffect, useState } from 'react'
import Hls from 'hls.js'

/**
 * Atașează un stream HLS la elementul <video> referit.
 *  - Chrome/Firefox/Edge: hls.js (MSE)
 *  - Safari/iOS: HLS nativ (video.src)
 * Gestionează recovery pe erori de rețea/media și expune stare + eroare.
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef
 * @param {string|null} url
 * @returns {{ state: 'idle'|'loading'|'playing'|'error', error: string|null }}
 */
export function useHlsPlayer(videoRef, url) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) {
      setState('idle')
      setError(null)
      return
    }

    setState('loading')
    setError(null)

    const onPlaying = () => setState('playing')
    video.addEventListener('playing', onPlaying)

    // Fluxuri non-HLS (ex. MPEG-TS pe IP:port, ca Digi Sport) — browserul nu le
    // poate reda. Încercăm redare nativă (acoperă mp4/webm); TS brut eșuează cu
    // un mesaj clar, ca să nu pară eroare generică.
    const isHls = /\.m3u8(\?|$)/i.test(url)
    if (!isHls) {
      const fail = () => {
        setState('error')
        setError(
          'Flux incompatibil cu browserul (probabil MPEG-TS pe IP:port). ' +
            'Funcționează în VLC, dar nu poate fi redat direct în web.',
        )
      }
      // Timeout: dacă nu pornește redarea în 8s, considerăm că nu merge în web.
      const timer = setTimeout(() => {
        if (video.readyState < 3) fail()
      }, 8000)
      const onPlay = () => clearTimeout(timer)
      const onErr = () => {
        clearTimeout(timer)
        fail()
      }
      video.addEventListener('playing', onPlay)
      video.addEventListener('error', onErr)

      video.src = url
      video.play().catch(() => {})

      return () => {
        clearTimeout(timer)
        video.removeEventListener('playing', onPlay)
        video.removeEventListener('playing', onPlaying)
        video.removeEventListener('error', onErr)
        video.removeAttribute('src')
        video.load()
      }
    }

    // Cale nativă (Safari) — o preferăm când e disponibilă.
    const canNative = video.canPlayType('application/vnd.apple.mpegurl')
    if (canNative) {
      video.src = url
      const play = () => video.play().catch(() => {})
      video.addEventListener('loadedmetadata', play, { once: true })
      const onErr = () => {
        setState('error')
        setError('Stream-ul nu a putut fi redat (nativ).')
      }
      video.addEventListener('error', onErr)
      return () => {
        video.removeEventListener('playing', onPlaying)
        video.removeEventListener('error', onErr)
        video.removeAttribute('src')
        video.load()
      }
    }

    // Cale hls.js.
    if (!Hls.isSupported()) {
      setState('error')
      setError('Browserul nu suportă HLS (nici nativ, nici MSE).')
      video.removeEventListener('playing', onPlaying)
      return
    }

    const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
    hls.loadSource(url)
    hls.attachMedia(video)
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))

    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (!data.fatal) return
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad() // reîncearcă
          break
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError()
          break
        default:
          hls.destroy()
          setState('error')
          setError(
            'Stream indisponibil (probabil CORS / geo-block / offline). ' +
              'E frecvent la sursele iptv-org — încearcă alt canal.',
          )
      }
    })

    return () => {
      video.removeEventListener('playing', onPlaying)
      hls.destroy()
    }
  }, [videoRef, url])

  return { state, error }
}

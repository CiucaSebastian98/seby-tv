import { useCallback, useEffect, useRef } from 'react'
import { LS_PLAYER_PREFS_KEY } from '../constants.js'

/** Citește preferințele salvate. Tolerant la date corupte. */
function read() {
  try {
    const raw = localStorage.getItem(LS_PLAYER_PREFS_KEY)
    const p = raw ? JSON.parse(raw) : null
    if (!p || typeof p !== 'object') return { volume: 1, muted: false }
    return {
      volume: typeof p.volume === 'number' && p.volume >= 0 && p.volume <= 1 ? p.volume : 1,
      muted: !!p.muted,
    }
  } catch {
    return { volume: 1, muted: false }
  }
}

/**
 * Reține volumul și starea de mute între canale și între sesiuni.
 *
 * Nu ținem valorile în state React: elementul <video> e sursa adevărului, iar
 * un state paralel ar produce o buclă (state → prop → event → state). Citim la
 * montare, scriem la fiecare `volumechange`.
 */
export function usePlayerPrefs(videoRef, ready, skipSave = false) {
  // `skipSave` ține pasul cu render-ul fără a re-atașa listener-ul.
  const skipRef = useRef(skipSave)
  skipRef.current = skipSave

  // Aplică preferințele imediat ce elementul există.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const { volume, muted } = read()
    video.volume = volume
    video.muted = muted
  }, [videoRef, ready])

  // Persistă orice schimbare făcută din controalele native.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let t = null
    const save = () => {
      // Mute-ul impus de politica de autoplay NU e o alegere a utilizatorului —
      // dacă l-am salva, toate canalele ar porni mute la nesfârșit.
      if (skipRef.current) return
      clearTimeout(t)
      // Debounce: tragerea de slider emite zeci de evenimente pe secundă.
      t = setTimeout(() => {
        try {
          localStorage.setItem(
            LS_PLAYER_PREFS_KEY,
            JSON.stringify({ volume: video.volume, muted: video.muted }),
          )
        } catch {
          // mod privat / quota — preferința se pierde, redarea nu
        }
      }, 300)
    }

    video.addEventListener('volumechange', save)
    return () => {
      clearTimeout(t)
      video.removeEventListener('volumechange', save)
    }
  }, [videoRef])

  /** Volumul salvat, pentru cine are nevoie de el înainte de montare. */
  const getSaved = useCallback(read, [])

  return { getSaved }
}

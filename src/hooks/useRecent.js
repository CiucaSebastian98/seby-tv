import { useCallback, useEffect, useState } from 'react'
import { LS_RECENT_KEY, RECENT_MAX } from '../constants.js'

function read() {
  try {
    const raw = localStorage.getItem(LS_RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function write(ids) {
  try {
    localStorage.setItem(LS_RECENT_KEY, JSON.stringify(ids))
  } catch {
    // ignorăm (mod privat / quota)
  }
}

/**
 * Ultimele canale vizionate, cel mai recent primul.
 *
 * Stă în localStorage, nu în store-ul global: e o listă mică, scrisă dintr-un
 * singur loc (player) și citită din altul (browse), fără nevoie de sincronizare
 * între componente în aceeași sesiune.
 */
export function useRecent() {
  const [recent, setRecent] = useState(read)

  // Sincronizează între taburi.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_RECENT_KEY) setRecent(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** Marchează un canal ca vizionat (îl mută în capul listei). */
  const markWatched = useCallback((id) => {
    if (!id) return
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_MAX)
      write(next)
      return next
    })
  }, [])

  const clearRecent = useCallback(() => {
    write([])
    setRecent([])
  }, [])

  return { recent, markWatched, clearRecent }
}

import { useCallback, useEffect, useRef } from 'react'
import { LS_FAVORITES_KEY } from '../constants.js'
import { useAppActions, useAppState } from '../context/AppContext.jsx'

/**
 * Sincronizează `favorites` din store cu localStorage:
 *  - la montare hidratează store-ul din localStorage
 *  - la fiecare schimbare scrie înapoi
 * Expune helperi convenabili pentru UI.
 */
export function useFavorites() {
  const { favorites } = useAppState()
  const { setFavorites, toggleFavorite } = useAppActions()
  const hydrated = useRef(false)

  // Hidratare inițială din localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_FAVORITES_KEY)
      if (raw) setFavorites(JSON.parse(raw))
    } catch {
      // localStorage indisponibil / JSON corupt — ignorăm, pornim gol.
    }
    hydrated.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persistăm doar după hidratare (ca să nu suprascriem cu [] la primul render).
  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favorites))
    } catch {
      // quota / mod privat — ignorăm.
    }
  }, [favorites])

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites])

  return { favorites, isFavorite, toggleFavorite }
}

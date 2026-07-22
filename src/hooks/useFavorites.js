import { useCallback, useEffect } from 'react'
import { LS_FAVORITES_KEY } from '../constants.js'
import { useAppActions, useAppState } from '../context/AppContext.jsx'

/** Citește favoritele salvate — folosit pentru init sincron al store-ului. */
export function getInitialFavorites() {
  try {
    const raw = localStorage.getItem(LS_FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Favoritele sunt inițializate sincron din localStorage (vezi AppContext), deci
 * aici doar persistăm la fiecare schimbare — fără efect de hidratare care ar
 * suprascrie valoarea salvată la montare (aceeași cursă ca la temă).
 */
export function useFavorites() {
  const { favorites } = useAppState()
  const { toggleFavorite } = useAppActions()

  useEffect(() => {
    try {
      localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favorites))
    } catch {
      // ignorăm (mod privat / quota)
    }
  }, [favorites])

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites])

  return { favorites, isFavorite, toggleFavorite }
}

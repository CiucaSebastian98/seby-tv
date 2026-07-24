import { useEffect } from 'react'
import { LS_THEME_KEY } from '../constants.js'
import { useAppState } from '../context/AppContext.jsx'

/**
 * Tema inițială e setată sincron de scriptul inline din index.html (pe <html>).
 * Store-ul se inițializează din acel `data-theme` (vezi AppContext), deci aici
 * nu mai hidratăm — doar reflectăm schimbările înapoi în DOM + localStorage.
 */
export function getInitialTheme() {
  if (typeof document !== 'undefined') {
    const t = document.documentElement.dataset.theme
    if (t === 'light' || t === 'dark') return t
  }
  return 'dark'
}

/** Se apelează o dată (în App): aplică tema pe <html> și o persistă la schimbare. */
export function useTheme() {
  const { theme } = useAppState()

  useEffect(() => {
    document.documentElement.dataset.theme = theme

    // Potrivim bara de sus a browserului (status bar / zona de deasupra
    // navbar-ului) cu culoarea navbar-ului (--c-elev): navy în dark, alb în light.
    const navColor = theme === 'light' ? '#ffffff' : '#0f1d37'
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', navColor)

    try {
      localStorage.setItem(LS_THEME_KEY, theme)
    } catch {
      // ignorăm (mod privat / quota)
    }
  }, [theme])
}

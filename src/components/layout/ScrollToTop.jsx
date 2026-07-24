import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Duce fereastra sus la fiecare schimbare de rută. Fără asta, React Router
 * păstrează poziția de scroll: intri pe pagina unui canal aterizând pe la
 * jumătatea listei, nu la hero. `useLayoutEffect` face saltul înainte de paint,
 * deci fără flash pe poziția veche.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

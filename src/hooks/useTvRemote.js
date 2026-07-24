import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** Codul tastei Return/Back de pe telecomanda Samsung (Tizen). */
const KEY_RETURN = 10009

/**
 * Comportamentul telecomenzii pe TV (Tizen). Tasta Back (10009):
 *   - dacă NU suntem pe ecranul principal → un pas înapoi în istoric;
 *   - dacă suntem pe „/" → ieșim din aplicație (doar pe Tizen; în browser nu face nimic).
 *
 * Săgețile și Enter sunt tratate deja de navigarea pe grid / scurtăturile paginii
 * de canal, deci aici ne ocupăm doar de Back, care altfel ar închide brusc app-ul.
 */
export function useTvRemote() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onKey = (e) => {
      // `key` poate fi 'XF86Back'/undefined pe diverse firmware — ne bazăm pe keyCode.
      if (e.keyCode !== KEY_RETURN && e.key !== 'XF86Back') return
      e.preventDefault()

      if (location.pathname !== '/') {
        navigate(-1)
      } else {
        try {
          window.tizen?.application?.getCurrentApplication?.().exit?.()
        } catch {
          // nu suntem pe Tizen sau API-ul lipsește — ignorăm
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, location.pathname])
}

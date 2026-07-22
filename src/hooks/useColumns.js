import { useEffect, useState } from 'react'

/**
 * Numărul de coloane care încap în containerul referit, în funcție de o lățime
 * minimă per card. Se recalculează la resize (ResizeObserver). Menține grila CSS
 * și navigarea cu tastele sincronizate (aceeași valoare `cols`).
 */
export function useColumns(ref, minCardPx = 210, { min = 2, max = 8 } = {}) {
  const [cols, setCols] = useState(6)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const w = el.clientWidth
      if (w > 0) setCols(Math.max(min, Math.min(max, Math.floor(w / minCardPx))))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, minCardPx, min, max])

  return cols
}

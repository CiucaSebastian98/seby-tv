import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Navigare 2D „TV-friendly" peste o structură de rânduri.
 * `rows` este un array de rânduri, fiecare rând un array de item-uri opace
 * (ex. { kind, ...channel }). Săgeți = mișcare, Enter = select, `f` = favorite,
 * Escape = back. Ignoră tastarea în input/select.
 *
 * Reține coloana când schimbi rândul (clamp la lungimea noului rând) și derulează
 * item-ul focalizat în vizor.
 *
 * @returns {{ pos, isFocused, setPos, registerRef }}
 */
export function useGridNavigation(rows, { onSelect, onFavorite, onBack, enabled = true } = {}) {
  const [pos, setPos] = useState({ r: 0, c: 0 })
  const refs = useRef(new Map())
  const didInit = useRef(false)

  // Focus inițial: primul rând care are item-uri (ex. hero-ul), o singură dată.
  useEffect(() => {
    if (didInit.current || rows.length === 0) return
    const r = rows.findIndex((row) => row.length > 0)
    if (r >= 0) {
      setPos({ r, c: 0 })
      didInit.current = true
    }
  }, [rows])

  // Clamp când structura se schimbă (filtre/căutare).
  useEffect(() => {
    setPos((p) => {
      const r = Math.min(p.r, Math.max(0, rows.length - 1))
      const len = rows[r]?.length || 0
      return { r, c: Math.min(p.c, Math.max(0, len - 1)) }
    })
  }, [rows])

  const move = useCallback(
    (dr, dc) =>
      setPos((p) => {
        if (dr !== 0) {
          let r = p.r
          // sări peste rândurile goale în direcția dorită
          do {
            r += dr
          } while (r >= 0 && r < rows.length && rows[r].length === 0)
          if (r < 0 || r >= rows.length) return p
          return { r, c: Math.min(p.c, rows[r].length - 1) }
        }
        const len = rows[p.r]?.length || 0
        return { r: p.r, c: Math.max(0, Math.min(len - 1, p.c + dc)) }
      }),
    [rows],
  )

  useEffect(() => {
    if (!enabled) return
    const onKey = (e) => {
      const t = e.target
      if (t && t.matches && t.matches('input, textarea, select')) return

      switch (e.key) {
        case 'ArrowRight': move(0, 1); e.preventDefault(); break
        case 'ArrowLeft': move(0, -1); e.preventDefault(); break
        case 'ArrowDown': move(1, 0); e.preventDefault(); break
        case 'ArrowUp': move(-1, 0); e.preventDefault(); break
        case 'Enter': {
          const item = rows[pos.r]?.[pos.c]
          if (item) onSelect?.(item)
          break
        }
        case 'f':
        case 'F': {
          const item = rows[pos.r]?.[pos.c]
          if (item) onFavorite?.(item)
          break
        }
        case 'Escape':
          onBack?.()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, pos, move, enabled, onSelect, onFavorite, onBack])

  // Derulează item-ul focalizat în vizor.
  useEffect(() => {
    const el = refs.current.get(`${pos.r}:${pos.c}`)
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [pos])

  const isFocused = useCallback((r, c) => pos.r === r && pos.c === c, [pos])

  const registerRef = useCallback(
    (r, c) => (el) => {
      const key = `${r}:${c}`
      if (el) refs.current.set(key, el)
      else refs.current.delete(key)
    },
    [],
  )

  return { pos, isFocused, setPos, registerRef }
}

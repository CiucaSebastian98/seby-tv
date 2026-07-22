import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Navigare 2D „TV-friendly" peste o structură de rânduri.
 * `rows` = array de rânduri, fiecare rând un array de item-uri opace.
 *
 * Taste: săgeți (cu wrap la capăt de rând), PageUp/PageDown (sar 3 rânduri),
 * Home/End (primul/ultimul), Enter = select, `f` = favorite, Escape = back.
 * Focusul poate fi mutat și cu mouse-ul (hover) prin `setPos` — fără derulare.
 * Doar tastele derulează item-ul în vizor (hover-ul nu mișcă pagina).
 */
export function useGridNavigation(rows, { onSelect, onFavorite, onBack, enabled = true } = {}) {
  const [pos, setPos] = useState({ r: 0, c: 0 })
  const refs = useRef(new Map())
  const didInit = useRef(false)
  const scrollNext = useRef(false) // true doar pentru mișcări din tastatură

  // Focus inițial: primul rând cu item-uri.
  useEffect(() => {
    if (didInit.current || rows.length === 0) return
    const r = rows.findIndex((row) => row.length > 0)
    if (r >= 0) {
      setPos({ r, c: 0 })
      didInit.current = true
    }
  }, [rows])

  // Clamp când structura se schimbă.
  useEffect(() => {
    setPos((p) => {
      const r = Math.min(p.r, Math.max(0, rows.length - 1))
      const len = rows[r]?.length || 0
      return { r, c: Math.min(p.c, Math.max(0, len - 1)) }
    })
  }, [rows])

  // Următorul rând ne-gol în direcția dir (sau -1 dacă nu există).
  const nonEmpty = useCallback(
    (from, dir) => {
      let r = from
      while (r >= 0 && r < rows.length && rows[r].length === 0) r += dir
      return r >= 0 && r < rows.length ? r : -1
    },
    [rows],
  )

  const moveH = useCallback(
    (dc) =>
      setPos((p) => {
        const row = rows[p.r] || []
        const c = p.c + dc
        if (c >= 0 && c < row.length) return { r: p.r, c }
        // wrap: capăt de rând -> rândul următor/anterior
        const dir = dc > 0 ? 1 : -1
        const r = nonEmpty(p.r + dir, dir)
        if (r < 0) return p
        return { r, c: dir > 0 ? 0 : rows[r].length - 1 }
      }),
    [rows, nonEmpty],
  )

  const moveV = useCallback(
    (dir, count = 1) =>
      setPos((p) => {
        let r = p.r
        for (let i = 0; i < count; i++) {
          const nr = nonEmpty(r + dir, dir)
          if (nr < 0) break
          r = nr
        }
        const len = rows[r]?.length || 1
        return { r, c: Math.min(p.c, len - 1) }
      }),
    [rows, nonEmpty],
  )

  const jump = useCallback(
    (r, c) =>
      setPos(() => {
        const rr = Math.max(0, Math.min(rows.length - 1, r))
        const len = rows[rr]?.length || 1
        return { r: rr, c: Math.max(0, Math.min(len - 1, c)) }
      }),
    [rows],
  )

  useEffect(() => {
    if (!enabled) return
    const onKey = (e) => {
      const t = e.target
      if (t && t.matches && t.matches('input, textarea, select')) return
      const nav = () => {
        scrollNext.current = true
      }
      switch (e.key) {
        case 'ArrowRight': nav(); moveH(1); e.preventDefault(); break
        case 'ArrowLeft': nav(); moveH(-1); e.preventDefault(); break
        case 'ArrowDown': nav(); moveV(1); e.preventDefault(); break
        case 'ArrowUp': nav(); moveV(-1); e.preventDefault(); break
        case 'PageDown': nav(); moveV(1, 3); e.preventDefault(); break
        case 'PageUp': nav(); moveV(-1, 3); e.preventDefault(); break
        case 'Home': nav(); jump(nonEmpty(0, 1), 0); e.preventDefault(); break
        case 'End': {
          nav()
          const r = nonEmpty(rows.length - 1, -1)
          jump(r, (rows[r]?.length || 1) - 1)
          e.preventDefault()
          break
        }
        case 'Enter': {
          const it = rows[pos.r]?.[pos.c]
          if (it) onSelect?.(it)
          break
        }
        case 'f':
        case 'F': {
          const it = rows[pos.r]?.[pos.c]
          if (it) onFavorite?.(it)
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
  }, [rows, pos, moveH, moveV, jump, nonEmpty, enabled, onSelect, onFavorite, onBack])

  // Derulează în vizor DOAR la mișcări din tastatură (nu la hover).
  useEffect(() => {
    if (!scrollNext.current) return
    scrollNext.current = false
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

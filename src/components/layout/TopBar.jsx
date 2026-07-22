import { useEffect, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from '../../constants.js'
import { useAppActions, useAppState } from '../../context/AppContext.jsx'

/**
 * Bara de sus: wordmark + căutare (debounced) + selector de țară.
 * Nu face parte din grila de focus TV (tastarea are nevoie de tastatură oricum);
 * apeși „/" ca să sari rapid în căutare.
 */
export default function TopBar() {
  const { filters, countries } = useAppState()
  const { setFilter } = useAppActions()
  const [search, setSearch] = useState(filters.search)

  useEffect(() => {
    const t = setTimeout(() => setFilter('search', search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // „/" focalizează căutarea de oriunde.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.target.matches?.('input, textarea, select')) {
        e.preventDefault()
        document.getElementById('tv-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/5 bg-bg/70 px-8 py-4 backdrop-blur-xl md:px-12 lg:px-16">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent font-display text-lg font-extrabold text-white shadow-lg">
          ▶
        </span>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          TV<span className="text-accent">·</span>RO
        </h1>
      </div>

      <div className="relative ml-auto w-full max-w-sm">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          ⌕
        </span>
        <input
          id="tv-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută canal…  ( / )"
          className="w-full rounded-full border border-edge bg-elev/80 py-2.5 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus/40"
        />
      </div>

      <select
        value={filters.country}
        onChange={(e) => setFilter('country', e.target.value)}
        className="hidden rounded-full border border-edge bg-elev/80 px-4 py-2.5 text-sm outline-none focus:border-focus sm:block"
        aria-label="Filtru țară"
      >
        <option value="">Toate țările</option>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.name}
          </option>
        ))}
      </select>
    </header>
  )
}

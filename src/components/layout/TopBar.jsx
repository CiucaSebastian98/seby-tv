import { useEffect, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from '../../constants.js'
import { useAppActions, useAppState } from '../../context/AppContext.jsx'

/**
 * Bara de sus: wordmark + căutare (debounced) + selector de țară.
 * Nu face parte din grila de focus TV (tastarea are nevoie de tastatură oricum);
 * apeși „/" ca să sari rapid în căutare.
 */
export default function TopBar() {
  const { filters, theme } = useAppState()
  const { setFilter, setTheme } = useAppActions()
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
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-edge bg-elev/85 px-8 py-4 backdrop-blur-xl md:px-12 lg:px-16">
      <div className="flex shrink-0 items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent font-display text-lg font-extrabold text-white shadow-lg">
          ▶
        </span>
        <h1 className="whitespace-nowrap font-display text-2xl font-extrabold tracking-tight">
          Seby <span className="text-accent">TV</span>
        </h1>
      </div>

      <div className="relative ml-auto w-full max-w-sm">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl leading-none text-muted">
          ⌕
        </span>
        <input
          id="tv-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută canal…"
          className="w-full rounded-full border border-edge bg-elev/80 py-2.5 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus/40"
        />
      </div>

      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'Comută pe temă deschisă' : 'Comută pe temă închisă'}
        aria-label="Comută tema"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-edge bg-elev/80 text-lg outline-none transition-colors hover:border-focus"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}

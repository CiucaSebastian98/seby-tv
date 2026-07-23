import { useEffect, useRef, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from '../../constants.js'
import { useAppActions, useAppState } from '../../context/AppContext.jsx'

/**
 * Căutarea (debounced), afișată sub banner. Nu face parte din grila de focus TV
 * (tastarea are nevoie de tastatură oricum); apeși „/" ca să sari în ea de oriunde.
 */
export default function SearchBox() {
  const { filters } = useAppState()
  const { setFilter } = useAppActions()
  const [search, setSearch] = useState(filters.search)
  // Ultima valoare pe care noi am trimis-o în store — ne ajută să distingem
  // „ecoul propriu" de o schimbare venită din altă parte.
  const pushed = useRef(filters.search)

  useEffect(() => {
    const t = setTimeout(() => {
      pushed.current = search
      setFilter('search', search)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Căutarea poate fi golită din afară (butonul din empty state). Fără sincronizarea
  // asta, input-ul ar rămâne cu textul vechi și debounce-ul l-ar rescrie în store.
  useEffect(() => {
    if (filters.search !== pushed.current) {
      pushed.current = filters.search
      setSearch(filters.search)
    }
  }, [filters.search])

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
    <div className="mx-8 mb-2 md:mx-12 lg:mx-16">
      <div className="relative max-w-xl">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl leading-none text-muted">
          ⌕
        </span>
        <input
          id="tv-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută canal…"
          className="w-full rounded-full border border-edge bg-elev/80 py-3 pl-12 pr-4 text-base outline-none transition-colors placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus/40"
        />
      </div>
    </div>
  )
}

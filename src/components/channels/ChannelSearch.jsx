import { useEffect, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from '../../constants.js'
import { useAppActions, useAppState } from '../../context/AppContext.jsx'

/**
 * Câmp de căutare cu debounce local. State-ul textului e local (rapid, pentru
 * tastare fluidă); doar valoarea „stabilizată" ajunge în store ca filtru.
 */
export default function ChannelSearch() {
  const { filters } = useAppState()
  const { setFilter } = useAppActions()
  const [value, setValue] = useState(filters.search)

  useEffect(() => {
    const t = setTimeout(() => setFilter('search', value), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Caută canal…"
        className="w-full rounded-lg border border-edge bg-panel px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-accent"
      />
    </div>
  )
}

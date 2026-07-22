import { useAppActions, useAppState } from '../../context/AppContext.jsx'

const selectClass =
  'w-full rounded-lg border border-edge bg-panel px-3 py-2 text-sm outline-none focus:border-accent'

/** Dropdown-uri de filtrare: țară + categorie. Opțiunile vin din store. */
export default function ChannelFilters() {
  const { filters, countries, categories } = useAppState()
  const { setFilter, resetFilters } = useAppActions()

  const hasActive = filters.country || filters.category || filters.search

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={filters.country}
          onChange={(e) => setFilter('country', e.target.value)}
          className={selectClass}
        >
          <option value="">Toate țările</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
          className={selectClass}
        >
          <option value="">Toate categoriile</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {hasActive && (
        <button
          onClick={resetFilters}
          className="text-xs text-slate-400 hover:text-accent"
        >
          Resetează filtrele
        </button>
      )}
    </div>
  )
}

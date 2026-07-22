/**
 * Bara de categorii (chips). Face parte din grila de focus TV — e rândul de sus.
 * `chips` sunt item-uri { value, label }; `activeValue` marchează selecția.
 */
export default function ChipsBar({ chips, activeValue, rowIndex, isFocused, registerRef, onSelect }) {
  return (
    <div className="row-scroll flex gap-2 overflow-x-auto px-8 py-3 md:px-12 lg:px-16">
      {chips.map((chip, c) => {
        const active = chip.value === activeValue
        const focused = isFocused(rowIndex, c)
        return (
          <button
            key={chip.value || 'all'}
            ref={registerRef(rowIndex, c)}
            tabIndex={-1}
            onClick={() => onSelect(chip)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold outline-none transition-all ${
              focused
                ? 'scale-105 bg-focus text-black shadow-focus'
                : active
                  ? 'bg-white text-black'
                  : 'bg-elev text-slate-300 ring-1 ring-edge hover:bg-card'
            }`}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

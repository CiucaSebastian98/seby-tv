import { useEffect, useRef } from 'react'

/**
 * Bara de categorii (chips). Face parte din grila de focus TV — e rândul de sus.
 * `chips` sunt item-uri { value, label }; `activeValue` marchează selecția.
 * Chip-ul activ e verde (ca „Toate") și e derulat automat în centrul barei.
 */
export default function ChipsBar({ chips, activeValue, rowIndex, isFocused, registerRef, setPos, onSelect }) {
  const activeRef = useRef(null)

  // Centrează chip-ul activ când selecția se schimbă.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeValue])

  return (
    <div className="row-scroll flex items-center gap-3 overflow-x-auto px-8 py-4 md:px-12 lg:px-16">
      {chips.map((chip, c) => {
        const active = chip.value === activeValue
        const focused = isFocused(rowIndex, c)
        return (
          <button
            key={chip.value || 'all'}
            ref={(el) => {
              registerRef(rowIndex, c)(el)
              if (active) activeRef.current = el
            }}
            tabIndex={-1}
            onClick={() => onSelect(chip)}
            onMouseEnter={() => setPos({ r: rowIndex, c })}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold outline-none transition-colors ${
              focused
                ? 'bg-focus text-black ring-2 ring-inset ring-black/25'
                : active
                  ? 'bg-focus text-black'
                  : 'bg-elev text-muted ring-1 ring-edge hover:bg-card'
            }`}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

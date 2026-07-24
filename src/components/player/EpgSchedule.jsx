import { useMemo, useState } from 'react'
import { useSchedule } from '../../hooks/useEpg.js'
import { formatTime, formatDayLabel, dayKey } from '../../utils/format.js'

/** Peste câte caractere o descriere primește toggle-ul „vezi mai mult". */
const DESC_EXPAND_THRESHOLD = 140

/** Etichetă scurtă de zi pentru butoanele selectorului: Azi / Mâine / „Sâm, 26 iul." */
function dayTabLabel(date, todayKey, tomorrowKey) {
  const k = dayKey(date)
  if (k === todayKey) return 'Azi'
  if (k === tomorrowKey) return 'Mâine'
  return formatDayLabel(date)
}

/**
 * Programul TV al unui canal, grupat pe zile. Sub titlu, un selector de zile
 * (Azi / Mâine / …) — implicit ziua curentă. Programul care rulează „acum" e
 * evidențiat, iar cele deja încheiate sunt estompate.
 *
 * @param {{ channelId: string }} props
 */
export default function EpgSchedule({ channelId }) {
  const { programmes, nowIndex, hasEpg } = useSchedule(channelId)

  // Grupăm programele pe zile, păstrând indexul original (pentru „acum").
  const days = useMemo(() => {
    const map = new Map()
    programmes.forEach((p, i) => {
      const k = dayKey(p.start)
      if (!map.has(k)) map.set(k, { key: k, date: p.start, items: [] })
      map.get(k).items.push({ p, i })
    })
    return [...map.values()]
  }, [programmes])

  const now = new Date()
  const todayKey = dayKey(now)
  const tomorrowKey = dayKey(new Date(now.getTime() + 24 * 3600 * 1000))

  // Ziua implicită: cea care conține programul curent, altfel prima disponibilă.
  const defaultKey =
    (nowIndex >= 0 && dayKey(programmes[nowIndex].start)) || days[0]?.key || ''
  const [selectedKey, setSelectedKey] = useState(defaultKey)

  // Dacă lista se schimbă (alt canal) și cheia selectată nu mai există, cădem
  // pe ziua implicită a noului canal.
  const activeKey = days.some((d) => d.key === selectedKey) ? selectedKey : defaultKey
  const activeDay = days.find((d) => d.key === activeKey)

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-16">
      <h3 className="mb-3 font-display text-lg font-bold text-fg">Program TV</h3>

      {!hasEpg ? (
        <p className="rounded-xl bg-card/60 p-4 text-sm text-muted ring-1 ring-edge">
          Program indisponibil pentru acest canal.
        </p>
      ) : (
        <>
          {/* Selector de zile */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => {
              const active = d.key === activeKey
              return (
                <button
                  key={d.key}
                  onClick={() => setSelectedKey(d.key)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition-colors ${
                    active
                      ? 'bg-accent text-white ring-transparent'
                      : 'bg-card text-fg/80 ring-edge hover:bg-elev'
                  }`}
                >
                  {dayTabLabel(d.date, todayKey, tomorrowKey)}
                </button>
              )
            })}
          </div>

          <ol className="space-y-1">
            {activeDay?.items.map(({ p, i }) => (
              <ProgramItem
                key={`${p.start.getTime()}-${i}`}
                p={p}
                isNow={i === nowIndex}
                isPast={i !== nowIndex && p.start < now}
              />
            ))}
          </ol>
        </>
      )}
    </section>
  )
}

/**
 * Un rând de program. Descrierile lungi (> prag) sunt trunchiate la 2 rânduri cu
 * un toggle „vezi mai mult / mai puțin", ca să poți citi tot textul fără să pleci
 * din pagină. Descrierile scurte se afișează integral, fără toggle.
 */
function ProgramItem({ p, isNow, isPast }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = (p.desc?.length || 0) > DESC_EXPAND_THRESHOLD

  return (
    <li
      className={`flex gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        isNow
          ? 'bg-accent/15 ring-1 ring-accent/40'
          : isPast
            ? 'opacity-50'
            : 'hover:bg-card/60'
      }`}
    >
      <div className="w-24 shrink-0 tabular-nums text-sm text-muted">
        {formatTime(p.start)}
        {p.stop ? `–${formatTime(p.stop)}` : ''}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isNow ? 'text-fg' : 'text-fg/90'}`}>
            {p.title || 'Program'}
          </span>
          {isNow && (
            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              ● Acum
            </span>
          )}
        </div>

        {p.desc && (
          <>
            <p
              className={`mt-0.5 text-sm text-muted ${
                isLong && !expanded ? 'line-clamp-2' : ''
              }`}
            >
              {p.desc}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs font-semibold text-accent transition-colors hover:underline"
              >
                {expanded ? 'Vezi mai puțin ▲' : 'Vezi mai mult ▼'}
              </button>
            )}
          </>
        )}
      </div>
    </li>
  )
}

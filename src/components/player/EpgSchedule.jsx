import { useSchedule } from '../../hooks/useEpg.js'
import { formatTime, formatDayLabel, dayKey } from '../../utils/format.js'

/**
 * Programul TV complet al unui canal: rânduri `oră start–stop · titlu`, cu
 * separator de zi și evidențierea programului care rulează „ACUM". Programele
 * deja încheiate sunt estompate.
 *
 * @param {{ channelId: string }} props
 */
export default function EpgSchedule({ channelId }) {
  const { programmes, nowIndex, hasEpg } = useSchedule(channelId)
  const now = new Date()

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-16">
      <h3 className="mb-3 font-display text-lg font-bold text-fg">Program TV</h3>

      {!hasEpg ? (
        <p className="rounded-xl bg-card/60 p-4 text-sm text-muted ring-1 ring-edge">
          Program indisponibil pentru acest canal.
        </p>
      ) : (
        <ol className="space-y-1">
          {programmes.map((p, i) => {
            const isNow = i === nowIndex
            const isPast = !isNow && p.start < now
            const prev = programmes[i - 1]
            const newDay = !prev || dayKey(prev.start) !== dayKey(p.start)

            return (
              <li key={`${p.start.getTime()}-${i}`}>
                {newDay && (
                  <div className="mb-1 mt-4 border-b border-edge pb-1 text-xs font-semibold uppercase tracking-wide text-muted first:mt-0">
                    {formatDayLabel(p.start)}
                  </div>
                )}

                <div
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
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted">{p.desc}</p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

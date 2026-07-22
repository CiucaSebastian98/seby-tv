import { useNowNext } from '../../hooks/useEpg.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { formatTime } from '../../utils/format.js'

/**
 * Bara de sub player: nume canal, buton favorite și EPG now/next.
 * Dacă nu există date EPG, secțiunea de program pur și simplu nu apare.
 */
export default function PlayerOverlay({ channel }) {
  const { now, next, hasEpg } = useNowNext(channel?.id)
  const { isFavorite, toggleFavorite } = useFavorites()

  if (!channel) return null
  const fav = isFavorite(channel.id)

  return (
    <div className="border-t border-edge bg-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-100">
            {channel.flag} {channel.name}
          </h2>
          <p className="truncate text-sm text-slate-400">
            {channel.countryName}
            {channel.categoryNames.length ? ` · ${channel.categoryNames.join(', ')}` : ''}
          </p>
        </div>

        <button
          onClick={() => toggleFavorite(channel.id)}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm ${
            fav
              ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-300'
              : 'border-edge text-slate-300 hover:border-accent'
          }`}
        >
          {fav ? '★ Favorit' : '☆ Adaugă la favorite'}
        </button>
      </div>

      {hasEpg && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <EpgSlot label="Acum" prog={now} />
          <EpgSlot label="Urmează" prog={next} />
        </div>
      )}
    </div>
  )
}

function EpgSlot({ label, prog }) {
  return (
    <div className="rounded-lg border border-edge bg-surface p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      {prog ? (
        <>
          <p className="mt-1 truncate text-sm font-medium text-slate-100">
            {prog.title || '—'}
          </p>
          <p className="text-xs text-slate-400">
            {formatTime(prog.start)}
            {prog.stop ? ` – ${formatTime(prog.stop)}` : ''}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-500">—</p>
      )}
    </div>
  )
}

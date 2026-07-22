import { useCallback, useState } from 'react'
import ChannelListItem from './ChannelListItem.jsx'
import ChannelSearch from './ChannelSearch.jsx'
import ChannelFilters from './ChannelFilters.jsx'
import { CHANNEL_PAGE_SIZE } from '../../constants.js'
import { useAppActions, useAppState, useVisibleChannels } from '../../context/AppContext.jsx'
import { useFavorites } from '../../hooks/useFavorites.js'

/**
 * Panoul din stânga: căutare + filtre + listă de canale.
 * Randăm incremental (CHANNEL_PAGE_SIZE) pentru a nu monta mii de rânduri deodată.
 */
export default function ChannelList() {
  const { currentChannelId } = useAppState()
  const { setCurrentChannel } = useAppActions()
  const { isFavorite, toggleFavorite } = useFavorites()
  const visible = useVisibleChannels()

  const [limit, setLimit] = useState(CHANNEL_PAGE_SIZE)

  const onSelect = useCallback((id) => setCurrentChannel(id), [setCurrentChannel])
  const onToggleFavorite = useCallback((id) => toggleFavorite(id), [toggleFavorite])

  const shown = visible.slice(0, limit)

  return (
    <aside className="flex h-full w-full flex-col gap-3 border-r border-edge bg-surface p-3 md:w-80 lg:w-96">
      <ChannelSearch />
      <ChannelFilters />

      <p className="px-1 text-xs text-slate-500">{visible.length} canale</p>

      <ul className="scroll-thin flex-1 space-y-1 overflow-y-auto pr-1">
        {shown.map((ch) => (
          <ChannelListItem
            key={ch.id}
            channel={ch}
            isActive={ch.id === currentChannelId}
            isFavorite={isFavorite(ch.id)}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
          />
        ))}

        {visible.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-slate-500">
            Niciun canal nu se potrivește filtrelor.
          </li>
        )}

        {limit < visible.length && (
          <li className="pt-2">
            <button
              onClick={() => setLimit((n) => n + CHANNEL_PAGE_SIZE)}
              className="w-full rounded-lg border border-edge bg-panel py-2 text-sm text-slate-300 hover:border-accent"
            >
              Arată mai multe ({visible.length - limit} rămase)
            </button>
          </li>
        )}
      </ul>
    </aside>
  )
}

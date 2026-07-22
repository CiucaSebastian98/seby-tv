import { Fragment, useCallback, useMemo, useState } from 'react'
import ChannelListItem from './ChannelListItem.jsx'
import ChannelSearch from './ChannelSearch.jsx'
import ChannelFilters from './ChannelFilters.jsx'
import { CHANNEL_PAGE_SIZE } from '../../constants.js'
import { useAppActions, useAppState, useVisibleChannels } from '../../context/AppContext.jsx'
import { partitionFavorites } from '../../services/channelService.js'
import { useFavorites } from '../../hooks/useFavorites.js'

/**
 * Panoul din stânga: căutare + filtre + listă de canale.
 * Favoritele sunt reordonate în capul listei (înainte de paginare), cu un
 * separator față de restul canalelor. Randăm incremental (CHANNEL_PAGE_SIZE).
 */
export default function ChannelList() {
  const { currentChannelId } = useAppState()
  const { setCurrentChannel } = useAppActions()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const visible = useVisibleChannels()

  const [limit, setLimit] = useState(CHANNEL_PAGE_SIZE)

  const onSelect = useCallback((id) => setCurrentChannel(id), [setCurrentChannel])
  const onToggleFavorite = useCallback((id) => toggleFavorite(id), [toggleFavorite])

  // Favorite (care trec de filtre) sus, apoi restul — ambele deja alfabetice.
  const { ordered, favCount } = useMemo(() => {
    const { favorites: favs, rest } = partitionFavorites(visible, favorites)
    return { ordered: [...favs, ...rest], favCount: favs.length }
  }, [visible, favorites])

  const shown = ordered.slice(0, limit)

  return (
    <aside className="flex h-full w-full flex-col gap-3 border-r border-edge bg-surface p-3 md:w-80 lg:w-96">
      <ChannelSearch />
      <ChannelFilters />

      <p className="px-1 text-xs text-slate-500">
        {visible.length} canale
        {favCount > 0 && <span className="text-yellow-400/80"> · {favCount} favorite</span>}
      </p>

      <ul className="scroll-thin flex-1 space-y-1 overflow-y-auto pr-1">
        {favCount > 0 && <SectionLabel>★ Favorite</SectionLabel>}

        {shown.map((ch, idx) => (
          <Fragment key={ch.id}>
            {idx === favCount && favCount > 0 && <SectionLabel>Toate canalele</SectionLabel>}
            <ChannelListItem
              channel={ch}
              isActive={ch.id === currentChannelId}
              isFavorite={isFavorite(ch.id)}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
          </Fragment>
        ))}

        {visible.length === 0 && (
          <li className="px-2 py-6 text-center text-sm text-slate-500">
            Niciun canal nu se potrivește filtrelor.
          </li>
        )}

        {limit < ordered.length && (
          <li className="pt-2">
            <button
              onClick={() => setLimit((n) => n + CHANNEL_PAGE_SIZE)}
              className="w-full rounded-lg border border-edge bg-panel py-2 text-sm text-slate-300 hover:border-accent"
            >
              Arată mai multe ({ordered.length - limit} rămase)
            </button>
          </li>
        )}
      </ul>
    </aside>
  )
}

function SectionLabel({ children }) {
  return (
    <li className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </li>
  )
}

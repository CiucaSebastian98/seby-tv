import { useMemo } from 'react'
import TopBar from '../layout/TopBar.jsx'
import ChipsBar from './ChipsBar.jsx'
import Hero from './Hero.jsx'
import CategoryRow from './CategoryRow.jsx'
import { useAppActions, useAppState } from '../../context/AppContext.jsx'
import { groupByCategory, selectVisibleChannels } from '../../services/channelService.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useGridNavigation } from '../../hooks/useGridNavigation.js'

const FAV = '__fav'

/**
 * Ecranul de răsfoire stil Netflix: chips de categorie + hero + rânduri
 * orizontale pe categorii. Navigabil complet cu telecomanda/tastatura.
 */
export default function BrowseView() {
  const { channels, categories, filters } = useAppState()
  const { setFilter, setCurrentChannel } = useAppActions()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()

  const activeCategory = filters.category

  // Canale pe search+country (categoria e ignorată — categoriile SUNT rândurile).
  const visible = useMemo(
    () => selectVisibleChannels(channels, { ...filters, category: '' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, filters.search, filters.country],
  )

  const favChannels = useMemo(
    () => visible.filter((c) => favorites.includes(c.id)),
    [visible, favorites],
  )

  const searching = !!filters.search.trim()
  const showHero = activeCategory === '' && !searching && visible.length > 0
  const featured = showHero ? favChannels[0] || visible[0] : null

  // Rândurile de conținut în funcție de chip-ul activ.
  const contentRows = useMemo(() => {
    if (activeCategory === FAV)
      return favChannels.length ? [{ title: '★ Favorite', channels: favChannels }] : []
    if (activeCategory) {
      const only = visible.filter((c) => c.categoryIds.includes(activeCategory))
      return only.length ? [{ title: activeCategory, channels: only }] : []
    }
    const groups = groupByCategory(visible).map((g) => ({ title: g.name, channels: g.channels }))
    return favChannels.length
      ? [{ title: '★ Favorite', channels: favChannels }, ...groups]
      : groups
  }, [activeCategory, visible, favChannels])

  const chips = useMemo(() => {
    const base = [{ value: '', label: 'Toate' }]
    if (favorites.length) base.push({ value: FAV, label: '★ Favorite' })
    return base.concat(categories.map((c) => ({ value: c.id, label: c.name })))
  }, [categories, favorites.length])

  // Grila de focus (ordine vizuală): [chips, (hero?), ...rânduri categorii].
  const { gridRows, chipsRowIndex, heroRowIndex, catSections } = useMemo(() => {
    const rows = [chips.map((ch) => ({ kind: 'chip', ...ch }))]
    let heroIdx = -1
    if (featured) {
      heroIdx = rows.length
      rows.push([{ kind: 'channel', channel: featured }])
    }
    const cats = contentRows.map((cr) => {
      const rowIndex = rows.length
      rows.push(cr.channels.map((c) => ({ kind: 'channel', channel: c })))
      return { ...cr, rowIndex }
    })
    return { gridRows: rows, chipsRowIndex: 0, heroRowIndex: heroIdx, catSections: cats }
  }, [chips, featured, contentRows])

  // Handlere pentru mouse (item „brut").
  const playChannel = (ch) => setCurrentChannel(ch.id)
  const favChannel = (ch) => toggleFavorite(ch.id)
  const selectChip = (chip) => setFilter('category', chip.value)

  // Handlere pentru tastatură (item din grilă, cu `kind`).
  const onGridSelect = (item) => {
    if (item.kind === 'chip') setFilter('category', item.value)
    else if (item.kind === 'channel') setCurrentChannel(item.channel.id)
  }
  const onGridFavorite = (item) => {
    if (item.kind === 'channel') toggleFavorite(item.channel.id)
  }

  const { isFocused, registerRef } = useGridNavigation(gridRows, {
    onSelect: onGridSelect,
    onFavorite: onGridFavorite,
  })

  return (
    <div className="min-h-screen pb-20">
      <TopBar />

      <ChipsBar
        chips={chips}
        activeValue={activeCategory}
        rowIndex={chipsRowIndex}
        isFocused={isFocused}
        registerRef={registerRef}
        onSelect={selectChip}
      />

      {heroRowIndex >= 0 && (
        <Hero
          channel={featured}
          rowIndex={heroRowIndex}
          isFocused={isFocused}
          registerRef={registerRef}
          isFavorite={isFavorite}
          onSelect={playChannel}
        />
      )}

      <div className="mt-2 space-y-6">
        {catSections.map((cr) => (
          <CategoryRow
            key={cr.title}
            title={cr.title}
            channels={cr.channels}
            rowIndex={cr.rowIndex}
            isFocused={isFocused}
            registerRef={registerRef}
            isFavorite={isFavorite}
            onSelect={playChannel}
            onFavorite={favChannel}
          />
        ))}

        {contentRows.length === 0 && (
          <p className="px-8 py-20 text-center text-muted md:px-12 lg:px-16">
            Niciun canal găsit{filters.search ? ` pentru „${filters.search}"` : ''}.
          </p>
        )}
      </div>

      <HelpBar />
    </div>
  )
}

function HelpBar() {
  const key = (k) => (
    <kbd className="rounded bg-elev px-1.5 py-0.5 font-sans text-[11px] text-slate-300 ring-1 ring-edge">
      {k}
    </kbd>
  )
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-8 text-xs text-muted">
      <span className="flex items-center gap-1.5">{key('↑')} {key('↓')} {key('←')} {key('→')} navighezi</span>
      <span className="flex items-center gap-1.5">{key('Enter')} redai</span>
      <span className="flex items-center gap-1.5">{key('f')} favorite</span>
      <span className="flex items-center gap-1.5">{key('/')} caută</span>
      <span className="flex items-center gap-1.5">{key('Esc')} înapoi</span>
    </div>
  )
}

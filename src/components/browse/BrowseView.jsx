import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../layout/TopBar.jsx'
import ChipsBar from './ChipsBar.jsx'
import Hero from './Hero.jsx'
import ChannelGrid from './ChannelGrid.jsx'
import { useAppActions, useAppState } from '../../context/AppContext.jsx'
import { partitionFavorites, selectVisibleChannels } from '../../services/channelService.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useGridNavigation } from '../../hooks/useGridNavigation.js'
import { useColumns } from '../../hooks/useColumns.js'

const FAV = '__fav'

/**
 * Ecranul de răsfoire: chips de categorie + hero + grid responsive de canale.
 * Grid (nu rânduri per-categorie) ca să nu rămână linii goale când o categorie
 * are puține canale. Favoritele sunt afișate primele. Navigabil complet cu tastele.
 */
export default function BrowseView() {
  const { channels, categories, filters } = useAppState()
  const { setFilter } = useAppActions()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const navigate = useNavigate()

  const gridRef = useRef(null)
  const cols = useColumns(gridRef)

  const activeCategory = filters.category
  const searching = !!filters.search.trim()

  // search + country (RO). Categoria o aplicăm separat mai jos.
  const base = useMemo(
    () => selectVisibleChannels(channels, { ...filters, category: '' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, filters.search, filters.country],
  )

  // Canalele afișate în funcție de chip-ul activ, cu favoritele primele.
  const ordered = useMemo(() => {
    let list = base
    if (activeCategory === FAV) list = base.filter((c) => favorites.includes(c.id))
    else if (activeCategory) list = base.filter((c) => c.categoryIds.includes(activeCategory))
    const { favorites: fav, rest } = partitionFavorites(list, favorites)
    return [...fav, ...rest]
  }, [base, activeCategory, favorites])

  const showHero = activeCategory === '' && !searching && ordered.length > 0
  const featured = showHero ? ordered[0] : null

  const chips = useMemo(() => {
    const arr = [{ value: '', label: 'Toate' }]
    if (favorites.length) arr.push({ value: FAV, label: '★ Favorite' })
    return arr.concat(categories.map((c) => ({ value: c.id, label: c.name })))
  }, [categories, favorites.length])

  // Grila de focus: [chips, (hero?), ...rânduri de câte `cols` canale].
  const { gridRows, navBase } = useMemo(() => {
    const rows = [chips.map((ch) => ({ kind: 'chip', ...ch }))]
    if (featured) rows.push([{ kind: 'channel', channel: featured }])
    const base = rows.length // = 1 (chips) + (hero?1:0)
    for (let i = 0; i < ordered.length; i += cols) {
      rows.push(ordered.slice(i, i + cols).map((c) => ({ kind: 'channel', channel: c })))
    }
    return { gridRows: rows, navBase: base }
  }, [chips, featured, ordered, cols])

  // Selectează o categorie; click pe cea deja activă o deselectează (revine la Toate).
  // Mută focusul pe chip-ul care rămâne activ, ca doar acela să fie verde.
  const applyChip = (value) => {
    const next = value === activeCategory ? '' : value
    setFilter('category', next)
    const idx = chips.findIndex((c) => c.value === next)
    setPos({ r: 0, c: idx < 0 ? 0 : idx })
  }

  // Handlere mouse.
  const playChannel = (ch) => navigate(`/${ch.slug}`)
  const favChannel = (ch) => toggleFavorite(ch.id)
  const selectChip = (chip) => applyChip(chip.value)

  // Handlere tastatură (item din grilă).
  const onGridSelect = (item) => {
    if (item.kind === 'chip') applyChip(item.value)
    else if (item.kind === 'channel') navigate(`/${item.channel.slug}`)
  }
  const onGridFavorite = (item) => {
    if (item.kind === 'channel') toggleFavorite(item.channel.id)
  }

  const { isFocused, registerRef, setPos } = useGridNavigation(gridRows, {
    onSelect: onGridSelect,
    onFavorite: onGridFavorite,
  })

  return (
    <div className="min-h-screen pb-20">
      <TopBar />

      <ChipsBar
        chips={chips}
        activeValue={activeCategory}
        rowIndex={0}
        isFocused={isFocused}
        registerRef={registerRef}
        setPos={setPos}
        onSelect={selectChip}
      />

      {featured && (
        <Hero
          channel={featured}
          rowIndex={1}
          isFocused={isFocused}
          registerRef={registerRef}
          setPos={setPos}
          isFavorite={isFavorite}
          onSelect={playChannel}
        />
      )}

      {ordered.length > 0 ? (
        <div className="mt-6">
          <ChannelGrid
            channels={ordered}
            cols={cols}
            navBase={navBase}
            gridRef={gridRef}
            isFocused={isFocused}
            registerRef={registerRef}
            setPos={setPos}
            isFavorite={isFavorite}
            onSelect={playChannel}
            onFavorite={favChannel}
          />
        </div>
      ) : (
        <p className="px-8 py-20 text-center text-muted md:px-12 lg:px-16">
          Niciun canal găsit{filters.search ? ` pentru „${filters.search}"` : ''}.
        </p>
      )}
    </div>
  )
}

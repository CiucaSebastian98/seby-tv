import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../layout/TopBar.jsx'
import Footer from '../layout/Footer.jsx'
import ChipsBar from './ChipsBar.jsx'
import Hero from './Hero.jsx'
import SearchBox from './SearchBox.jsx'
import ChannelGrid from './ChannelGrid.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { useAppActions, useAppState } from '../../context/AppContext.jsx'
import { partitionFavorites, selectVisibleChannels } from '../../services/channelService.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useRecent } from '../../hooks/useRecent.js'
import { useGridNavigation } from '../../hooks/useGridNavigation.js'
import { useColumns } from '../../hooks/useColumns.js'

const FAV = '__fav'
const RECENT = '__recent'

/**
 * Ecranul de răsfoire: chips de categorie + hero + grid responsive de canale.
 * Grid (nu rânduri per-categorie) ca să nu rămână linii goale când o categorie
 * are puține canale. Favoritele sunt afișate primele. Navigabil complet cu tastele.
 */
export default function BrowseView() {
  const { channels, categories, filters } = useAppState()
  const { setFilter } = useAppActions()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const { recent } = useRecent()
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
    // „Ultimele vizionate" păstrează ordinea cronologică (cel mai recent primul),
    // deci nu trece prin sortarea alfabetică sau prin favorite-first.
    if (activeCategory === RECENT) {
      const byId = new Map(base.map((c) => [c.id, c]))
      return recent.map((id) => byId.get(id)).filter(Boolean)
    }

    let list = base
    if (activeCategory === FAV) list = base.filter((c) => favorites.includes(c.id))
    else if (activeCategory) list = base.filter((c) => c.categoryIds.includes(activeCategory))
    const { favorites: fav, rest } = partitionFavorites(list, favorites)
    return [...fav, ...rest]
  }, [base, activeCategory, favorites, recent])

  // ── Secțiuni ──
  // Pe ecranul implicit (fără categorie activă, fără căutare) despărțim lista în
  // „Ultimele vizionate" / „Favorite" / „Toate canalele". Când userul filtrează
  // sau caută, rămâne o singură listă — secțiunile ar fi zgomot.
  const showSections = activeCategory === '' && !searching

  const recentChannels = useMemo(() => {
    if (!showSections) return []
    const byId = new Map(base.map((c) => [c.id, c]))
    return recent.map((id) => byId.get(id)).filter(Boolean)
  }, [base, recent, showSections])

  const favChannels = useMemo(
    () => (showSections ? base.filter((c) => favorites.includes(c.id)) : []),
    [base, favorites, showSections],
  )

  // Caruselul din hero: favorite + ultimele vizionate, deduplicate (max 10). Dacă
  // userul n-are încă niciuna, cădem pe primele canale, ca banner-ul să nu fie gol.
  const heroChannels = useMemo(() => {
    if (!showSections) return []
    const seen = new Set()
    const list = []
    for (const ch of [...recentChannels, ...favChannels]) {
      if (ch && !seen.has(ch.id)) {
        seen.add(ch.id)
        list.push(ch)
      }
    }
    const picked = list.slice(0, 10)
    return picked.length ? picked : base.slice(0, 6)
  }, [showSections, recentChannels, favChannels, base])

  const showHero = heroChannels.length > 0
  // Canalul afișat acum în hero (rotește), pentru Enter din navigarea cu tastele.
  const heroCurrentRef = useRef(heroChannels[0] || null)

  const sections = useMemo(() => {
    if (!showSections) return [{ id: 'result', title: '', channels: ordered }]

    const out = []
    if (recentChannels.length) {
      out.push({ id: 'recent', title: 'Ultimele vizionate', icon: '↻', channels: recentChannels })
    }
    if (favChannels.length) {
      out.push({ id: 'fav', title: 'Favorite', icon: '★', channels: favChannels })
    }
    // Când există secțiuni deasupra, „toate" rămâne pur alfabetic: favoritele
    // sunt deja afișate, nu are rost să le mai urcăm în capul listei.
    out.push({
      id: 'all',
      title: out.length ? 'Toate canalele' : '',
      channels: out.length ? base : ordered,
    })
    return out
  }, [showSections, ordered, base, recentChannels, favChannels])

  const chips = useMemo(() => {
    const arr = [{ value: '', label: 'Toate' }]
    if (recent.length) arr.push({ value: RECENT, label: '↻ Ultimele vizionate' })
    if (favorites.length) arr.push({ value: FAV, label: '★ Favorite' })
    return arr.concat(categories.map((c) => ({ value: c.id, label: c.name })))
  }, [categories, favorites.length, recent.length])

  // Grila de focus: [chips, (hero?), ...rândurile fiecărei secțiuni, la rând].
  // `sectionBases[i]` = indexul primului rând al secțiunii i, ca navigarea cu
  // tastele să curgă natural dintr-o secțiune în următoarea.
  const { gridRows, sectionBases } = useMemo(() => {
    const rows = [chips.map((ch) => ({ kind: 'chip', ...ch }))]
    if (showHero) rows.push([{ kind: 'hero' }])

    const bases = []
    for (const section of sections) {
      bases.push(rows.length)
      for (let i = 0; i < section.channels.length; i += cols) {
        rows.push(section.channels.slice(i, i + cols).map((c) => ({ kind: 'channel', channel: c })))
      }
    }
    return { gridRows: rows, sectionBases: bases }
  }, [chips, showHero, sections, cols])

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
    else if (item.kind === 'hero') {
      const ch = heroCurrentRef.current || heroChannels[0]
      if (ch) navigate(`/${ch.slug}`)
    } else if (item.kind === 'channel') navigate(`/${item.channel.slug}`)
  }
  const onGridFavorite = (item) => {
    if (item.kind === 'channel') toggleFavorite(item.channel.id)
  }

  const { isFocused, registerRef, setPos } = useGridNavigation(gridRows, {
    onSelect: onGridSelect,
    onFavorite: onGridFavorite,
  })

  // Revine la ecranul implicit: golește căutarea și deselectează categoria.
  const resetView = () => {
    setFilter('search', '')
    setFilter('category', '')
    setPos({ r: 0, c: 0 })
  }

  // Mesaj potrivit cauzei: „nimic aici" nu ajută pe nimeni.
  const emptyState = useMemo(() => {
    if (searching) {
      return {
        title: 'Niciun canal găsit',
        message: `Nu am găsit nimic pentru „${filters.search.trim()}". Verifică ortografia sau încearcă un cuvânt mai scurt.`,
        actionLabel: 'Șterge căutarea',
        onAction: resetView,
      }
    }
    if (activeCategory === FAV) {
      return {
        title: 'Nicio favorită încă',
        message: 'Apasă ★ pe un canal ca să îl adaugi aici. Favoritele îți apar primele în listă.',
        actionLabel: 'Vezi toate canalele',
        onAction: resetView,
      }
    }
    if (activeCategory === RECENT) {
      return {
        title: 'Niciun canal vizionat încă',
        message: 'Canalele pe care le deschizi apar aici, cel mai recent primul.',
        actionLabel: 'Vezi toate canalele',
        onAction: resetView,
      }
    }
    if (activeCategory) {
      return {
        title: 'Categorie goală',
        message: `Nu există canale în „${activeCategory}" pentru filtrele curente.`,
        actionLabel: 'Vezi toate canalele',
        onAction: resetView,
      }
    }
    return {
      title: 'Niciun canal disponibil',
      message: 'Playlist-ul s-a încărcat, dar nu conține niciun canal redabil.',
      actionLabel: 'Reîncarcă',
      onAction: () => window.location.reload(),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, filters.search, activeCategory])

  return (
    <div className="min-h-screen">
      {/* Navbar + categorii = un bloc sticky, fundal solid (fără textură). */}
      <div className="sticky top-0 z-30 border-b border-edge bg-bg">
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
      </div>

      {showHero && (
        <Hero
          channels={heroChannels}
          rowIndex={1}
          isFocused={isFocused}
          registerRef={registerRef}
          setPos={setPos}
          onSelect={playChannel}
          onCurrentChange={(ch) => {
            heroCurrentRef.current = ch
          }}
        />
      )}

      {/* Mai mult spațiu deasupra căutării când urmează un empty state, ca să nu
          stea lipită de bara de categorii. */}
      <div className={ordered.length === 0 ? 'pt-6 md:pt-10' : ''}>
        <SearchBox />
      </div>

      {/* Element de măsurare stabil pentru useColumns. Are exact padding-ul
          orizontal al grilelor, deci `clientWidth` e identic — dar spre deosebire
          de o grilă, nu dispare și nu-și schimbă identitatea când apar sau
          dispar secțiuni, așa că ResizeObserver-ul nu rămâne pe un nod detașat. */}
      <div ref={gridRef} className="h-0 px-8 md:px-12 lg:px-16" aria-hidden />

      {ordered.length > 0 ? (
        sections.map((section, i) => (
          <section key={section.id} className="mt-6">
            {section.title && (
              <h2 className="mb-3 flex items-baseline gap-2 px-8 font-display text-xl font-extrabold tracking-tight md:px-12 lg:px-16">
                {section.icon && <span className="text-accent">{section.icon}</span>}
                {section.title}
                <span className="text-sm font-semibold text-muted">{section.channels.length}</span>
              </h2>
            )}
            <ChannelGrid
              channels={section.channels}
              cols={cols}
              navBase={sectionBases[i]}
              isFocused={isFocused}
              registerRef={registerRef}
              setPos={setPos}
              isFavorite={isFavorite}
              onSelect={playChannel}
              onFavorite={favChannel}
            />
          </section>
        ))
      ) : (
        <EmptyState {...emptyState} />
      )}

      <Footer />
    </div>
  )
}

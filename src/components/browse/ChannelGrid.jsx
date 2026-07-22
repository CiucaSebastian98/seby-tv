import ChannelCard from './ChannelCard.jsx'

/**
 * Grid responsive de canale. Poziția în grilă (rând, coloană) pentru navigarea
 * cu tastele se derivă din index: r = navBase + floor(i/cols), c = i % cols.
 * `gridRef` e folosit de useColumns ca să măsoare lățimea.
 */
export default function ChannelGrid({
  channels,
  cols,
  navBase,
  gridRef,
  isFocused,
  registerRef,
  setPos,
  isFavorite,
  onSelect,
  onFavorite,
}) {
  return (
    <div
      ref={gridRef}
      className="grid gap-x-2 gap-y-10 px-8 md:px-12 lg:px-16"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {channels.map((ch, i) => {
        const r = navBase + Math.floor(i / cols)
        const c = i % cols
        return (
          <ChannelCard
            key={ch.id}
            channel={ch}
            focused={isFocused(r, c)}
            isFavorite={isFavorite(ch.id)}
            onSelect={onSelect}
            onFavorite={onFavorite}
            onHover={() => setPos({ r, c })}
            cardRef={registerRef(r, c)}
          />
        )
      })}
    </div>
  )
}

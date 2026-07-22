import ChannelCard from './ChannelCard.jsx'

/**
 * Un rând orizontal de canale (o categorie). Randează cardurile și leagă
 * focusul/ref-urile la sistemul de navigare (rowIndex din grilă).
 */
export default function CategoryRow({
  title,
  channels,
  rowIndex,
  isFocused,
  registerRef,
  isFavorite,
  onSelect,
  onFavorite,
}) {
  if (channels.length === 0) return null

  return (
    <section className="animate-fade-up">
      <div className="mb-2 flex items-baseline gap-3 px-8 md:px-12 lg:px-16">
        <h2 className="font-display text-lg font-bold tracking-tight text-slate-100">
          {title}
        </h2>
        <span className="text-xs text-muted">{channels.length}</span>
      </div>

      <div className="row-scroll flex gap-1 overflow-x-auto px-8 pb-2 md:px-12 lg:px-16">
        {channels.map((ch, c) => (
          <ChannelCard
            key={ch.id}
            channel={ch}
            focused={isFocused(rowIndex, c)}
            isFavorite={isFavorite(ch.id)}
            onSelect={onSelect}
            onFavorite={onFavorite}
            cardRef={registerRef(rowIndex, c)}
          />
        ))}
      </div>
    </section>
  )
}

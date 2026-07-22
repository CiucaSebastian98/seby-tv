import { memo } from 'react'
import { initials } from '../../utils/format.js'

/**
 * Card de canal stil Netflix. Focus vizibil (inel auriu + scale) pentru navigare
 * cu telecomanda; hover/click pentru mouse. Steaua comută favoritul.
 */
function ChannelCard({ channel, focused, isFavorite, onSelect, onFavorite, cardRef }) {
  return (
    <button
      ref={cardRef}
      onClick={() => onSelect(channel)}
      tabIndex={-1}
      className={`group relative flex w-44 shrink-0 flex-col gap-2 rounded-xl p-2 text-left outline-none transition-all duration-200 md:w-52 ${
        focused ? 'z-10 scale-105 bg-card shadow-focus' : 'hover:scale-[1.03] hover:bg-card/60'
      }`}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-elev to-black ring-1 ring-edge">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className="absolute inset-0 h-full w-full object-contain p-5"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center font-display text-3xl font-bold text-muted">
            {initials(channel.name)}
          </span>
        )}

        {/* comută favoritul (mouse); cu telecomanda: tasta f */}
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation()
            onFavorite(channel)
          }}
          className={`absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full text-sm transition-all ${
            isFavorite
              ? 'bg-black/40 text-focus'
              : 'bg-black/40 text-white/70 opacity-0 hover:text-focus group-hover:opacity-100'
          } ${focused ? 'opacity-100' : ''}`}
        >
          {isFavorite ? '★' : '☆'}
        </span>

        <span
          className={`absolute inset-0 grid place-items-center bg-black/50 transition-opacity ${
            focused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-white shadow-lg">
            ▶
          </span>
        </span>
      </div>

      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-semibold text-slate-100">{channel.name}</p>
        <p className="truncate text-xs text-muted">
          {channel.flag} {channel.categoryNames[0]}
        </p>
      </div>
    </button>
  )
}

export default memo(ChannelCard)

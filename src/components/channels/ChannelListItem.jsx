import { memo } from 'react'
import { initials } from '../../utils/format.js'

/**
 * Un rând de canal. `memo` + callback-uri stabile din părinte => randare eficientă
 * chiar și pentru liste lungi.
 */
function ChannelListItem({ channel, isActive, isFavorite, onSelect, onToggleFavorite }) {
  return (
    <li
      onClick={() => onSelect(channel.id)}
      className={`group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
        isActive ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-panel'
      }`}
    >
      <Logo channel={channel} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">{channel.name}</p>
        <p className="truncate text-xs text-slate-400">
          {channel.flag} {channel.countryName}
          {channel.categoryNames[0] ? ` · ${channel.categoryNames[0]}` : ''}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(channel.id)
        }}
        title={isFavorite ? 'Elimină din favorite' : 'Adaugă la favorite'}
        className={`shrink-0 text-lg leading-none transition-opacity ${
          isFavorite ? 'text-yellow-400' : 'text-slate-600 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </li>
  )
}

function Logo({ channel }) {
  if (channel.logo) {
    return (
      <img
        src={channel.logo}
        alt=""
        loading="lazy"
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
        className="h-9 w-9 shrink-0 rounded bg-white/5 object-contain"
      />
    )
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-edge text-sm font-semibold text-slate-300">
      {initials(channel.name)}
    </span>
  )
}

export default memo(ChannelListItem)

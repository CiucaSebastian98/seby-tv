import { formatTime, initials } from '../../utils/format.js'

/**
 * Blocul de identitate al canalului, deasupra playerului: logo mare în stânga,
 * iar în dreapta numele + programul care rulează „acum" și descrierea lui.
 *
 * @param {{ channel: object, now: object|null }} props
 */
export default function ChannelHero({ channel, now }) {
  return (
    <div className="flex gap-4">
      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-card ring-1 ring-edge md:h-32 md:w-32">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span className="font-display text-4xl text-muted">{initials(channel.name)}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-bold leading-tight md:text-3xl">
          {channel.flag} {channel.name}
        </h1>

        {now ? (
          <>
            <p className="mt-1.5 text-sm">
              <span className="font-semibold text-accent">Acum:</span> {now.title}
              {now.stop ? ` · până la ${formatTime(now.stop)}` : ''}
            </p>
            {now.desc && (
              <p className="mt-2 line-clamp-4 text-sm text-muted md:line-clamp-none">
                {now.desc}
              </p>
            )}
          </>
        ) : (
          <p className="mt-1.5 text-sm text-muted">
            Fără informații de program pentru acest canal.
          </p>
        )}
      </div>
    </div>
  )
}

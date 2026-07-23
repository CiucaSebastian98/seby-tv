/**
 * Stare goală pentru lista de canale. Mesajul e contextual (căutare, favorite,
 * istoric, categorie), fiindcă „nimic aici" nu spune utilizatorului ce să facă
 * mai departe — iar acțiunea îl scoate din fundătură cu un click.
 */
export default function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center md:px-12 lg:px-16">
      <img
        src="/no-signal-image.png"
        alt=""
        aria-hidden
        width={794}
        height={986}
        className="mb-8 h-44 w-auto select-none opacity-90 drop-shadow-[0_12px_30px_rgba(0,0,0,0.45)] md:h-56"
      />

      <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h2>

      {message && <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{message}</p>}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-7 rounded-full bg-accent px-6 py-3 font-display text-sm font-bold text-white outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-focus/60"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

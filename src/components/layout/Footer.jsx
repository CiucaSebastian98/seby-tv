/**
 * Footer: identitate + declinarea răspunderii pentru conținutul difuzat.
 * Formulare deliberat exactă — proxy-ul chiar retransmite fluxurile, deci nu
 * pretindem că „nu transmitem nimic"; ce nu deținem e conținutul în sine.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-edge px-8 py-10 md:px-12 lg:px-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex shrink-0 items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-accent font-display text-2xl font-extrabold text-white shadow-lg">
            ▶
          </span>
          <span className="font-display text-4xl font-extrabold tracking-tight">
            Seby <span className="text-accent">TV</span>
          </span>
        </div>

        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Seby TV nu produce și nu deține niciunul dintre canalele afișate. Toate
          fluxurile provin din playlist-uri publice, disponibile liber pe internet,
          și aparțin surselor originale. <strong className="font-semibold text-fg">
          Nu îmi asum nicio răspundere pentru conținutul difuzat</strong>, pentru
          disponibilitatea lui sau pentru drepturile asupra acestuia. Dacă ești
          deținătorul drepturilor unui canal și vrei să fie eliminat, scrie-mi și îl
          scot din listă.
        </p>
      </div>

      <p className="mt-8 text-xs text-muted">
        © {year} Seby TV · proiect personal, fără scop comercial
      </p>
    </footer>
  )
}

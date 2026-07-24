import { Link } from 'react-router-dom'
import { useAppActions, useAppState } from '../../context/AppContext.jsx'

/**
 * Bara de sus: wordmark (link către acasă) + comutator de temă.
 * Căutarea stă sub banner — vezi browse/SearchBox.jsx.
 */
export default function TopBar() {
  const { theme } = useAppState()
  const { setTheme } = useAppActions()

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 border-b border-edge bg-elev/85 px-8 py-4 backdrop-blur-xl md:px-12 lg:px-16"
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
    >
      <Link
        to="/"
        aria-label="Seby TV — înapoi la canale"
        className="flex shrink-0 items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-focus/60"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent font-display text-lg font-extrabold text-white shadow-lg">
          ▶
        </span>
        <h1 className="whitespace-nowrap font-display text-2xl font-extrabold tracking-tight">
          Seby <span className="text-accent">TV</span>
        </h1>
      </Link>

      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={theme === 'dark' ? 'Comută pe temă deschisă' : 'Comută pe temă închisă'}
        aria-label="Comută tema"
        className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-edge bg-elev/80 text-lg outline-none transition-colors hover:border-focus"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  )
}

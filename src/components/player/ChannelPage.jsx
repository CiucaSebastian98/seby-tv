import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useNowNext } from '../../hooks/useEpg.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useAppState } from '../../context/AppContext.jsx'
import { selectVisibleChannels } from '../../services/channelService.js'
import { formatTime } from '../../utils/format.js'
import VideoPlayer from './VideoPlayer.jsx'
import OpenInVlcButton from './OpenInVlcButton.jsx'
import EpgSchedule from './EpgSchedule.jsx'

/**
 * Pagina de canal (ruta `/:slug`): player 16:9 sus, butonul „Open in VLC" sub el
 * și programul TV complet dedesubt — o pagină cu scroll, nu player fullscreen.
 *
 * Canalul e rezolvat din slug-ul din URL. Zapping prin butoanele ‹ › din header
 * sau tastele ←/→ (fullscreen/PiP sunt în VideoPlayer, pe Enter/p).
 */
export default function ChannelPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { channels, filters } = useAppState()
  const { isFavorite, toggleFavorite } = useFavorites()

  const channel = useMemo(
    () => channels.find((c) => c.slug === slug) || null,
    [channels, slug],
  )
  const { now } = useNowNext(channel?.id)

  // Lista de zapping: aceleași filtre ca în ecranul de răsfoire, ca ordinea să
  // fie cea pe care userul tocmai o vedea. Dacă filtrele exclud canalul curent
  // (ex. a ajuns aici pe link direct), cădem pe catalogul întreg.
  const zapList = useMemo(() => {
    const visible = selectVisibleChannels(channels, filters)
    return visible.some((c) => c.slug === slug) ? visible : channels
  }, [channels, filters, slug])

  const back = () => navigate('/')

  const zapTo = (dir) => {
    if (!channel || zapList.length < 2) return
    const i = zapList.findIndex((c) => c.slug === channel.slug)
    if (i < 0) return
    const nextIdx = (i + dir + zapList.length) % zapList.length
    navigate(`/${zapList[nextIdx].slug}`)
  }

  // Comenzi telecomandă/tastatură pentru navigare (Enter/p sunt în VideoPlayer).
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches?.('input, textarea, select')) return
      if (e.key === 'Escape' || e.key === 'Backspace') back()
      else if ((e.key === 'f' || e.key === 'F') && channel) toggleFavorite(channel.id)
      else if (e.key === 'ArrowRight') { e.preventDefault(); zapTo(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); zapTo(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, zapList])

  // Slug invalid (canal inexistent) → înapoi la răsfoire.
  if (!channel) return <Navigate to="/" replace />
  const fav = isFavorite(channel.id)
  const canZap = zapList.length > 1

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Header sticky */}
      <header className="sticky top-0 z-30 border-b border-edge bg-bg/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={back}
            className="shrink-0 whitespace-nowrap rounded-full bg-card px-4 py-2 text-sm font-semibold ring-1 ring-edge transition-colors hover:bg-elev"
          >
            ← Înapoi
          </button>

          {channel.logo ? (
            <img
              src={channel.logo}
              alt=""
              referrerPolicy="no-referrer"
              className="h-8 w-8 shrink-0 rounded object-contain"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold md:text-xl">
              {channel.flag} {channel.name}
            </h1>
            {now && (
              <p className="truncate text-xs text-muted">
                <span className="text-fg/80">Acum:</span> {now.title}
                {now.stop ? ` · până la ${formatTime(now.stop)}` : ''}
              </p>
            )}
          </div>

          {canZap && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => zapTo(-1)}
                title="Canalul anterior (←)"
                aria-label="Canalul anterior"
                className="grid h-9 w-9 place-items-center rounded-full bg-card text-lg ring-1 ring-edge transition-colors hover:bg-elev"
              >
                ‹
              </button>
              <button
                onClick={() => zapTo(1)}
                title="Canalul următor (→)"
                aria-label="Canalul următor"
                className="grid h-9 w-9 place-items-center rounded-full bg-card text-lg ring-1 ring-edge transition-colors hover:bg-elev"
              >
                ›
              </button>
            </div>
          )}

          <button
            onClick={() => toggleFavorite(channel.id)}
            title={fav ? 'Scoate din favorite (f)' : 'Adaugă la favorite (f)'}
            aria-label="Favorite"
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors ${
              fav
                ? 'bg-focus text-black ring-transparent'
                : 'bg-card ring-edge hover:bg-elev'
            }`}
          >
            {fav ? '★' : '☆'}
          </button>
        </div>
      </header>

      {/* Player + VLC */}
      <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4">
        <VideoPlayer key={channel.id} channel={channel} />
        <OpenInVlcButton channel={channel} />
      </div>

      {/* Program TV */}
      <div className="mt-6">
        <EpgSchedule channelId={channel.id} />
      </div>
    </div>
  )
}

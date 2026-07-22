import BrowseView from './components/browse/BrowseView.jsx'
import PlayerView from './components/player/PlayerView.jsx'
import Spinner from './components/ui/Spinner.jsx'
import ErrorBanner from './components/ui/ErrorBanner.jsx'
import { useChannels } from './hooks/useChannels.js'
import { useEpgLoader } from './hooks/useEpg.js'
import { useTheme } from './hooks/useTheme.js'
import { useAppState } from './context/AppContext.jsx'

export default function App() {
  useChannels()
  useEpgLoader()
  useTheme() // aplică dark/light pe <html>

  const { status, error, currentChannelId } = useAppState()

  return (
    <div className="grain min-h-screen">
      {status === 'loading' && <BootScreen />}

      {status === 'error' && (
        <div className="grid min-h-screen place-items-center p-6">
          <div className="max-w-md">
            <ErrorBanner
              title="Nu am putut încărca canalele"
              message={error}
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      )}

      {status === 'ready' &&
        (currentChannelId ? <PlayerView /> : <BrowseView />)}
    </div>
  )
}

function BootScreen() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent font-display text-xl font-extrabold text-white shadow-lg">
            ▶
          </span>
          <span className="font-display text-3xl font-extrabold tracking-tight">
            Seby <span className="text-accent">TV</span>
          </span>
        </div>
        <Spinner label="Se încarcă canalele…" />
      </div>
    </div>
  )
}

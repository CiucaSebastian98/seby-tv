import ChannelList from './components/channels/ChannelList.jsx'
import VideoPlayer from './components/player/VideoPlayer.jsx'
import Spinner from './components/ui/Spinner.jsx'
import ErrorBanner from './components/ui/ErrorBanner.jsx'
import { useChannels } from './hooks/useChannels.js'
import { useEpgLoader } from './hooks/useEpg.js'
import { useAppState } from './context/AppContext.jsx'

export default function App() {
  // Efecte de bootstrap: încarcă catalogul și (opțional) EPG-ul.
  useChannels()
  useEpgLoader()

  const { status, error } = useAppState()

  return (
    <div className="flex h-screen flex-col">
      <Header />

      {status === 'loading' && (
        <div className="flex flex-1 items-center justify-center">
          <Spinner label="Se încarcă lista de canale iptv-org…" />
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md">
            <ErrorBanner
              title="Nu am putut încărca canalele"
              message={error}
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      )}

      {status === 'ready' && (
        <main className="flex min-h-0 flex-1 flex-col md:flex-row">
          <ChannelList />
          <VideoPlayer />
        </main>
      )}
    </div>
  )
}

function Header() {
  return (
    <header className="flex items-center gap-2 border-b border-edge bg-panel px-4 py-3">
      <span className="text-xl">📺</span>
      <h1 className="text-base font-semibold tracking-tight text-slate-100">
        TV Online <span className="text-slate-500">· IPTV Player</span>
      </h1>
      <span className="ml-auto text-xs text-slate-500">date: iptv-org</span>
    </header>
  )
}

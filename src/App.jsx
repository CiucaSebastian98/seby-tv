import { Route, Routes } from 'react-router-dom'
import BrowseView from './components/browse/BrowseView.jsx'
import PlayerView from './components/player/PlayerView.jsx'
import BrowseSkeleton from './components/ui/BrowseSkeleton.jsx'
import ErrorBanner from './components/ui/ErrorBanner.jsx'
import { useChannels } from './hooks/useChannels.js'
import { useEpgLoader } from './hooks/useEpg.js'
import { useTheme } from './hooks/useTheme.js'
import { useAppState } from './context/AppContext.jsx'

export default function App() {
  useChannels()
  useEpgLoader()
  useTheme() // aplică dark/light pe <html>

  const { status, error } = useAppState()

  return (
    <div className="grain min-h-screen">
      {status === 'loading' && <BrowseSkeleton />}

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

      {status === 'ready' && (
        <Routes>
          <Route path="/" element={<BrowseView />} />
          {/* /pro-tv, /antena-1 etc. — un canal per URL */}
          <Route path="/:slug" element={<PlayerView />} />
        </Routes>
      )}
    </div>
  )
}


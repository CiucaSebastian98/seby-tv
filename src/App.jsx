import { Route, Routes } from 'react-router-dom'
import BrowseView from './components/browse/BrowseView.jsx'
import ChannelPage from './components/player/ChannelPage.jsx'
import ScrollToTop from './components/layout/ScrollToTop.jsx'
import BrowseSkeleton from './components/ui/BrowseSkeleton.jsx'
import ErrorBanner from './components/ui/ErrorBanner.jsx'
import { useChannels } from './hooks/useChannels.js'
import { useEpgLoader } from './hooks/useEpg.js'
import { useTheme } from './hooks/useTheme.js'
import { useTvRemote } from './hooks/useTvRemote.js'
import { useAppState } from './context/AppContext.jsx'

export default function App() {
  useChannels()
  useEpgLoader()
  useTheme() // aplică dark/light pe <html>
  useTvRemote() // tasta Back a telecomenzii (Tizen)

  const { status, error } = useAppState()

  return (
    <div className="grain min-h-screen">
      <ScrollToTop />

      {/* Bandă solidă peste zona notch-ului (iPhone): acoperă safe-area de sus cu
          culoarea navbar-ului, ca la scroll conținutul să nu se mai vadă acolo. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 bg-elev"
        style={{ height: 'env(safe-area-inset-top)' }}
      />

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
          <Route path="/:slug" element={<ChannelPage />} />
        </Routes>
      )}
    </div>
  )
}


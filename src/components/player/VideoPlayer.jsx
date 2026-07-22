import { useRef } from 'react'
import { useHlsPlayer } from '../../hooks/useHlsPlayer.js'
import { useCurrentChannel } from '../../context/AppContext.jsx'
import PlayerOverlay from './PlayerOverlay.jsx'
import Spinner from '../ui/Spinner.jsx'
import ErrorBanner from '../ui/ErrorBanner.jsx'

/**
 * Panoul principal: elementul <video> + starea de redare + overlay-ul EPG.
 * Sursa (url) vine din canalul curent selectat în store.
 */
export default function VideoPlayer() {
  const videoRef = useRef(null)
  const channel = useCurrentChannel()
  const { state, error } = useHlsPlayer(videoRef, channel?.url || null)

  return (
    <section className="flex h-full flex-1 flex-col bg-surface">
      <div className="relative flex flex-1 items-center justify-center bg-black">
        <video
          ref={videoRef}
          controls
          playsInline
          className="h-full max-h-full w-full object-contain"
        />

        {!channel && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-slate-500">
            <p>Selectează un canal din listă pentru a începe redarea.</p>
          </div>
        )}

        {channel && state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Spinner label="Se conectează la stream…" />
          </div>
        )}

        {channel && state === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md">
              <ErrorBanner title="Stream indisponibil" message={error} />
            </div>
          </div>
        )}
      </div>

      <PlayerOverlay channel={channel} />
    </section>
  )
}

import { useEffect } from 'react'
import { fetchIptvData } from '../api/iptvClient.js'
import { buildCatalog } from '../services/channelService.js'
import { useAppActions, useAppState } from '../context/AppContext.jsx'

/**
 * La montare, descarcă datele iptv-org și populează catalogul în store.
 * Rulează o singură dată (status trece din 'idle').
 */
export function useChannels() {
  const { status } = useAppState()
  const { loadStart, loadSuccess, loadError } = useAppActions()

  useEffect(() => {
    if (status !== 'idle') return
    let cancelled = false

    loadStart()
    fetchIptvData()
      .then((data) => {
        if (cancelled) return
        loadSuccess(buildCatalog(data))
      })
      .catch((err) => {
        if (cancelled) return
        loadError(err.message || 'Eroare necunoscută la încărcarea canalelor')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

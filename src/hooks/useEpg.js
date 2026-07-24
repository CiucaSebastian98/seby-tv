import { useEffect, useMemo } from 'react'
import { fetchEpg, pickNowNext, pickNowIndex } from '../services/epgService.js'
import { EPG_URL } from '../constants.js'
import { useAppActions, useAppState } from '../context/AppContext.jsx'

/**
 * Încarcă EPG-ul o singură dată (dacă EPG_URL e configurat) și îl pune în store.
 * Fără URL nu face nimic — aplicația merge fără program TV.
 */
export function useEpgLoader() {
  const { epg } = useAppState()
  const { epgStart, epgSuccess, epgError } = useAppActions()

  useEffect(() => {
    if (!EPG_URL || epg.status !== 'idle') return
    let cancelled = false

    epgStart()
    fetchEpg(EPG_URL)
      .then((res) => !cancelled && epgSuccess(res.byChannel))
      .catch((err) => !cancelled && epgError(err.message || 'Eroare EPG'))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * Now/next pentru un canal dat, derivat din EPG-ul din store.
 * @returns {{ now: object|null, next: object|null, hasEpg: boolean }}
 */
export function useNowNext(channelId) {
  const { epg } = useAppState()
  return useMemo(() => {
    const programmes = channelId ? epg.byChannel[channelId] : null
    const { now, next } = pickNowNext(programmes)
    return { now, next, hasEpg: !!programmes && programmes.length > 0 }
  }, [epg.byChannel, channelId])
}

/**
 * Programul TV complet al unui canal (lista sortată cronologic) + indexul
 * programului curent, pentru afișarea grilei per canal.
 * @returns {{ programmes: Array, nowIndex: number, hasEpg: boolean }}
 */
export function useSchedule(channelId) {
  const { epg } = useAppState()
  return useMemo(() => {
    const programmes = (channelId && epg.byChannel[channelId]) || []
    return {
      programmes,
      nowIndex: pickNowIndex(programmes),
      hasEpg: programmes.length > 0,
    }
  }, [epg.byChannel, channelId])
}

import { createContext, useContext, useMemo, useReducer } from 'react'
import { appReducer, initialState } from './appReducer.js'
import { actions } from './actions.js'
import { selectVisibleChannels } from '../services/channelService.js'
import { getInitialTheme } from '../hooks/useTheme.js'
import { getInitialFavorites } from '../hooks/useFavorites.js'

const AppStateContext = createContext(null)
const AppDispatchContext = createContext(null)

export function AppProvider({ children }) {
  // Tema + favoritele se inițializează sincron din localStorage / <html>,
  // ca să nu existe o cursă de hidratare care le suprascrie la montare.
  const [state, dispatch] = useReducer(appReducer, initialState, (s) => ({
    ...s,
    theme: getInitialTheme(),
    favorites: getInitialFavorites(),
  }))

  // Action creators legați de dispatch, o singură dată.
  const boundActions = useMemo(() => {
    const bound = {}
    for (const [name, creator] of Object.entries(actions)) {
      bound[name] = (...args) => dispatch(creator(...args))
    }
    return bound
  }, [])

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={boundActions}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (ctx === null) throw new Error('useAppState trebuie folosit în <AppProvider>')
  return ctx
}

export function useAppActions() {
  const ctx = useContext(AppDispatchContext)
  if (ctx === null) throw new Error('useAppActions trebuie folosit în <AppProvider>')
  return ctx
}

/** Lista de canale vizibile după aplicarea filtrelor (derivată, memoizată). */
export function useVisibleChannels() {
  const { channels, filters } = useAppState()
  return useMemo(
    () => selectVisibleChannels(channels, filters),
    [channels, filters],
  )
}

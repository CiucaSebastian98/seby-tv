import { ActionTypes } from './actions.js'

export const initialState = {
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'error'
  error: null,
  channels: [], // catalog fuzionat (channelService.buildCatalog)
  countries: [], // opțiuni filtru
  categories: [], // opțiuni filtru
  filters: { search: '', country: '', category: '' }, // toate canalele din playlist (limba ro)
  favorites: [], // id-uri canale (persistate în localStorage)
  epg: { status: 'idle', byChannel: {}, error: null },
  theme: 'light', // fixat pe light (fără toggle)
}

export function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.LOAD_START:
      return { ...state, status: 'loading', error: null }

    case ActionTypes.LOAD_SUCCESS:
      return {
        ...state,
        status: 'ready',
        channels: action.payload.channels,
        countries: action.payload.countries,
        categories: action.payload.categories,
      }

    case ActionTypes.LOAD_ERROR:
      return { ...state, status: 'error', error: action.error }

    case ActionTypes.SET_FILTER:
      return {
        ...state,
        filters: { ...state.filters, [action.key]: action.value },
      }

    case ActionTypes.RESET_FILTERS:
      return { ...state, filters: initialState.filters }

    case ActionTypes.TOGGLE_FAVORITE: {
      const has = state.favorites.includes(action.id)
      const favorites = has
        ? state.favorites.filter((id) => id !== action.id)
        : [...state.favorites, action.id]
      return { ...state, favorites }
    }

    case ActionTypes.SET_FAVORITES:
      return { ...state, favorites: action.ids }

    case ActionTypes.EPG_START:
      return { ...state, epg: { ...state.epg, status: 'loading', error: null } }

    case ActionTypes.EPG_SUCCESS:
      return {
        ...state,
        epg: { status: 'ready', byChannel: action.byChannel, error: null },
      }

    case ActionTypes.EPG_ERROR:
      return {
        ...state,
        epg: { ...state.epg, status: 'error', error: action.error },
      }

    case ActionTypes.SET_THEME:
      return { ...state, theme: action.theme }

    default:
      return state
  }
}

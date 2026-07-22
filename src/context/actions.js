export const ActionTypes = {
  LOAD_START: 'LOAD_START',
  LOAD_SUCCESS: 'LOAD_SUCCESS',
  LOAD_ERROR: 'LOAD_ERROR',
  SET_FILTER: 'SET_FILTER',
  RESET_FILTERS: 'RESET_FILTERS',
  SET_CURRENT_CHANNEL: 'SET_CURRENT_CHANNEL',
  TOGGLE_FAVORITE: 'TOGGLE_FAVORITE',
  SET_FAVORITES: 'SET_FAVORITES',
  EPG_START: 'EPG_START',
  EPG_SUCCESS: 'EPG_SUCCESS',
  EPG_ERROR: 'EPG_ERROR',
  SET_THEME: 'SET_THEME',
}

export const actions = {
  loadStart: () => ({ type: ActionTypes.LOAD_START }),
  loadSuccess: (payload) => ({ type: ActionTypes.LOAD_SUCCESS, payload }),
  loadError: (error) => ({ type: ActionTypes.LOAD_ERROR, error }),
  setFilter: (key, value) => ({ type: ActionTypes.SET_FILTER, key, value }),
  resetFilters: () => ({ type: ActionTypes.RESET_FILTERS }),
  setCurrentChannel: (id) => ({ type: ActionTypes.SET_CURRENT_CHANNEL, id }),
  toggleFavorite: (id) => ({ type: ActionTypes.TOGGLE_FAVORITE, id }),
  setFavorites: (ids) => ({ type: ActionTypes.SET_FAVORITES, ids }),
  epgStart: () => ({ type: ActionTypes.EPG_START }),
  epgSuccess: (byChannel) => ({ type: ActionTypes.EPG_SUCCESS, byChannel }),
  epgError: (error) => ({ type: ActionTypes.EPG_ERROR, error }),
  setTheme: (theme) => ({ type: ActionTypes.SET_THEME, theme }),
}

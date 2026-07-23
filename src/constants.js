// Playlist-ul M3U (sursă principală de date). Doar canale în limba română.
export const IPTV_PLAYLIST = 'https://iptv-org.github.io/iptv/languages/ron.m3u'

// API-ul JSON iptv-org — folosit doar pentru countries.json (nume + steag).
export const IPTV_API = 'https://iptv-org.github.io/api'

// Sursa EPG (XMLTV) — configurabilă din .env. Goală => fără program TV.
export const EPG_URL = import.meta.env.VITE_EPG_URL || ''

// Baza proxy-ului ffmpeg (server/). Goală => canalele TS brute rămân neredabile.
// Ex: https://stream.domeniul-tau.ro
export const STREAM_PROXY = (import.meta.env.VITE_STREAM_PROXY || '').replace(/\/$/, '')

// Token cerut de proxy. Trebuie să fie identic cu AUTH_TOKEN din server/.env.
// Notă: e un secret „de client" — vizibil în bundle. Îl folosim ca să nu lăsăm
// proxy-ul complet deschis, nu ca autentificare reală de utilizator.
export const STREAM_TOKEN = import.meta.env.VITE_STREAM_TOKEN || 'parola123'

// Câte canale randăm inițial în listă (protejează UI-ul de mii de itemi).
export const CHANNEL_PAGE_SIZE = 200

// Debounce pentru câmpul de căutare (ms).
export const SEARCH_DEBOUNCE_MS = 200

export const LS_FAVORITES_KEY = 'tv-online:favorites'
export const LS_THEME_KEY = 'seby-tv:theme'

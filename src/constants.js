// Endpoint-urile publice iptv-org (fișiere JSON statice, servite cu CORS).
export const IPTV_API = 'https://iptv-org.github.io/api'

// Sursa EPG (XMLTV) — configurabilă din .env. Goală => fără program TV.
export const EPG_URL = import.meta.env.VITE_EPG_URL || ''

// Câte canale randăm inițial în listă (protejează UI-ul de mii de itemi).
export const CHANNEL_PAGE_SIZE = 200

// Debounce pentru câmpul de căutare (ms).
export const SEARCH_DEBOUNCE_MS = 200

export const LS_FAVORITES_KEY = 'tv-online:favorites'

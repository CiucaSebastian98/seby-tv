// Playlist-ul M3U (sursă principală de date). Doar canale în limba română.
export const IPTV_PLAYLIST = 'https://iptv-org.github.io/iptv/languages/ron.m3u'

// API-ul JSON iptv-org — folosit doar pentru countries.json (nume + steag).
export const IPTV_API = 'https://iptv-org.github.io/api'

// (EPG_URL e definit mai jos — depinde de STREAM_PROXY.)

// Baza proxy-ului ffmpeg (server/). Goală => canalele TS brute rămân neredabile.
// Ex: https://stream.domeniul-tau.ro
const RAW_PROXY = (import.meta.env.VITE_STREAM_PROXY || '').trim().replace(/\/+$/, '')

// Fără schemă, `${STREAM_PROXY}/stream/…` devine o cale RELATIVĂ, iar cererile
// pleacă spre propriul domeniu (care răspunde cu index.html, deci player-ul
// așteaptă la infinit). Completăm https:// dacă lipsește.
export const STREAM_PROXY =
  RAW_PROXY && !/^https?:\/\//i.test(RAW_PROXY) ? `https://${RAW_PROXY}` : RAW_PROXY

// Token cerut de proxy. Trebuie să fie identic cu AUTH_TOKEN din server/.env.
// Notă: e un secret „de client" — vizibil în bundle. Îl folosim ca să nu lăsăm
// proxy-ul complet deschis, nu ca autentificare reală de utilizator.
export const STREAM_TOKEN = import.meta.env.VITE_STREAM_TOKEN || 'parola123'

/**
 * Sursa EPG. Implicit `/epg` de pe proxy, care descarcă XMLTV-ul, îl potrivește
 * cu playlist-ul și îl reduce la ~400 KB de JSON. Sursa brută (54 MB) nu poate
 * fi luată direct din browser: nu trimite CORS și ar bloca firul principal.
 *
 * `VITE_EPG_URL` suprascrie, dacă vrei altă sursă XMLTV.
 */
export const EPG_URL =
  import.meta.env.VITE_EPG_URL ||
  (STREAM_PROXY ? `${STREAM_PROXY}/epg?token=${STREAM_TOKEN}` : '')

// Câte canale randăm inițial în listă (protejează UI-ul de mii de itemi).
export const CHANNEL_PAGE_SIZE = 200

// Debounce pentru câmpul de căutare (ms).
export const SEARCH_DEBOUNCE_MS = 200

export const LS_FAVORITES_KEY = 'tv-online:favorites'
export const LS_THEME_KEY = 'seby-tv:theme'
export const LS_PLAYER_PREFS_KEY = 'seby-tv:player'
export const LS_RECENT_KEY = 'seby-tv:recent'

// Câte canale ținem în „ultimele vizionate".
export const RECENT_MAX = 12

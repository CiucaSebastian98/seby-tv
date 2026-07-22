# IPTV Web Player — Design Spec

**Date:** 2026-07-22
**Status:** Approved

## Scop

Player IPTV web personal (React + Vite) care consumă datele statice iptv-org
(`https://iptv-org.github.io/api/`) și redă stream-uri HLS în browser, cu
căutare, filtrare (țară/categorie), favorite persistente și EPG (now/next).

## Decizii tehnice

- **Build:** Vite + React 18
- **Styling:** Tailwind CSS
- **State global:** Context API + `useReducer` (un singur store)
- **Player:** `hls.js`, cu fallback la HLS nativ (Safari)
- **EPG:** varianta A — arhitectură completă (parser XMLTV + hook + UI now/next),
  sursă configurabilă prin `VITE_EPG_URL`. Fără URL → degradare elegantă.

## Sursa de date (iptv-org)

Nu există API dinamic; sunt fișiere JSON statice servite cu CORS:
- `channels.json` — catalog canale (`id`, `name`, `country`, `categories[]`, `logo`)
- `streams.json` — stream-uri (`channel`, `url`, `quality`, `referrer`, `user_agent`)
- `categories.json`, `countries.json` (cod → nume + flag emoji)

`channelService` fuzionează channels + streams după `channel id` și păstrează doar
canalele care au cel puțin un stream (deci redabile). EPG-ul vine separat, din
XMLTV (repo `iptv-org/epg` sau o sursă publică).

## Structură foldere

```
src/
├─ main.jsx, App.jsx, index.css, constants.js
├─ api/       → endpoints.js, iptvClient.js
├─ services/  → channelService.js, epgService.js
├─ context/   → actions.js, appReducer.js, AppContext.jsx
├─ hooks/     → useChannels, useFavorites, useHlsPlayer, useEpg
├─ components/
│  ├─ player/   → VideoPlayer, PlayerOverlay
│  ├─ channels/ → ChannelList, ChannelListItem, ChannelSearch, ChannelFilters
│  └─ ui/       → Spinner, ErrorBanner
└─ utils/format.js
```

## State global (reducer)

`status` · `error` · `channels[]` · `filters {search, country, category}` ·
`currentChannelId` · `favorites[]` (persistat localStorage) ·
`epg {byChannel, status}`

Lista filtrată e derivată (`useMemo` selector), NU stocată în reducer.

## Flux de date

1. Mount → `useChannels` ia channels+streams+categories+countries → `channelService.merge` → `SET_CHANNELS`.
2. Search/filtre → `SET_FILTER` → selector `useMemo` produce lista vizibilă.
3. Click canal → `SET_CURRENT_CHANNEL` → `VideoPlayer` ia primul stream → `useHlsPlayer` atașează hls.js.
4. La schimbarea canalului → `useEpg` expune now/next din `epg.byChannel[id]`.

## Player HLS

`useHlsPlayer(videoRef, url)`: dacă `Hls.isSupported()` → `new Hls()`, `loadSource`,
`attachMedia`; altfel dacă `video.canPlayType('application/vnd.apple.mpegurl')` →
`video.src = url`. Gestionare erori: la `NETWORK_ERROR` → `startLoad()`, la
`MEDIA_ERROR` → `recoverMediaError()`, altfel `destroy()` + expune eroare.

## Constrângeri cunoscute

- Multe stream-uri eșuează în browser (CORS / mixed-content http-pe-https). Nu e
  bug al aplicației → `ErrorBanner` explicit; opțional proxy dev în `vite.config.js`.
- EPG fără `VITE_EPG_URL` → UI arată „fără program".

## Testare (manuală, MVP)

`npm run dev` → lista se încarcă, search/filtre funcționează, click pe canal cu
stream valid redă, favorite persistă după refresh.

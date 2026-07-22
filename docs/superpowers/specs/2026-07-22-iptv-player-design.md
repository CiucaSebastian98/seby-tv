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

Sursa principală e **playlist-ul M3U** `https://iptv-org.github.io/iptv/languages/ron.m3u`
(canale în limba română, ~145), care conține deja canal + URL + logo + categorie
într-o singură intrare `#EXTINF` — deci nu mai e nevoie de fuzionare channels+streams.
(Se poate schimba cu orice alt playlist iptv-org din `IPTV_PLAYLIST`.)

Format intrare: `#EXTINF:-1 tvg-id="Name.cc@FEED" tvg-logo="..." group-title="Categorie",Nume`
apoi URL-ul pe linia următoare (posibil precedat de `#EXTVLCOPT`, ignorat).
- **Țara** se extrage din `tvg-id` (`.cc@` → cod ISO)
- **Categoria** = `group-title` (text lizibil)

`m3uParser` parsează playlist-ul; `channelService.buildCatalog` îl transformă în
catalog. Adițional se ia `countries.json` (fișier mic, best-effort) doar pentru
mapare cod țară → nume + steag. EPG-ul vine separat, din XMLTV
(repo `iptv-org/epg` sau o sursă publică).

## Structură foldere

```
src/
├─ main.jsx, App.jsx, index.css, constants.js
├─ api/       → endpoints.js, iptvClient.js
├─ services/  → m3uParser.js, channelService.js, epgService.js
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

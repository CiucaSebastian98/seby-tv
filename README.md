# TV Online — IPTV Web Player

Player IPTV web personal (React + Vite) care consumă datele publice
[iptv-org](https://github.com/iptv-org/iptv) și redă stream-uri HLS în browser.

## Funcționalități

- 🎬 Interfață stil **Netflix, TV-friendly** — hero/spotlight + rânduri orizontale pe categorii
- 🕹️ **Navigare cu telecomanda / tastatura**: săgeți, `Enter` redă, `f` favorite, `/` caută, `Esc` înapoi
- 📺 Canale românești din playlist-ul M3U `iptv-org/languages/ron.m3u` (~145 canale)
- 🔎 Căutare după nume + filtrare pe categorie (chips) / țară
- ⭐ Favorite persistente (localStorage), afișate ca rând propriu în capul listei
- ▶️ Player HLS pe tot ecranul (`hls.js`) cu fallback nativ pe Safari + recovery pe erori
- 🗓️ EPG now/next în hero și în player (opțional, din sursă XMLTV configurabilă)

## Pornire

```bash
npm install
npm run dev
```

Aplicația pornește pe `http://localhost:5173`.

## Configurare EPG (opțional)

iptv-org **nu** oferă EPG prin API-ul JSON. Programul TV vine din XMLTV
(vezi repo-ul [`iptv-org/epg`](https://github.com/iptv-org/epg)). Copiază
`.env.example` în `.env` și pune un URL XMLTV:

```
VITE_EPG_URL=https://exemplu.tld/guide.xml
```

Fără această variabilă aplicația funcționează normal, doar fără program TV.

## Arhitectură

```
src/
├─ api/        # fetch + cache (playlist M3U + countries.json)
├─ services/   # m3uParser, channelService (catalog/grupare/filtre), epgService (XMLTV)
├─ context/    # store global: Context API + useReducer
├─ hooks/      # useChannels, useFavorites, useHlsPlayer, useEpg, useGridNavigation
├─ components/
│  ├─ layout/  # TopBar (logo + search + țară)
│  ├─ browse/  # BrowseView, Hero, ChipsBar, CategoryRow, ChannelCard
│  ├─ player/  # PlayerView (fullscreen)
│  └─ ui/      # Spinner, ErrorBanner
└─ utils/
```

Detalii de design: `docs/superpowers/specs/2026-07-22-iptv-player-design.md`.

## Limitări cunoscute

Multe stream-uri iptv-org **nu vor rula în browser** din cauza CORS,
mixed-content (http pe https), geo-blocking sau token-uri expirate. Nu e un bug
al aplicației — se afișează un mesaj clar și poți încerca alt canal. Pentru
câteva surse ajută un proxy dev (vezi `vite.config.js`).

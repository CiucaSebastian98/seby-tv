# TV Online — IPTV Web Player

Player IPTV web personal (React + Vite) care consumă datele publice
[iptv-org](https://github.com/iptv-org/iptv) și redă stream-uri HLS în browser.

## Funcționalități

- 📺 Catalog de canale din `iptv-org` (channels + streams fuzionate)
- 🔎 Căutare după nume + filtrare pe țară / categorie
- ⭐ Favorite persistente (localStorage)
- ▶️ Player HLS (`hls.js`) cu fallback nativ pe Safari + recovery pe erori
- 🗓️ EPG now/next (opțional, din sursă XMLTV configurabilă)

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
├─ api/        # fetch + cache pentru endpoint-urile iptv-org
├─ services/   # channelService (merge+filtre), epgService (parse XMLTV)
├─ context/    # store global: Context API + useReducer
├─ hooks/      # useChannels, useFavorites, useHlsPlayer, useEpg
├─ components/ # player/, channels/, ui/
└─ utils/
```

Detalii de design: `docs/superpowers/specs/2026-07-22-iptv-player-design.md`.

## Limitări cunoscute

Multe stream-uri iptv-org **nu vor rula în browser** din cauza CORS,
mixed-content (http pe https), geo-blocking sau token-uri expirate. Nu e un bug
al aplicației — se afișează un mesaj clar și poți încerca alt canal. Pentru
câteva surse ajută un proxy dev (vezi `vite.config.js`).

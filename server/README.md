# Seby TV — proxy ffmpeg (TS → HLS)

Serviciu Node care remuxează **on-demand** fluxurile MPEG-TS brute (ex. Digi Sport,
`http://IP:port`) în **HLS**, ca să poată fi redate în browser. Pornește `ffmpeg -c copy`
doar când un canal e cerut și îl oprește după inactivitate.

- **Remux** (fără re-encodare) → CPU minim; merge pentru surse H.264/AAC (majoritatea).
- **Allowlist**: proxy-ul servește doar URL-uri care există în playlist (fără SSRF).
- **CORS** activat; segmentele HLS sunt efemere (în `/tmp`).
- **Rate limiting**: max 20 sesiuni ffmpeg simultane (configurabil via `MAX_SESSIONS`).
- **Graceful shutdown**: oprește toate sesiunile curat la SIGINT/SIGTERM.

## Rulare locală (dev)

```bash
cd server
npm install
npm start
# → http://localhost:8080
```

Necesită **ffmpeg** instalat:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

## Rulare pe VPS (Docker)

```bash
cd server
docker compose up -d --build
# verificare:
curl http://localhost:8080/health
```

Pune-l în spatele unui reverse-proxy (Caddy/Nginx) cu **HTTPS** — dacă frontend-ul e pe
`https`, proxy-ul TREBUIE să fie tot pe `https` (altfel mixed-content). Exemplu Caddy:

```
stream.domeniul-tau.ro {
    reverse_proxy localhost:8080
}
```

## Cum îl leagă frontend-ul

În `tv-online/.env` setează baza proxy-ului:

```
VITE_STREAM_PROXY=https://stream.domeniul-tau.ro
```

Frontend-ul rescrie automat DOAR canalele non-HLS (TS) către
`${VITE_STREAM_PROXY}/stream/<key>/index.m3u8`. `<key>` e un hash al URL-ului sursă,
calculat identic pe ambele părți (`keyFor`). Fără variabilă, canalele TS rămân
neredabile (mesaj clar în player).

## Endpoint-uri API

| Endpoint | Metodă | Descriere |
|---|---|---|
| `/health` | GET | Stare server: canale, sesiuni, uptime |
| `/stats` | GET | Detalii sesiuni (idle time, alive), memorie |
| `/channels` | GET | Lista completă de canale din playlist (key + URL) |
| `/stream/:key/index.m3u8` | GET | Pornește ffmpeg (dacă nu rulează) și servește playlist HLS |
| `/stream/:key/:file` | GET | Servește segmentele `.ts` |
| `/stream/:key/stop` | POST | Oprește manual o sesiune ffmpeg |

## Variabile de mediu

| Variabilă | Default | Rol |
|---|---|---|
| `PORT` | 8080 | portul HTTP |
| `PLAYLIST_URL` | `…/languages/ron.m3u` | playlist-ul sursă (allowlist) |
| `IDLE_MS` | 30000 | oprește ffmpeg după atâta inactivitate (ms) |
| `START_TIMEOUT_MS` | 15000 | cât așteaptă primul segment înainte de 504 (ms) |
| `PLAYLIST_REFRESH_MS` | 21600000 | interval reîncărcare playlist (6h implicit) |
| `MAX_SESSIONS` | 20 | număr maxim de sesiuni ffmpeg simultane |

## Securitate

- **Allowlist**: proxy-ul accesează doar URL-uri din playlist-ul M3U (previne SSRF)
- **Key validation**: doar caractere alfanumerice, max 20 caractere
- **Path traversal**: fișierele servite sunt restricționate la directorul sesiunii
- **Extensii permise**: doar `.ts` și `.m3u8`
- **Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`

## Limitări

- Doar **remux**: dacă o sursă e H.265/MPEG-2/AC3, browserul tot n-o poate reda.
  Pentru astea ar trebui **transcodare** (`-c:v libx264 -c:a aac`) — CPU mult mai mare.
- Un canal viu = un proces ffmpeg cât timp cineva îl vizionează.
- Max `MAX_SESSIONS` canale simultane (la limită, cea mai veche sesiune inactivă e oprită).

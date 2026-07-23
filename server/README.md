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

## Rulare pe VPS (Docker + Caddy)

Stiva pornește două containere: `proxy` (Node + ffmpeg, vizibil doar intern) și
`caddy` (HTTPS automat via Let's Encrypt, publicat pe 80/443).

**1. DNS întâi.** Un record A (și AAAA dacă ai IPv6) pentru `STREAM_DOMAIN` către
IP-ul VPS-ului. Caddy cere certificatul la primul boot; fără DNS propagat,
validarea ACME eșuează și rămâi fără HTTPS.

**2. Configurare:**

```bash
cd server
cp .env.example .env
# completează STREAM_DOMAIN și generează token-ul:
openssl rand -hex 24
```

**3. Firewall** — porturile 80 și 443 deschise; 8080 NU trebuie expus public
(compose îl ține în rețeaua internă Docker).

**4. Pornire:**

```bash
docker compose up -d --build      # prima dată compilează Caddy cu plugin-ul rate_limit
docker compose logs -f caddy      # urmărește obținerea certificatului
curl https://STREAM_DOMAIN/health
```

Imaginea Caddy se construiește din `Caddy.Dockerfile`, fiindcă directiva
`rate_limit` e un modul extern — imaginea oficială `caddy:2` ar refuza să
pornească cu acest Caddyfile.

## Cum îl leagă frontend-ul

Setează pe Vercel (Settings → Environment Variables) sau în `tv-online/.env`:

```
VITE_STREAM_PROXY=https://stream.domeniul-tau.ro
VITE_STREAM_TOKEN=<exact AUTH_TOKEN din server/.env>
```

Variabilele `VITE_*` sunt inserate **la build**, deci după ce le schimbi trebuie
redeploy — nu e destul să repornești. Dacă token-ul diferă de `AUTH_TOKEN`,
proxy-ul răspunde `401` la fiecare canal.

Frontend-ul rutează automat: HLS/DASH și `rtmp/udp/rtsp` către
`${VITE_STREAM_PROXY}/stream/<key>/index.m3u8` (ffmpeg), iar TS-ul brut pe
`http(s)://IP:PORT` către `${VITE_STREAM_PROXY}/direct-stream/<key>`
(pass-through). `<key>` e un hash al URL-ului sursă, calculat identic pe ambele
părți (`keyFor`). Fără `VITE_STREAM_PROXY`, canalele care au nevoie de proxy
rămân neredabile, cu mesaj explicit în player.

## Trafic

Un canal HD consumă ~1 MB/s, adică **~3,7 GB pe oră de vizionare**. Verifică
limita de trafic a VPS-ului înainte — și evită tunelurile cu cotă lunară mică
(ngrok free = 1 GB/lună ≈ 16 minute de TV).

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
| `AUTH_TOKEN` | `parola123` | token cerut pe rutele care consumă bandă (= `VITE_STREAM_TOKEN`) |
| `MAX_DIRECT` | 30 | număr maxim de pass-through-uri MPEG-TS simultane |
| `UPSTREAM_TIMEOUT_MS` | 15000 | inactivitate acceptată pe socket-ul sursei (ms) |
| `RELOAD_COOLDOWN_MS` | 60000 | cooldown la reîncărcarea playlist-ului pe cheie necunoscută |

## Rutarea fluxurilor

Frontend-ul trimite **toate** sursele pe `/stream/:key/index.m3u8` (ffmpeg).

Motivul e codecul audio, nu transportul: sursele DVB românești (Digi Sport &co.)
livrează **MPEG-1 Audio Layer II (mp2)**, pe care niciun browser nu îl poate
decoda în MSE. Simptomul e înșelător — mpegts.js demuxează corect, raportează
`AudioSpecificConfig for mimeType: mp3`, dar redarea rămâne blocată la
`currentTime 0`, fiindcă nu se produce niciodată audio decodat.

De aceea ffmpeg rulează `-c:v copy -c:a aac`: video-ul trece neatins (fără cost),
iar audio-ul se transcodează (~1-2% dintr-un core).

`/direct-stream/:key` (pass-through, 0% CPU) rămâne implementat și funcțional,
dar nu e folosit implicit — e util doar pentru surse despre care știi sigur că
au audio AAC.

## Securitate

- **Token**: obligatoriu pe `/direct-stream`, `*.m3u8`, `/channels`, `/stats`.
  Segmentele `.ts` fac excepție (hls.js le cere pe URL-uri relative, fără query);
  ele există doar cât timp rulează o sesiune pornită cu token.
- **Allowlist**: proxy-ul accesează doar URL-uri din playlist-ul M3U (previne SSRF).
  Redirect-urile sunt urmărite (max 5), dar tot spre destinații HTTP(S).
- **Key validation**: hash base36 pe două benzi (`abc-def`), max 20 caractere/bandă
- **Path traversal**: fișierele servite sunt restricționate la directorul sesiunii
- **Extensii permise**: doar `.ts` și `.m3u8`
- **Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`

## Limitări

- Doar **remux**: dacă o sursă e H.265/MPEG-2/AC3, browserul tot n-o poate reda.
  Pentru astea ar trebui **transcodare** (`-c:v libx264 -c:a aac`) — CPU mult mai mare.
- Un canal viu = un proces ffmpeg cât timp cineva îl vizionează.
- Max `MAX_SESSIONS` canale simultane (la limită, cea mai veche sesiune inactivă e oprită).
- Max `MAX_DIRECT` pass-through-uri simultane (la limită se răspunde `503`).
- Fluxurile MPEG-TS brute au nevoie de MSE — nu merg pe iOS (Safari nu îl expune).

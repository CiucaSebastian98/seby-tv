# Pagină dedicată per canal: player + EPG + „Open in VLC"

**Data:** 2026-07-24
**Status:** Aprobat pentru implementare

## Context

Astăzi ruta `/:slug` (`src/components/player/PlayerView.jsx`, 354 linii) redă canalul pe
**tot ecranul**, imersiv, cu overlay auto-hide, zapping prin swipe și doar now/next din EPG.

Se dorește, la click pe un canal, o **pagină de detaliu cu scroll** care conține:
1. un player video 16:9 (pornit automat) pentru a porni postul;
2. sub player, un buton **Open in VLC** care deschide acel canal în VLC;
3. mai jos, **programul TV (EPG) complet**.

EPG-ul complet e deja disponibil client-side în store (`epg.byChannel[channelId]` —
listă de `{ start, stop, title, desc }` sortată cronologic, ~30h de program). URL-ul
original al sursei e deja salvat pe fiecare canal (`channel.sourceUrl`).

## Obiective

- Pagină de canal cu scroll: header → player 16:9 → buton VLC → program TV.
- „Open in VLC" descarcă un fișier `.m3u` cu **URL-ul original ip:port**, pe care VLC îl
  redă nativ la calitate plină (fără transcodarea serverului).
- Afișarea programului TV complet, cu evidențierea programului curent.
- Refactorizarea `PlayerView.jsx` (prea mare) în componente cu rol unic.
- Fără regresii pe funcțiile existente ale playerului (favorite, unmute, no-signal etc.).

## Non-obiective (YAGNI)

- Nu construim un ghid EPG grilă multi-canal (rămâne per-canal).
- Nu adăugăm protocol `vlc://` / intent Android (nesigur; s-a ales `.m3u`).
- Nu schimbăm pipeline-ul de streaming din server (ffmpeg/proxy rămân neatinse).
- Fără redesign al ecranului de browse.

## Arhitectură & componente

Ruta `/:slug` rămâne, dar componenta devine o pagină cu scroll (nu `fixed inset-0`).
`PlayerView.jsx` se sparge în:

| Fișier | Rol | Depinde de |
|---|---|---|
| `components/player/ChannelPage.jsx` | Ruta `/:slug`. Layout cu scroll, compune celelalte componente, ține logica de canal/zapping/tastatură. | `VideoPlayer`, `OpenInVlcButton`, `EpgSchedule`, hooks existente |
| `components/player/VideoPlayer.jsx` | Video 16:9 + overlay-uri (loading, eroare, unmute) + butoane fullscreen/PiP. | `useHlsPlayer`, `usePlayerPrefs` |
| `components/player/OpenInVlcButton.jsx` | Buton „Open in VLC" + link secundar „copiază URL". | `services/vlcPlaylist.js` |
| `components/player/EpgSchedule.jsx` | Programul TV complet, cu evidențierea „ACUM" și separatoare de zi. | `useSchedule` |
| `services/vlcPlaylist.js` | Pur: `buildM3u(channel)`, `downloadM3u(channel)`. | — |

`App.jsx` schimbă doar importul: `PlayerView` → `ChannelPage` pe ruta `/:slug`.
Fișierul `PlayerView.jsx` se elimină după migrare.

### Layout (schiță)

```
┌───────────────────────────────┐
│ ← Înapoi   [logo] Digi Sport 1   ‹ ›  ★ │   header sticky
├───────────────────────────────┤
│         VIDEO 16:9 (autoplay)          │   VideoPlayer
│         [⛶ fullscreen] [⧉ PiP]         │
├───────────────────────────────┤
│   [ ▶ Open in VLC ]   sau copiază URL   │   OpenInVlcButton
├───────────────────────────────┤
│  Program TV                             │   EpgSchedule
│  ── Joi, 24 iul ──                      │
│  20:00–22:00  ● ACUM  Meci ...          │
│  22:00–23:30          Emisiune ...      │
│  ── Vineri, 25 iul ──         ↓ scroll  │
└───────────────────────────────┘
```

## „Open in VLC" — `services/vlcPlaylist.js`

### `buildM3u(channel): string`

Construiește conținutul `.m3u` din `channel.sourceUrl`, `channel.name` și, dacă există,
`channel.userAgent`:

```
#EXTM3U
#EXTINF:-1,Digi Sport 1
#EXTVLCOPT:http-user-agent=VLC/3.0.18
http://185.x.x.x:8080/play/a01x
```

- Linia `#EXTVLCOPT:http-user-agent=...` apare **doar** dacă `channel.userAgent` e setat.
- Numele din `#EXTINF` are newline-urile eliminate (o singură linie validă M3U).
- Dacă `sourceUrl` lipsește, funcția întoarce `null` (butonul se ascunde).

### `downloadM3u(channel): void`

Creează un `Blob([m3u], { type: 'audio/x-mpegurl' })`, un `URL.createObjectURL`, un
`<a download="${slug}.m3u">` sintetic pe care îl click-uiește, apoi revocă URL-ul.
MIME-ul `audio/x-mpegurl` e cel clasic asociat cu VLC.

### Captarea user-agent-ului (parser + catalog)

- `services/m3uParser.js`: pe lângă atributele existente, captează user-agent-ul din
  două locuri (ultimul câștigă):
  - atributul din `#EXTINF`: `http-user-agent="..."`;
  - directiva separată `#EXTVLCOPT:http-user-agent=...` (linie proprie, între EXTINF și URL).
  Se adaugă `userAgent` (string sau `''`) pe fiecare intrare.
- `services/channelService.js`: propagă `userAgent` pe obiectul canal (lângă `sourceUrl`).

### Fallback „copiază URL"

Sub buton, un link discret care copiază `channel.sourceUrl` în clipboard
(`navigator.clipboard.writeText`), cu feedback „Copiat!". Acoperă cazurile mobile unde
`.m3u` nu se auto-deschide în VLC.

## Program TV — `EpgSchedule.jsx` + `useSchedule`

### `useSchedule(channelId)` (în `src/hooks/useEpg.js`)

Întoarce `{ programmes, nowIndex, hasEpg }`:
- `programmes`: `epg.byChannel[channelId]` (sau `[]`);
- `nowIndex`: indexul programului curent (același criteriu ca `pickNowNext`: `start <= now`
  și `now < (stop || next.start)`), sau `-1`;
- `hasEpg`: `programmes.length > 0`.

Memoizat pe `[epg.byChannel, channelId]`.

### Randare

- Titlu secțiune „Program TV".
- Rânduri: `HH:MM–HH:MM · titlu`, cu `desc` trunchiată (clamp ~2 rânduri) dacă există.
- Separator de zi (ex. „Joi, 24 iul") când data se schimbă față de rândul anterior.
- Programul curent (`index === nowIndex`): fundal accent + badge „● ACUM".
- Programele trecute (start < acum și nu e cel curent): estompate (opacitate redusă).
- Fără EPG (`!hasEpg`): mesaj „Program indisponibil pentru acest canal".

Formatarea orei folosește `utils/format.js` (`formatTime`), deja existent.

## VideoPlayer.jsx

Extrage din `PlayerView` actual toată logica de redare, într-un container `aspect-video`
(nu fullscreen fix):
- `<video>` cu `useHlsPlayer(videoRef, channel.url, channel.type, channel.reason, channel.proxyUrl)`;
- overlay loading (spinner), overlay eroare (`ErrorBanner` + fundal GIF + sunet no-signal),
  buton „Apasă pentru sunet" la `isMutedByPolicy`;
- butoane fullscreen și PiP (pe container/player);
- `usePlayerPrefs` pentru persistența volumului;
- `markWatched` la trecerea în `state === 'playing'`.

Primește `channel` ca prop; nu știe de rutare/zapping (acelea stau în `ChannelPage`).

## ChannelPage.jsx (ruta `/:slug`)

- Rezolvă canalul din slug (ca acum); slug invalid → `<Navigate to="/" replace />`.
- Header sticky: back, logo+nume canal, prev/next canal, favorite.
- Compune `VideoPlayer`, `OpenInVlcButton`, `EpgSchedule`.
- Zapping prin butoane prev/next + taste `←/→` (folosește `zapList` din filtrele curente,
  ca acum). **Swipe orizontal eliminat** (conflict cu scroll vertical).
- Taste: `Esc/Backspace` = înapoi, `f` = favorite, `←/→` = canal ant./urm.,
  `Enter` = fullscreen, `p` = PiP. Nu fură tastele din câmpuri.
- **Overlay auto-hide eliminat** — pe o pagină cu scroll controalele rămân vizibile.

## Ce se păstrează / se scoate

**Păstrat:** autoplay, unmute-la-click, sunet no-signal la eroare, favorite, prev/next
canal (butoane), scurtături tastatură, PiP, persistență volum, `markWatched`.

**Scos:** swipe orizontal de zapping; overlay-ul auto-hide al controalelor.

## Testare

Proiectul nu are runner de test instalat (fără vitest/jest). Funcțiile pure fiind JS
importabil, se testează cu **scripturi node standalone** (`node --input-type=module`), care
verifică inputurile de mai jos și eșuează zgomotos la regresie. TDD pe:
- `buildM3u()`: cu user-agent, fără user-agent, nume cu newline/virgulă, `sourceUrl` lipsă → `null`.
- Parser: captează `http-user-agent` din atribut EXTINF și din `#EXTVLCOPT`.
- `useSchedule`/helper „now": index corect pentru program curent, `-1` fără EPG.

Verificare manuală (desktop + mobil):
- pagina se încarcă, playerul pornește (sau cere unmute pe mobil);
- „Open in VLC" descarcă `{slug}.m3u`; deschis în VLC redă sursa;
- „copiază URL" pune sursa în clipboard;
- programul TV se afișează cu ziua și „ACUM" corect; fără EPG apare mesajul.

## Riscuri & note

- **Auto-deschidere `.m3u` pe mobil:** pe Android/iOS descărcarea `.m3u` poate necesita
  „open with / share to VLC" manual. Mitigat de link-ul „copiază URL".
- **Autoplay cu sunet pe mobil:** deja gestionat de `useHlsPlayer` (pornire muted + buton unmute).
- **Conflict taste `←/→` cu scroll:** săgețile schimbă canalul, nu derulează — comportament
  intenționat (aplicație tip TV/telecomandă); scroll-ul vertical rămâne pe touch/rotiță.

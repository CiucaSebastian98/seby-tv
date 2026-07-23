import express from 'express'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ──────────────────────────────────────────────────────────────────────
// Config (din variabile de mediu)
// ──────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 8080)
const PLAYLIST_URL =
  process.env.PLAYLIST_URL || 'https://iptv-org.github.io/iptv/languages/ron.m3u'
const IDLE_MS = Number(process.env.IDLE_MS || 30_000)
const START_TIMEOUT_MS = Number(process.env.START_TIMEOUT_MS || 15_000)
const PLAYLIST_REFRESH_MS = Number(process.env.PLAYLIST_REFRESH_MS || 6 * 3600 * 1000)
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS || 20)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ──────────────────────────────────────────────────────────────────────
// Logging — timestamp + prefix
// ──────────────────────────────────────────────────────────────────────
function log(prefix, msg) {
  const ts = new Date().toISOString()
  console.log(`${ts} [${prefix}] ${msg}`)
}
function warn(prefix, msg) {
  const ts = new Date().toISOString()
  console.warn(`${ts} [${prefix}] ${msg}`)
}

// ──────────────────────────────────────────────────────────────────────
// Hash determinist — IDENTIC cu keyFor din frontend (channelService.js)
// ──────────────────────────────────────────────────────────────────────
function keyFor(url) {
  let h = 5381
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) >>> 0
  return h.toString(36)
}

// ──────────────────────────────────────────────────────────────────────
// Playlist: allowlist de canale (key → { url, userAgent })
// ──────────────────────────────────────────────────────────────────────
let channels = new Map()
let playlistLoadedAt = null

async function loadPlaylist() {
  log('playlist', `Descarc ${PLAYLIST_URL}…`)
  const res = await fetch(PLAYLIST_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()

  const map = new Map()
  let pendingUa = null

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF')) {
      // Resetăm user-agent per intrare (se aplică doar la URL-ul imediat următor)
      const m = line.match(/http-user-agent="([^"]*)"/i)
      pendingUa = m ? m[1] : null
    } else if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      pendingUa = line.slice('#EXTVLCOPT:http-user-agent='.length).trim()
    } else if (line.startsWith('#')) {
      // Alte directive M3U — ignorăm
    } else {
      // Linia e un URL
      map.set(keyFor(line), { url: line, userAgent: pendingUa })
      pendingUa = null
    }
  }

  channels = map
  playlistLoadedAt = new Date()
  log('playlist', `${channels.size} canale încărcate`)
}

// ──────────────────────────────────────────────────────────────────────
// Session manager (ffmpeg on-demand, thread-safe)
// ──────────────────────────────────────────────────────────────────────
/** @type {Map<string, {proc, dir, lastAccess, ready: Promise<boolean>, errBuf: string}>} */
const sessions = new Map()
/** Previne race condition: 2 cereri simultane pe același key nu vor spawna 2 procese */
const pending = new Map()

/**
 * Curăță o sesiune: omoară ffmpeg + șterge directorul HLS.
 */
async function cleanup(key) {
  const s = sessions.get(key)
  if (!s) return
  sessions.delete(key)
  log('session', `Cleanup ${key}`)
  try { s.proc.kill('SIGKILL') } catch { /* deja mort */ }
  // Așteptăm un pic ca procesul să moară înainte de rm
  await sleep(200)
  try { await rm(s.dir, { recursive: true, force: true }) } catch { /* ok */ }
}

/**
 * Creează sesiunea ffmpeg (intern — apelat din ensureSession).
 */
async function createSession(key) {
  const ch = channels.get(key)
  if (!ch) return null

  // Verificăm limita de sesiuni
  if (sessions.size >= MAX_SESSIONS) {
    // Închidem cea mai veche sesiune inactivă
    let oldest = null
    let oldestAccess = Infinity
    for (const [k, s] of sessions) {
      if (s.lastAccess < oldestAccess) {
        oldest = k
        oldestAccess = s.lastAccess
      }
    }
    if (oldest) {
      warn('session', `Limită de ${MAX_SESSIONS} sesiuni atinsă, opresc ${oldest}`)
      await cleanup(oldest)
    }
  }

  const dir = await mkdtemp(join(tmpdir(), 'sebytv-'))

  const args = [
    '-hide_banner',
    '-loglevel', 'warning',               // 'error' pierde info util; 'warning' e un compromis bun
    '-rw_timeout', '20000000',             // 20s: nu bloca la infinit pe sursă moartă
    // Reconnect automat (surse IPTV instabile se deconectează des)
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    ...(ch.userAgent ? ['-user_agent', ch.userAgent] : []),
    '-i', ch.url,
    '-fflags', '+genpts+discardcorrupt',   // regen timestamps + ignoră frame-uri corupte
    '-err_detect', 'ignore_err',           // tolerează erori din sursa IPTV
    '-c:v', 'copy',                        // video: păstrăm codec-ul original (H.264)
    '-c:a', 'aac', '-ac', '2', '-b:a', '128k', // audio: transcodăm la AAC
    '-async', '1',                         // sincronizare A/V (previne drift)
    '-f', 'hls',
    '-hls_time', '4',                      // Timp mai mare (4s) dă șansa să prindă keyframe-uri curate din sursă
    '-hls_list_size', '8',
    '-hls_flags', 'delete_segments+append_list+omit_endlist', // Am scos independent_segments care strică playerele native
    '-hls_segment_type', 'mpegts',
    '-mpegts_flags', '+resend_headers',    // CRUCIAL: headere PAT/PMT în fiecare segment
    '-hls_segment_filename', join(dir, 'seg-%d.ts'),
    join(dir, 'index.m3u8'),
  ]

  log('ffmpeg', `Pornesc pentru ${key}: ffmpeg ${args.slice(-1)}`)
  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })

  let errBuf = ''
  proc.stderr.on('data', (d) => {
    errBuf = (errBuf + d.toString()).slice(-4000)
  })

  // Promise care se rezolvă când index.m3u8 are cel puțin un segment .ts
  const readyPromise = waitForIndex(dir, proc)

  proc.on('error', (e) => {
    warn('ffmpeg', `Spawn error ${key}: ${e.message} (ffmpeg instalat?)`)
    cleanup(key)
  })

  proc.on('exit', (code, signal) => {
    if (code && code !== 0) {
      warn('ffmpeg', `Exit ${key} code=${code} signal=${signal}: ${errBuf.slice(-300)}`)
    } else {
      log('ffmpeg', `Stop ${key} (signal=${signal || 'none'})`)
    }
    // Permite repornirea la următoarea cerere
    cleanup(key)
  })

  const s = { proc, dir, lastAccess: Date.now(), ready: readyPromise, errBuf: '' }
  sessions.set(key, s)
  return s
}

/**
 * Asigură o sesiune ffmpeg pentru cheia dată.
 * Race-condition safe: dacă 2 cereri vin simultan, doar una creează sesiunea.
 */
async function ensureSession(key) {
  const ch = channels.get(key)
  if (!ch) return null

  // Sesiune existentă și proces viu?
  const existing = sessions.get(key)
  if (existing && !existing.proc.killed) {
    existing.lastAccess = Date.now()
    return existing
  }

  // Deja se creează? Așteptăm.
  if (pending.has(key)) {
    return pending.get(key)
  }

  // Creăm sesiunea — cu lock
  const promise = createSession(key)
  pending.set(key, promise)
  try {
    return await promise
  } finally {
    pending.delete(key)
  }
}

/**
 * Așteaptă ca index.m3u8 să conțină cel puțin un segment .ts.
 * Non-blocant: folosește async polling (nu blochează event loop-ul altor cereri).
 */
async function waitForIndex(dir, proc) {
  const file = join(dir, 'index.m3u8')
  const deadline = Date.now() + START_TIMEOUT_MS

  while (Date.now() < deadline) {
    // Dacă procesul a murit deja, nu mai așteptăm
    if (proc.killed || proc.exitCode !== null) return false

    if (existsSync(file)) {
      try {
        const txt = await readFile(file, 'utf8')
        if (/\.ts/.test(txt)) return true // are cel puțin un segment
      } catch { /* fișier încă în curs de scriere */ }
    }
    await sleep(300)
  }
  return false
}

// Janitor: oprește sesiunile inactive.
setInterval(() => {
  const now = Date.now()
  for (const [key, s] of sessions) {
    if (now - s.lastAccess > IDLE_MS) {
      log('janitor', `Sesiune inactivă: ${key} (${Math.round((now - s.lastAccess) / 1000)}s)`)
      cleanup(key)
    }
  }
}, 10_000)

// ──────────────────────────────────────────────────────────────────────
// HTTP Server
// ──────────────────────────────────────────────────────────────────────
const app = express()
app.disable('x-powered-by')

// ── Middleware global ──
app.use((req, res, next) => {
  // Securitate bazată pe Token
  // Player-ul cere index.m3u8?token=..., dar segmentele .ts sunt cerute FĂRĂ token de hls.js!
  // Așa că cerem token-ul doar la inițierea stream-ului (.m3u8) sau la playlist.
  if (req.path.endsWith('.m3u8') || req.path.startsWith('/playlist')) {
    const token = req.query.token
    if (token !== 'parola123') {
      return res.status(401).send('Acces interzis: token invalid')
    }
  }

  // CORS - Lăsăm liber pentru player-ul web (deoarece e deja securizat cu token)
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning')
  // Securitate
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('X-Frame-Options', 'DENY')
  // Preflight
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

// ── Request logging ──
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    // Logăm doar rutele /stream și erorile, ca să nu poluăm logul
    if (req.path.startsWith('/stream') || res.statusCode >= 400) {
      log('http', `${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`)
    }
  })
  next()
})

// ── Health ──
app.get('/health', (_req, res) =>
  res.json({
    ok: true,
    channels: channels.size,
    sessions: sessions.size,
    maxSessions: MAX_SESSIONS,
    playlistLoadedAt,
    uptime: Math.round(process.uptime()),
  }),
)

// ── Stats/debug ──
app.get('/stats', (_req, res) => {
  const sessionList = []
  for (const [key, s] of sessions) {
    sessionList.push({
      key,
      idleSeconds: Math.round((Date.now() - s.lastAccess) / 1000),
      alive: !s.proc.killed && s.proc.exitCode === null,
    })
  }
  res.json({
    channels: channels.size,
    sessions: sessionList,
    memory: process.memoryUsage(),
    uptime: Math.round(process.uptime()),
  })
})

// ── Channels list (frontend poate cere lista de canale disponibile pe proxy) ──
app.get('/channels', (_req, res) => {
  const list = []
  for (const [key, ch] of channels) {
    list.push({ key, url: ch.url })
  }
  res.json({ count: list.length, channels: list })
})

// ── Validare key (alfanumeric, max 20 chars — hash base36) ──
function isValidKey(key) {
  return /^[a-z0-9]{1,20}$/i.test(key)
}

// ── Stream: index.m3u8 ──
app.get('/stream/:key/index.m3u8', async (req, res) => {
  const { key } = req.params
  if (!isValidKey(key)) return res.status(400).send('Cheie invalidă')

  try {
    const s = await ensureSession(key)
    if (!s) return res.status(404).send('Canal necunoscut (nu există în playlist)')

    // Așteptăm ca ffmpeg să producă primul segment
    const ready = await s.ready
    if (!ready) {
      warn('stream', `Timeout la ${key} — ffmpeg nu a produs segmente`)
      cleanup(key)
      return res.status(504).send('Stream indisponibil (ffmpeg timeout)')
    }

    s.lastAccess = Date.now()
    const indexPath = join(s.dir, 'index.m3u8')

    // Citim direct conținutul (nu sendFile!) — evităm Range/206 pe playlist
    let content
    try {
      content = await readFile(indexPath, 'utf8')
    } catch {
      return res.status(404).send('Playlist HLS nu mai există (sesiune expirată)')
    }

    // Verificăm că mai are segmente (ffmpeg n-a murit între timp)
    if (!content || !content.includes('.ts')) {
      return res.status(404).send('Playlist HLS gol (ffmpeg s-a oprit)')
    }

    res.status(200)
    res.set('Content-Type', 'application/vnd.apple.mpegurl')
    res.set('Cache-Control', 'no-cache, no-store')
    res.set('Accept-Ranges', 'none')         // nu acceptăm Range pe playlist
    res.send(content)
  } catch (err) {
    warn('stream', `Eroare la ${key}: ${err.message}`)
    if (!res.headersSent) res.status(500).send('Eroare internă')
  }
})

// ── Stream: segmente .ts și alte fișiere ──
app.get('/stream/:key/:file', async (req, res) => {
  const { key, file } = req.params
  if (!isValidKey(key)) return res.status(400).end()

  // Anti path-traversal: doar alfanumeric + punct + minus
  if (!/^[\w.-]+$/.test(file)) return res.status(400).send('Nume fișier invalid')

  // Extensii permise
  if (!file.endsWith('.ts') && !file.endsWith('.m3u8')) {
    return res.status(403).send('Extensie nepermisă')
  }

  const s = sessions.get(key)
  if (!s) return res.status(404).send('Sesiune inexistentă')

  const p = join(s.dir, file)

  s.lastAccess = Date.now()

  // Citim direct fișierul (nu sendFile) — evităm Range/206 care poate
  // confunda hls.js când Content-Length nu se potrivește cu range-ul.
  try {
    const data = await readFile(p)

    if (file.endsWith('.ts')) {
      res.set('Content-Type', 'video/mp2t')
    } else {
      res.set('Content-Type', 'application/vnd.apple.mpegurl')
    }

    res.set('Content-Length', String(data.length))
    res.set('Cache-Control', 'no-cache, no-store')
    res.set('Accept-Ranges', 'none')
    res.status(200).send(data)
  } catch {
    // Fișier probabil șters de ffmpeg (delete_segments) între verificare și citire
    if (!res.headersSent) res.status(404).send('Segment negăsit sau șters')
  }
})

// ── Stop manual: frontend poate opri un stream (cleanup resurse) ──
app.post('/stream/:key/stop', async (req, res) => {
  const { key } = req.params
  if (!isValidKey(key)) return res.status(400).end()

  if (!sessions.has(key)) return res.status(404).json({ ok: false, error: 'Sesiune inexistentă' })

  await cleanup(key)
  log('stream', `Stop manual: ${key}`)
  res.json({ ok: true })
})

// ── 404 catch-all ──
app.use((_req, res) => {
  res.status(404).json({ error: 'Rută necunoscută' })
})

// ── Error handler ──
app.use((err, _req, res, _next) => {
  warn('http', `Eroare neprinsă: ${err.message}`)
  if (!res.headersSent) {
    res.status(500).json({ error: 'Eroare internă de server' })
  }
})

// ──────────────────────────────────────────────────────────────────────
// Boot
// ──────────────────────────────────────────────────────────────────────
async function boot() {
  log('boot', `Pornire seby-tv-proxy (port ${PORT})…`)

  for (let i = 0; i < 5; i++) {
    try {
      await loadPlaylist()
      break
    } catch (e) {
      warn('playlist', `Eșec încărcare (${e.message}), reîncerc în 3s… (${i + 1}/5)`)
      if (i < 4) await sleep(3000)
      else warn('playlist', 'Nu am reușit să încarc playlist-ul după 5 încercări!')
    }
  }

  // Reîncarcă periodic playlist-ul (canale noi, URL-uri schimbate)
  setInterval(() => {
    loadPlaylist().catch((e) => {
      warn('playlist', `Refresh eșuat: ${e.message}`)
    })
  }, PLAYLIST_REFRESH_MS)

  app.listen(PORT, () => log('boot', `Ascult pe :${PORT} — ${channels.size} canale disponibile`))
}

boot()

// ──────────────────────────────────────────────────────────────────────
// Oprire curată (graceful shutdown)
// ──────────────────────────────────────────────────────────────────────
let shuttingDown = false

async function gracefulShutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  log('shutdown', `Primit ${signal}, opresc ${sessions.size} sesiuni…`)

  const cleanups = [...sessions.keys()].map(cleanup)
  await Promise.allSettled(cleanups)

  log('shutdown', 'Toate sesiunile oprite. La revedere!')
  process.exit(0)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Previne crash pe erori neprinsă
process.on('uncaughtException', (err) => {
  warn('fatal', `Excepție neprinsă: ${err.message}\n${err.stack}`)
})
process.on('unhandledRejection', (reason) => {
  warn('fatal', `Promise netratat: ${reason}`)
})

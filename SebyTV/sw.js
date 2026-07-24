/* Service worker minimal, fără build step: cache la runtime, nu precache.
 *
 * Regula de aur: NU atingem fluxurile video. Sunt cross-origin, infinite și de
 * ordinul gigabaiților — un cache le-ar umple discul și ar rupe redarea live.
 * Interceptăm doar GET-uri same-origin pentru shell-ul aplicației.
 */
const VERSION = 'seby-tv-v1'
const SHELL = '/index.html'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.add(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // playlist, EPG, stream-uri
  if (request.headers.has('range')) return // cereri parțiale de media

  // Navigare: rețea întâi (conținutul se schimbă), shell-ul din cache ca rezervă
  // ca aplicația să pornească și fără conexiune.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match(SHELL)))
    return
  }

  // Asset-uri (JS/CSS/fonturi/iconițe): din cache instant, împrospătate în fundal.
  e.respondWith(
    caches.match(request).then((hit) => {
      const net = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(VERSION).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => hit)
      return hit || net
    }),
  )
})

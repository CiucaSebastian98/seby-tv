import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build-ul pentru Tizen (TIZEN=1 npm run build:tizen) diferă de cel web:
//  - `base: './'` — app-ul se încarcă din fișiere locale (path-uri relative).
//  - `viteSingleFile()` — INLINE tot JS+CSS într-un singur index.html. Pe TV
//    conținutul e servit din file://, unde `<script type=module src=...>` extern
//    e blocat de CORS → bundle-ul nu rulează și se vede doar fundalul. Inline nu
//    face niciun fetch, deci rulează garantat.
//  - `target: 'chrome76'` — Tizen 5.5 (TV 2020) are Chromium 76; coborâm sintaxa
//    (optional chaining / nullish etc. sunt transpilate).
const IS_TIZEN = !!process.env.TIZEN

// https://vite.dev/config/
export default defineConfig({
  base: IS_TIZEN ? './' : '/',
  build: {
    target: IS_TIZEN ? 'chrome76' : undefined,
    // Folderul de build Tizen se numește ca aplicația („SebyTV"): extensia Tizen
    // derivă app-id-ul din numele folderului proiectului, deci trebuie să se
    // potrivească cu <tizen:application id="SebyTV0001.SebyTV"> din config.xml.
    outDir: IS_TIZEN ? 'SebyTV' : 'dist',
  },
  plugins: [react(), ...(IS_TIZEN ? [viteSingleFile()] : [])],
  server: {
    // Proxy opțional pentru stream-uri care blochează CORS.
    // Folosire: în loc de `https://host/live.m3u8` cere `/stream-proxy/host/live.m3u8`.
    // Multe stream-uri iptv-org NU vor merge nici așa (token/geo/user-agent) — e normal.
    // proxy: {
    //   '/stream-proxy': {
    //     target: 'https://example.com',
    //     changeOrigin: true,
    //     rewrite: (p) => p.replace(/^\/stream-proxy/, ''),
    //   },
    // },
  },
})

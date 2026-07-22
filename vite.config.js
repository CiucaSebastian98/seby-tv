import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

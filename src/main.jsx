import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import './index.css'

// Rulăm împachetat (ex. app Tizen încărcat din fișier local) când protocolul nu
// e http(s). Atunci folosim HashRouter: fără server, rutele „curate" (pushState)
// nu se pot rezolva la reload/deep-link, dar hash-ul merge oriunde. Pe web rămâne
// BrowserRouter, ca URL-urile să fie curate (seby-tv.vercel.app/antena-1).
const isPackaged =
  window.location.protocol !== 'http:' && window.location.protocol !== 'https:'
const Router = isPackaged ? HashRouter : BrowserRouter

// Service worker: doar în producție pe web. În dev ar servi din cache un bundle
// vechi; iar împachetat (file://) service worker-ul nici nu e disponibil.
if ('serviceWorker' in navigator && import.meta.env.PROD && !isPackaged) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // instalarea PWA e opțională — aplicația merge și fără
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AppProvider>
        <App />
      </AppProvider>
    </Router>
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// PWA: register the service worker for offline + installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support unavailable — app still works fully online */
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

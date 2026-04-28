import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker so the app installs as a PWA and works offline.
// Only registers in production builds — in dev, Vite's HMR + the SW don't mix well.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // When a new SW is installed, ask it to take over immediately
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
} else if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  // In dev mode, proactively unregister any previously-installed SW so HMR works
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => { /* ignore */ });
}
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '@fontsource/young-serif/400.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './index.css';
import './styles/gatefold.css';
import './styles/consent.css';
import { applyConsent, readConsent } from './lib/consent';

// Returning visitors who already opted in: load their allowed trackers immediately.
applyConsent(readConsent());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA: register the service worker (installable + offline app shell), on the
// real site only. On localhost (dev server or `vite preview`) a worker would
// keep serving cached modules across runs and projects sharing the port, so
// there any leftover one is removed instead.
if ('serviceWorker' in navigator) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  if (import.meta.env.PROD && !local) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
  }
}

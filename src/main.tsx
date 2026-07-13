import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/home.css';
import './styles/consent.css';
import { applyConsent, readConsent } from './lib/consent';

// Returning visitors who already opted in: load their allowed trackers immediately.
applyConsent(readConsent());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// PWA: register the service worker (installable + offline app shell).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
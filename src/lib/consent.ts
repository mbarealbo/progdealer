// Self-hosted cookie consent — replaces Cookiebot.
// Non-essential trackers (Google Analytics, Lucky Orange) are NEVER loaded until
// the visitor opts in. Consent is stored first-party, is granular per category,
// expires so we re-ask, and is fully revocable.

export interface ConsentState {
  analytics: boolean; // Google Analytics
  marketing: boolean; // Lucky Orange (session replay / behaviour)
  ts: number;         // epoch ms when the choice was made
  v: number;          // consent version — bump to force a fresh prompt
}

// Bump this when the set of trackers or the policy materially changes: existing
// visitors will be asked again. Keep it in sync with the privacy policy.
export const CONSENT_VERSION = 1;

const KEY = 'pd_cookie_consent';
const MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000; // ~6 months, then re-ask

const GA_ID = 'G-MT7RPW1YD2';
const LO_SITE = '2f76a8d2';

/** Returns the stored decision, or null if none / expired / outdated version. */
export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ConsentState;
    if (s.v !== CONSENT_VERSION) return null;
    if (!s.ts || Date.now() - s.ts > MAX_AGE_MS) return null;
    return { analytics: !!s.analytics, marketing: !!s.marketing, ts: s.ts, v: s.v };
  } catch {
    return null;
  }
}

function injectScript(src: string, attrs: Record<string, string> = {}) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

function loadAnalytics() {
  const w = window as any;
  if (w.__pdGA) return;
  w.__pdGA = true;
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() { w.dataLayer.push(arguments); };
  w.gtag('js', new Date());
  w.gtag('config', GA_ID);
}

function loadMarketing() {
  const w = window as any;
  if (w.__pdLO) return;
  w.__pdLO = true;
  injectScript(`https://tools.luckyorange.com/core/lo.js?site-id=${LO_SITE}`, { defer: '' });
}

/** Load whatever the given (already-decided) consent allows. Safe to call repeatedly. */
export function applyConsent(state: ConsentState | null) {
  if (!state) return;
  if (state.analytics) loadAnalytics();
  if (state.marketing) loadMarketing();
}

function clearTrackerCookies() {
  const host = location.hostname;
  const base = host.split('.').slice(-2).join('.');
  const domains = ['', `; domain=${host}`, `; domain=.${host}`, `; domain=.${base}`];
  document.cookie
    .split(';')
    .map((c) => c.split('=')[0].trim())
    .filter((n) => /^_ga|^_gid|^_gat|^__lo|^luckyorange|^wtw/i.test(n))
    .forEach((name) => {
      for (const d of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`;
      }
    });
}

/**
 * Persist a decision and act on it. If the visitor turns OFF a category that was
 * previously ON, we clear those cookies and reload — the only reliable way to
 * stop a tracker that is already running in this tab.
 */
export function saveConsent(analytics: boolean, marketing: boolean): ConsentState {
  const prev = readConsent();
  const state: ConsentState = { analytics, marketing, ts: Date.now(), v: CONSENT_VERSION };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }

  const withdrew = (prev?.analytics && !analytics) || (prev?.marketing && !marketing);
  if (withdrew) {
    clearTrackerCookies();
    window.location.reload();
    return state;
  }

  applyConsent(state);
  window.dispatchEvent(new CustomEvent('pd:consent-changed', { detail: state }));
  return state;
}

/** Ask the <CookieConsent> UI to reopen (e.g. from a "Cookie settings" footer link). */
export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent('pd:open-cookie-settings'));
}

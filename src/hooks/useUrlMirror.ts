import { useEffect } from 'react';

/**
 * Mirrors page state in the query string, so coming back from another page,
 * reloading or opening a shared link reopens the same state. Uses replaceState:
 * changing a filter adds no history entry, so Back still leaves the page.
 * Empty values are left out of the URL.
 *
 * Writes are debounced (Safari throws after too many history writes in a short
 * window, and search writes once per key) and flushed on pagehide, so leaving
 * right after a change still records it.
 */
export function useUrlMirror(params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams(
    Object.entries(params).filter((kv): kv is [string, string] => !!kv[1]),
  ).toString();

  useEffect(() => {
    const write = () => {
      const { pathname, search, hash } = window.location;
      const next = pathname + (query ? `?${query}` : '') + hash;
      if (next === pathname + search + hash) return;
      // Keep history.state: the router and useScrollRestore store data there.
      try { window.history.replaceState(window.history.state, '', next); } catch { /* rate-limited: the next change retries */ }
    };
    const timer = window.setTimeout(write, 250);
    window.addEventListener('pagehide', write);
    return () => { window.clearTimeout(timer); window.removeEventListener('pagehide', write); };
  }, [query]);
}

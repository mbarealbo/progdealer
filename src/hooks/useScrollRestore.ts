import { useEffect, useLayoutEffect, useRef } from 'react';

type ScrollState = { pdScroll?: unknown } | null;

/**
 * Puts the reader back where they were when they return to this page (Back,
 * reload). The browser does it by itself only when the page comes out of the
 * back/forward cache; otherwise the content arrives after an async fetch, too
 * late for native scroll restoration. The offset is stored in this history
 * entry's state, so a fresh visit to the same URL still starts at the top.
 *
 * `ready`: true once the content is rendered at its full height.
 */
export function useScrollRestore(ready: boolean) {
  const target = useRef<number | null | undefined>(undefined);
  if (target.current === undefined) {
    const y = (window.history.state as ScrollState)?.pdScroll;
    target.current = typeof y === 'number' ? y : null;
  }

  useEffect(() => {
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    let timer: number | undefined;
    const save = () => {
      // Keep the rest of history.state (router keys, other hooks).
      try { window.history.replaceState({ ...window.history.state, pdScroll: Math.round(window.scrollY) }, ''); } catch { /* rate-limited */ }
    };
    const onScroll = () => { window.clearTimeout(timer); timer = window.setTimeout(save, 200); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', save);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', save);
      window.history.scrollRestoration = prev;
    };
  }, []);

  useLayoutEffect(() => {
    if (!ready || target.current === null) return;
    window.scrollTo(0, target.current as number);
    target.current = null;
  }, [ready]);
}

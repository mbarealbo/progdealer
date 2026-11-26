import { useEffect, useMemo } from 'react';
import {
  SeoEvent, eventTitle, eventDescription, eventOgImage, eventCanonical, eventJsonLd,
} from '../lib/seo';
import type { PageMeta } from '../lib/seoHubs';

function upsert<T extends HTMLElement>(selector: string, create: () => T): { el: T; created: boolean } {
  let el = document.head.querySelector(selector) as T | null;
  if (el) return { el, created: false };
  el = create();
  document.head.appendChild(el);
  return { el, created: true };
}

function setMeta(kind: 'name' | 'property', key: string, content: string) {
  const { el } = upsert(`meta[${kind}="${key}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute(kind, key);
    return m;
  });
  el.setAttribute('content', content);
}

// The edge function rendered JSON-LD for the URL the visit started on. Keep
// those blocks while the reader is still on that page (they carry the full
// breadcrumb); replace them once the SPA moves to another page.
const ssrPath = typeof window !== 'undefined' ? window.location.pathname : '';
let leftSsrPage = false;

/**
 * Keeps document.title, description, canonical, robots, Open Graph / Twitter
 * tags and the JSON-LD blocks in sync with the page during client-side SPA
 * navigation. The Netlify Edge Function already injects these for crawlers on
 * first load; this mirrors them so real users (and JS-rendering crawlers) see
 * correct metadata after in-app navigation. Restores title, canonical and
 * robots on unmount.
 */
export function usePageMeta(meta: PageMeta | null) {
  useEffect(() => {
    if (!meta) return;
    const prevTitle = document.title;
    document.title = meta.title;

    setMeta('name', 'description', meta.description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:url', meta.canonical);
    setMeta('property', 'og:image', meta.image);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:image', meta.image);

    const { el: canon } = upsert('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    });
    const prevCanon = canon.getAttribute('href');
    canon.setAttribute('href', meta.canonical);

    // Robots: set for thin pages, and cleared again when leaving them.
    const robotsEl = document.head.querySelector('meta[name="robots"]');
    const prevRobots = robotsEl?.getAttribute('content') ?? null;
    if (meta.robots) setMeta('name', 'robots', meta.robots);
    else robotsEl?.remove();

    const onSsrPage = !leftSsrPage && window.location.pathname === ssrPath;
    if (!onSsrPage) {
      leftSsrPage = true;
      document.head.querySelectorAll('script[type="application/ld+json"]:not([data-page-ld])').forEach((s) => s.remove());
    }
    const scripts = (onSsrPage && document.head.querySelector('script[type="application/ld+json"]') ? [] : meta.jsonLd).map((obj) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.dataset.pageLd = '';
      s.textContent = JSON.stringify(obj);
      document.head.appendChild(s);
      return s;
    });

    return () => {
      document.title = prevTitle;
      if (prevCanon) canon.setAttribute('href', prevCanon);
      const r = document.head.querySelector('meta[name="robots"]');
      if (prevRobots === null) r?.remove();
      else setMeta('name', 'robots', prevRobots);
      scripts.forEach((s) => s.remove());
    };
  }, [meta]);
}

/** Event pages: the same metadata the edge function injects (see seo.ts). */
export function useEventMeta(event: SeoEvent | null) {
  const meta = useMemo<PageMeta | null>(() => {
    if (!event) return null;
    const origin = window.location.origin;
    return {
      title: eventTitle(event),
      description: eventDescription(event),
      canonical: eventCanonical(event, origin),
      image: eventOgImage(event, origin),
      jsonLd: [eventJsonLd(event, origin)],
    };
  }, [event]);
  usePageMeta(meta);
}

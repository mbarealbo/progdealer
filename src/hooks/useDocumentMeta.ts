import { useEffect } from 'react';
import {
  SeoEvent, eventTitle, eventDescription, eventOgImage, eventCanonical, eventJsonLd,
} from '../lib/seo';

function upsert<T extends HTMLElement>(selector: string, create: () => T): T {
  let el = document.head.querySelector(selector) as T | null;
  if (!el) { el = create(); document.head.appendChild(el); }
  return el;
}

function setMeta(kind: 'name' | 'property', key: string, content: string) {
  const el = upsert(`meta[${kind}="${key}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute(kind, key);
    return m;
  });
  el.setAttribute('content', content);
}

/**
 * Keeps document.title, description, canonical, Open Graph / Twitter tags and the
 * JSON-LD block in sync with the current event during client-side SPA navigation.
 * The Netlify Edge Function already injects these for crawlers on first load; this
 * mirrors them so real users (and JS-rendering crawlers) see correct metadata after
 * in-app navigation. Restores the previous title/canonical on unmount.
 */
export function useEventMeta(event: SeoEvent | null) {
  useEffect(() => {
    if (!event) return;
    const origin = window.location.origin;
    const title = eventTitle(event);
    const desc = eventDescription(event);
    const url = eventCanonical(event, origin);
    const img = eventOgImage(event, origin);

    const prevTitle = document.title;
    document.title = title;

    setMeta('name', 'description', desc);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', img);

    const canon = upsert('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    });
    const prevCanon = canon.getAttribute('href');
    canon.setAttribute('href', url);

    const ld = upsert('script#ld-event', () => {
      const s = document.createElement('script');
      s.setAttribute('type', 'application/ld+json');
      s.id = 'ld-event';
      return s;
    });
    ld.textContent = JSON.stringify(eventJsonLd(event, origin));

    return () => {
      document.title = prevTitle;
      if (prevCanon) canon.setAttribute('href', prevCanon);
      ld.remove();
    };
  }, [event]);
}

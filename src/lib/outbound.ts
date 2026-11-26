// Outbound links (tickets, venues, artists) carry UTM tags naming ProgDealer,
// so promoters, venues and ticket sites see us as the source in their
// analytics. Shared by the event page and the edge SSR (seo.ts): keep it
// dependency-free.

const UTM = 'utm_source=progdealer&utm_medium=referral&utm_campaign=event_page';

/**
 * `href` with ProgDealer's UTM tags. Tags left by the source a link was
 * scraped from (Bandsintown adds utm_source=widget) are replaced: the click
 * comes from us. Every other parameter is kept byte for byte, so affiliate or
 * partner ids still work. Non-web and internal links are returned unchanged.
 */
export function withUtm(href: string): string {
  let u: URL;
  try { u = new URL(href); } catch { return href; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return href;
  if (u.hostname === 'progdealer.com' || u.hostname.endsWith('.progdealer.com')) return href;
  // Rebuild the query by hand rather than via searchParams, which would
  // re-encode the other parameters (spaces, bare keys) on the way out.
  const kept = u.search.slice(1).split('&').filter((p) => p && !/^utm_/i.test(p));
  return `${u.origin}${u.pathname}?${[...kept, UTM].join('&')}${u.hash}`;
}

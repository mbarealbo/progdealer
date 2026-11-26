// The whole public catalog, kept in the edge isolate for a few minutes. Used by
// the Netlify edge functions (SSR pages and the widget data); responses are
// also cached by the CDN, so the rows are fetched a few times an hour at most.
import { buildCatalog, fetchCatalogRows, type Catalog } from './catalog.ts';

/**
 * A getter for the catalog: one fetch at a time, reused for `ttlMs`, and the
 * last good catalog when a refresh fails (stale beats nothing).
 */
export function catalogLoader(supabaseUrl: string, anonKey: string, ttlMs = 10 * 60 * 1000): () => Promise<Catalog | null> {
  let cached: { at: number; catalog: Catalog } | null = null;
  let inflight: Promise<Catalog | null> | null = null;

  return () => {
    if (cached && Date.now() - cached.at < ttlMs) return Promise.resolve(cached.catalog);
    if (!anonKey) return Promise.resolve(null);
    if (!inflight) {
      inflight = (async () => {
        try {
          const catalog = buildCatalog(await fetchCatalogRows(supabaseUrl, anonKey));
          cached = { at: Date.now(), catalog };
          return catalog;
        } catch {
          return cached?.catalog ?? null;
        } finally {
          inflight = null;
        }
      })();
    }
    return inflight;
  };
}

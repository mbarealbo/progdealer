import { useEffect, useState } from 'react';
import { buildCatalog, fetchCatalogRows, type Catalog } from '../lib/catalog';

// One catalog per page load, shared by every hub page and the event page's
// links: moving between /artist, /city and /festival pages costs no new fetch.
let pending: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  if (!pending) {
    pending = fetchCatalogRows(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
      .then((rows) => buildCatalog(rows))
      .catch((err) => { pending = null; throw err; });
  }
  return pending;
}

export function useCatalog(): { catalog: Catalog | null; failed: boolean } {
  const [state, setState] = useState<{ catalog: Catalog | null; failed: boolean }>({ catalog: null, failed: false });
  useEffect(() => {
    let live = true;
    loadCatalog()
      .then((catalog) => { if (live) setState({ catalog, failed: false }); })
      .catch((err) => { console.error('Error loading the catalog:', err); if (live) setState({ catalog: null, failed: true }); });
    return () => { live = false; };
  }, []);
  return state;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { Shell } from './hubs/HubPages';
import { useCatalog } from '../hooks/useCatalog';
import { usePageMeta } from '../hooks/useDocumentMeta';
import { hubPath, topHubs, type HubKind } from '../lib/catalog';
import {
  WIDGET_FAQ, WIDGET_PAGE_COPY, badgeSnippet, widgetPageMeta, widgetSnippet, widgetTitle,
} from '../lib/seoHubs';
import { CONTACT_EMAIL } from '../lib/seo';

declare global {
  interface Window { ProgDealerWidget?: { scan: () => void; render: (el: Element) => void } }
}

const KINDS: { kind: HubKind; label: string }[] = [
  { kind: 'artist', label: 'Artist' },
  { kind: 'festival', label: 'Festival' },
  { kind: 'city', label: 'City' },
  { kind: 'country', label: 'Country' },
  { kind: 'genre', label: 'Genre' },
];
const LIMITS = [3, 5, 8, 10];

/** Loads /widget.js once (same origin, so previews use their own data). */
function loadWidgetScript(): Promise<void> {
  if (window.ProgDealerWidget) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-pd-widget]');
  return new Promise((resolve) => {
    const s = existing || document.createElement('script');
    s.addEventListener('load', () => resolve(), { once: true });
    if (!existing) {
      s.src = '/widget.js';
      s.async = true;
      s.dataset.pdWidget = '1';
      document.body.appendChild(s);
    }
  });
}

function CopyBox({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* the code stays selectable */ }
  };
  return (
    <div className="wg-code">
      <div className="wg-code-head">
        <span className="label">{label}</span>
        <button className="btn btn-ghost" onClick={copy}>
          {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy code</>}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function Preview({ kind, slug, name, limit, dark }: { kind: HubKind; slug: string; name: string; limit: number; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    loadWidgetScript().then(() => { if (alive && ref.current) window.ProgDealerWidget?.render(ref.current); });
    return () => { alive = false; };
  }, []);
  const attrs: Record<string, string> = { [`data-${kind}`]: slug, 'data-limit': String(limit) };
  if (dark) attrs['data-theme'] = 'dark';
  return (
    <div ref={ref} className="progdealer-widget" {...attrs}>
      <a href={`https://progdealer.com${hubPath(kind, slug)}`}>{widgetTitle(kind, name)}</a> on ProgDealer
    </div>
  );
}

export default function WidgetPage() {
  const { catalog } = useCatalog();
  const meta = useMemo(() => widgetPageMeta(window.location.origin), []);
  usePageMeta(meta);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [kind, setKind] = useState<HubKind>('festival');
  const [slug, setSlug] = useState('');
  const [limit, setLimit] = useState(5);
  const [dark, setDark] = useState(false);

  const options = useMemo(() => {
    if (!catalog) return [];
    const hubs = topHubs(catalog, kind).filter((h) => h.upcoming.length > 0);
    return hubs.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, kind]);

  // A new kind starts on its busiest page.
  useEffect(() => {
    if (!catalog) return;
    if (!options.some((h) => h.slug === slug)) {
      const busiest = topHubs(catalog, kind).find((h) => h.upcoming.length > 0);
      setSlug(busiest?.slug || '');
    }
  }, [catalog, kind, options, slug]);

  const hub = options.find((h) => h.slug === slug);
  const name = hub?.name || '';

  return (
    <Shell>
      <header className="hub-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <span><Link to="/">ProgDealer</Link><span aria-hidden="true"> ›</span></span>
          <span aria-current="page">Widget</span>
        </nav>
        <div className="eyebrow">{WIDGET_PAGE_COPY.eyebrow}</div>
        <h1 className="hub-title">{WIDGET_PAGE_COPY.h1}</h1>
        <p className="hub-intro">{WIDGET_PAGE_COPY.intro}</p>
      </header>

      <section className="hub-sec" id="build">
        <div className="hub-sec-head"><h2>Build your widget</h2></div>
        <div className="wg-grid">
          <div className="wg-form">
            <div className="wg-field">
              <span className="label">Show the dates of</span>
              <div className="hub-chips">
                {KINDS.map((k) => (
                  <button key={k.kind} className={`chip${k.kind === kind ? ' on' : ''}`} aria-pressed={k.kind === kind} onClick={() => setKind(k.kind)}>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="wg-field">
              <span className="label">{KINDS.find((k) => k.kind === kind)?.label}</span>
              <select className="wg-select" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!options.length}>
                {!options.length && <option value="">Loading the catalog…</option>}
                {options.map((h) => <option key={h.slug} value={h.slug}>{h.name} ({h.upcoming.length})</option>)}
              </select>
            </label>
            <div className="wg-field">
              <span className="label">Shows</span>
              <div className="hub-chips">
                {LIMITS.map((n) => (
                  <button key={n} className={`chip${n === limit ? ' on' : ''}`} aria-pressed={n === limit} onClick={() => setLimit(n)}>{n}</button>
                ))}
              </div>
            </div>
            <div className="wg-field">
              <span className="label">Look</span>
              <div className="hub-chips">
                <button className={`chip${!dark ? ' on' : ''}`} aria-pressed={!dark} onClick={() => setDark(false)}>Light</button>
                <button className={`chip${dark ? ' on' : ''}`} aria-pressed={dark} onClick={() => setDark(true)}>Dark</button>
              </div>
            </div>
          </div>
          <div className="wg-preview">
            <span className="label">Preview</span>
            {hub
              ? <Preview key={`${kind}/${slug}/${limit}/${dark}`} kind={kind} slug={slug} name={name} limit={limit} dark={dark} />
              : <p className="wg-wait">Loading the catalog…</p>}
          </div>
        </div>
        {hub && <CopyBox label="Paste this where the dates should appear" code={widgetSnippet(kind, slug, name, limit, dark)} />}
      </section>

      <section className="hub-sec" id="badge">
        <div className="hub-sec-head"><h2>“Listed on ProgDealer” badge</h2></div>
        <p className="wg-text">
          For festivals, bands and venues: a small badge that links to {hub ? <Link to={hubPath(kind, slug)}>the {name} page</Link> : 'your page'} on ProgDealer.
        </p>
        <div className="wg-badge">
          <img src="/badge.svg" alt={hub ? `${name} on ProgDealer` : 'Listed on ProgDealer'} width={188} height={48} />
        </div>
        {hub && <CopyBox label="Badge code" code={badgeSnippet(kind, slug, name)} />}
      </section>

      <section className="hub-sec" id="faq">
        <div className="hub-sec-head"><h2>Good to know</h2></div>
        <dl className="wg-faq">
          {WIDGET_FAQ.map(([q, a]) => (
            <div key={q}><dt>{q}</dt><dd>{a}</dd></div>
          ))}
        </dl>
        <p className="wg-text">Questions or a page that is missing? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </section>
    </Shell>
  );
}

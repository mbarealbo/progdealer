import { useEffect, useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Logo from '../brand/Logo';
import EventCard from '../home/EventCard';
import { useCatalog } from '../../hooks/useCatalog';
import { usePageMeta } from '../../hooks/useDocumentMeta';
import { hubsOf, cityNameOf, type CatalogEvent, type Hub, type HubKind } from '../../lib/catalog';
import {
  hubCopy, hubMeta, hubSections, indexCopy, indexMeta, indexSections, festivalEdition, dateSpan,
  type IndexKind, type PageCopy, type Section,
} from '../../lib/seoHubs';
import { fmtShortDate, type LinkItem } from '../../lib/seo';
import type { EventSummary } from '../../types/event';
import { openCookieSettings } from '../../lib/consent';

const nf = new Intl.NumberFormat('en-US');

function toSummary(e: CatalogEvent): EventSummary {
  return {
    id: e.id, nome_evento: e.nome_evento, data_ora: e.data_ora, venue: e.venue, città: e.città,
    sottogenere: e.sottogenere || '', immagine: e.immagine || undefined, artisti: e.artisti ?? null,
    lat: e.lat ?? null, lng: e.lng ?? null, fonte: e.fonte || '',
  };
}

/** Links that stay inside the app use the router, so the catalog stays loaded. */
function PageLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  if (to.includes('?') || to.includes('#')) return <a className={className} href={to}>{children}</a>;
  return <Link className={className} to={to}>{children}</Link>;
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="pd">
      <div className="detail-bar">
        <div className="detail-bar-inner">
          <Link className="linkbtn" to="/"><ArrowLeft size={18} /> <span className="hide-mob">All shows</span></Link>
          <Link className="brand" to="/" aria-label="ProgDealer home"><Logo height={30} /></Link>
          <nav className="hub-nav" aria-label="Browse">
            <Link to="/festivals">Festivals</Link>
            <Link to="/artists">Artists</Link>
            <Link to="/cities">Cities</Link>
          </nav>
        </div>
      </div>
      <main className="hub-wrap">{children}</main>
      <footer className="foot hub-foot">
        <div className="wrap foot-top">
          <div className="foot-brand"><Logo height={30} /></div>
          <div className="foot-cols">
            <div>
              <span className="label">Discover</span>
              <Link to="/">All shows</Link>
              <Link to="/festivals">Prog festivals</Link>
              <Link to="/artists">Artists on tour</Link>
              <Link to="/cities">Cities and countries</Link>
            </div>
            <div>
              <span className="label">For your site</span>
              <Link to="/widget">Free widget and badge</Link>
            </div>
            <div>
              <span className="label">Project</span>
              <a href="/privacy">Privacy</a>
              <button onClick={openCookieSettings}>Cookie settings</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Head({ copy, children }: { copy: PageCopy; children?: ReactNode }) {
  const crumbs: LinkItem[] = [{ name: 'ProgDealer', path: '/' }, ...copy.trail];
  return (
    <header className="hub-head">
      <nav className="crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (i < crumbs.length - 1
          ? <span key={c.path}><Link to={c.path}>{c.name}</Link><span aria-hidden="true"> ›</span></span>
          : <span key={c.path} aria-current="page">{c.name}</span>))}
      </nav>
      <div className="eyebrow">{copy.eyebrow}</div>
      <h1 className="hub-title">{copy.h1}</h1>
      <p className="hub-intro">{copy.intro}</p>
      {children}
    </header>
  );
}

const countOf = (note?: string) => note?.match(/^\d+/)?.[0];

function SectionView({ s }: { s: Section }) {
  const count = s.events ? s.events.length : s.links?.length || 0;
  // Long notes (dates, places) read better as rows; bare counts fit on chips.
  const asRows = !!s.links?.some((l) => (l.note || '').length > 22);
  return (
    <section className="hub-sec" id={s.id}>
      <div className="hub-sec-head">
        <h2>{s.title}</h2>
        {count > 0 && <span className="num">{nf.format(count)}</span>}
      </div>
      {s.events && (
        <div className="compact hub-events">
          {s.events.map((e) => <EventCard key={e.id} event={toSummary(e)} view="compact" />)}
        </div>
      )}
      {s.links && (asRows ? (
        <ul className="hub-rows">
          {s.links.map((l) => (
            <li key={l.path}>
              <PageLink to={l.path}><span className="hr-name">{l.name}</span>{l.note && <span className="hr-note">{l.note}</span>}</PageLink>
            </li>
          ))}
        </ul>
      ) : (
        <div className="hub-chips">
          {s.links.map((l) => (
            <PageLink key={l.path} className="cty" to={l.path}>{l.name}{countOf(l.note) && <i>{countOf(l.note)}</i>}</PageLink>
          ))}
        </div>
      ))}
      {s.more && <p className="hub-more"><a href={s.more.path}>{s.more.name}</a>{s.more.note && ` (${s.more.note})`}</p>}
    </section>
  );
}

function Loading() {
  return (
    <div className="page-center">
      <div className="state-loading"><span className="spin dark" /><span className="label">Loading the catalog…</span></div>
    </div>
  );
}

function Missing({ failed }: { failed?: boolean }) {
  return (
    <div className="page-center">
      <div className="state-card">
        <div className="eyebrow">{failed ? 'Skipping' : 'Out of print'}</div>
        <h1>{failed ? 'The catalog did not load' : 'Page not found'}</h1>
        <p>{failed ? 'Check your connection and reload the page.' : 'Nothing in the catalog matches this link. Try the festivals, the artists or the map.'}</p>
        <Link className="btn btn-accent" to="/">Back to shows</Link>
      </div>
    </div>
  );
}

/** The numbers under the title: upcoming shows, places, next date. */
function HubFacts({ hub }: { hub: Hub }) {
  const cities = new Set(hub.upcoming.map((e) => cityNameOf(e)).filter(Boolean)).size;
  const next = hub.upcoming[0];
  const ed = hub.kind === 'festival' ? festivalEdition(hub) : null;
  const facts: [string, string][] = [];
  if (ed) {
    facts.push([dateSpan(ed.events), ed.upcoming ? 'Next edition' : 'Last edition']);
    facts.push([nf.format(ed.events.length), ed.events.length === 1 ? 'Show' : 'Shows']);
  } else {
    facts.push([nf.format(hub.upcoming.length), 'Upcoming']);
    if (hub.kind !== 'city' && cities > 1) facts.push([nf.format(cities), 'Cities']);
    if (next) facts.push([fmtShortDate(next.data_ora), 'Next show']);
  }
  return (
    <>
      <div className="hub-stats">
        {facts.map(([v, k]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}
      </div>
      {hub.festival?.website && (
        <div className="hub-actions">
          <a className="btn btn-ghost" href={hub.festival.website} target="_blank" rel="noopener">
            Official website <ExternalLink size={15} />
          </a>
        </div>
      )}
    </>
  );
}

function useScrollTop(key: string) {
  useEffect(() => { window.scrollTo(0, 0); }, [key]);
}

export function HubPage({ kind }: { kind: HubKind }) {
  const { slug = '' } = useParams<{ slug: string }>();
  const { catalog, failed } = useCatalog();
  const hub = catalog ? hubsOf(catalog, kind).get(slug.toLowerCase()) : undefined;
  const meta = useMemo(() => (catalog && hub ? hubMeta(catalog, hub, window.location.origin) : null), [catalog, hub]);
  usePageMeta(meta);
  useScrollTop(`${kind}/${slug}`);

  if (!catalog) return <Shell>{failed ? <Missing failed /> : <Loading />}</Shell>;
  if (!hub) return <Shell><Missing /></Shell>;
  return (
    <Shell>
      <Head copy={hubCopy(catalog, hub)}><HubFacts hub={hub} /></Head>
      {hubSections(catalog, hub).map((s) => <SectionView key={s.id} s={s} />)}
    </Shell>
  );
}

export function IndexPage({ kind }: { kind: IndexKind }) {
  const { catalog, failed } = useCatalog();
  const meta = useMemo(() => (catalog ? indexMeta(catalog, kind, window.location.origin) : null), [catalog, kind]);
  usePageMeta(meta);
  useScrollTop(kind);

  if (!catalog) return <Shell>{failed ? <Missing failed /> : <Loading />}</Shell>;
  const sections = indexSections(catalog, kind);
  return (
    <Shell>
      <Head copy={indexCopy(catalog, kind)}>
        {kind === 'artists' && (
          <nav className="letters" aria-label="Jump to letter">
            {sections.map((s) => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
          </nav>
        )}
      </Head>
      {sections.map((s) => <SectionView key={s.id} s={s} />)}
    </Shell>
  );
}

import { useState, useEffect, useMemo, type MouseEvent } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Event, EventSummary, EVENT_SUMMARY_COLUMNS } from '../types/event';
import { useEventMeta } from '../hooks/useDocumentMeta';
import { withUtm } from '../lib/outbound';
import { splitTitle, timeOf, fullDate } from '../utils/eventText';
import EventCard, { Sleeve } from './home/EventCard';
import Logo from './brand/Logo';
import { useCatalog } from '../hooks/useCatalog';
import { eventPath, parseEventParam, cityNameOf, countryNameOf, venueName } from '../lib/catalog';
import { eventRelated } from '../lib/seoHubs';

export default function EventDetailPage() {
  const { id: param } = useParams<{ id: string }>();
  // /event/<slug>-<id> (or an old bare /event/<id>): the id is what we look up.
  const id = param ? parseEventParam(param) : null;
  const navigate = useNavigate();
  const location = useLocation();
  const { catalog } = useCatalog();
  const [event, setEvent] = useState<Event | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) { window.scrollTo(0, 0); fetchEvent(id); }
    else setLoading(false);
  }, [id]);

  // Old or stale URL: show the current one (the edge function already 301s crawlers).
  useEffect(() => {
    if (event && location.pathname !== eventPath(event)) {
      navigate(eventPath(event) + location.search, { replace: true });
    }
  }, [event, location.pathname, location.search, navigate]);

  // Where the show belongs: artist, festival, city, country and genre pages.
  const related = useMemo(() => (catalog && event ? eventRelated(catalog, event) : null), [catalog, event]);

  // Keep title/meta/OG/JSON-LD in sync on client-side navigation (mirrors the edge SSR).
  useEventMeta(event);

  const fetchEvent = async (eventId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('eventi_prog').select('*').eq('id', eventId).maybeSingle();
      if (error) throw error;
      setEvent(data);

      if (data) {
        const { data: sameGenre } = await supabase
          .from('eventi_prog')
          .select(EVENT_SUMMARY_COLUMNS)
          .eq('sottogenere', data.sottogenere)
          .neq('id', eventId)
          .gte('data_ora', new Date().toISOString())
          .order('data_ora', { ascending: true })
          .limit(4)
          .overrideTypes<EventSummary[], { merge: false }>();
        setRelatedEvents(sameGenre || []);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  // "Back to shows": when the reader came from the list, step back in history
  // so the list returns as they left it (filters, cards, scroll). Otherwise,
  // or on a modified click (new tab), it is a plain link home.
  const backToList = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    try {
      const from = new URL(document.referrer);
      if (from.origin === window.location.origin && from.pathname === '/' && window.history.length > 1) {
        e.preventDefault();
        window.history.back();
      }
    } catch { /* no referrer: follow the link */ }
  };

  const handleShare = async () => {
    if (!event) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.nome_evento, text: `${event.nome_evento}, ${event.città}`, url: window.location.href });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bar = (
    <div className="detail-bar">
      <div className="detail-bar-inner">
        <Link className="linkbtn" to="/" onClick={backToList}>
          <ArrowLeft size={18} /> <span className="hide-mob">Back to shows</span>
        </Link>
        <Link className="brand" to="/" aria-label="ProgDealer home">
          <Logo height={30} />
        </Link>
        <button className="linkbtn" onClick={handleShare} disabled={!event}>
          <Share2 size={18} /> <span className="hide-mob">{copied ? 'Link copied' : 'Share'}</span>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="pd">
        {bar}
        <div className="page-center">
          <div className="state-loading"><span className="spin dark" /><span className="label">Loading show…</span></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="pd">
        {bar}
        <div className="page-center">
          <div className="state-card">
            <div className="eyebrow">Out of print</div>
            <h1>Show not found</h1>
            <p>This show may have been removed, or the link is wrong.</p>
            <Link className="btn btn-accent" to="/" onClick={backToList}>Back to shows</Link>
          </div>
        </div>
      </div>
    );
  }

  const genre = event.sottogenere || 'Progressive';
  const { main, sub } = splitTitle(event.nome_evento);
  const artistLink = (name: string) => related?.artists.find((a) => a.name.toLowerCase() === name.toLowerCase());
  const explore = related
    ? [related.festival, related.city, related.country, related.genre].filter((l): l is NonNullable<typeof l> => Boolean(l))
    : [];

  return (
    <div className="pd">
      {bar}

      <div className="detail-wrap">
        <div className="dt-top">
          <div className="dt-sleeve" aria-hidden="true">
            <div className="dt-vinyl"><span className="grooves" /><span className="lbl" /><span className="hole" /></div>
            <div className="dt-cover"><Sleeve event={event} /></div>
          </div>

          <div className="dt-head">
            {related && related.trail.length > 0 && (
              <nav className="crumbs" aria-label="Breadcrumb">
                <span><Link to="/">ProgDealer</Link><span aria-hidden="true"> ›</span></span>
                {related.trail.map((c, i) => (
                  <span key={c.path}><Link to={c.path}>{c.name}</Link>{i < related.trail.length - 1 && <span aria-hidden="true"> ›</span>}</span>
                ))}
              </nav>
            )}
            <div className="eyebrow">{genre} · Side A</div>
            <h1 className="detail-title">{main}</h1>
            {sub && <p className="dt-sub">{sub}</p>}
            <div className="dt-actions">
              {event.link && (
                // UTM tags and the referrer (origin only, see Referrer-Policy) credit ProgDealer.
                <a className="cta" href={withUtm(event.link)} target="_blank" rel="noopener">
                  Tickets &amp; info <ExternalLink size={16} />
                </a>
              )}
              <button className="btn btn-ghost" onClick={handleShare}><Share2 size={16} /> {copied ? 'Link copied' : 'Share'}</button>
            </div>
          </div>
        </div>

        <div className="dt-body">
          <div className="liner">
            <div className="liner-head eyebrow">Liner notes</div>
            <dl>
              <dt>Date</dt>
              <dd>{fullDate(event.data_ora)}</dd>
              <dt>Time</dt>
              <dd className="num">{timeOf(event.data_ora) ?? 'Not announced yet'}{event.orario && <small>{event.orario}</small>}</dd>
              <dt>Venue</dt>
              <dd>{venueName(event) || event.venue}</dd>
              <dt>City</dt>
              <dd>
                {related?.city ? <Link className="dt-link" to={related.city.path}>{cityNameOf(event)}</Link> : (cityNameOf(event) || event.città)}
                {countryNameOf(event) && (
                  <small>{related?.country ? <Link className="dt-link" to={related.country.path}>{countryNameOf(event)}</Link> : countryNameOf(event)}</small>
                )}
              </dd>
              <dt>Source</dt>
              <dd>{event.fonte}<small>{event.tipo_inserimento === 'manual' ? 'Submitted by a fan' : 'Collected automatically'}</small></dd>
            </dl>
          </div>

          <div>
            {event.descrizione && (
              <div className="detail-section">
                <h2>About the show</h2>
                <p>{event.descrizione}</p>
              </div>
            )}
            {event.artisti && event.artisti.length > 0 && (
              <div className="detail-section">
                <h2>Lineup</h2>
                <div className="lineup">
                  {event.artisti.map((artist, i) => {
                    const link = artistLink(artist);
                    return (
                      <span key={i}>
                        <i>{String(i + 1).padStart(2, '0')}</i>
                        {link ? <Link className="dt-link" to={link.path}>{artist}</Link> : artist}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {related && (related.moreDates.length > 0 || explore.length > 0) && (
          <div className="detail-related dt-more">
            {related.moreDates.length > 0 && (
              <>
                <div className="head">
                  <div>
                    <div className="eyebrow">On tour</div>
                    <h2>{related.moreDatesTitle}</h2>
                  </div>
                </div>
                <ul className="hub-rows">
                  {related.moreDates.map((d) => (
                    <li key={d.path}><Link to={d.path}><span className="hr-name">{d.name}</span>{d.note && <span className="hr-note">{d.note}</span>}</Link></li>
                  ))}
                </ul>
              </>
            )}
            {explore.length > 0 && (
              <div className="hub-chips dt-explore">
                <span className="label">Explore</span>
                {related.artists.slice(0, 4).map((a) => <Link key={a.path} className="cty" to={a.path}>{a.name}</Link>)}
                {explore.map((l) => <Link key={l.path} className="cty" to={l.path}>{l.name}</Link>)}
              </div>
            )}
          </div>
        )}

        {relatedEvents.length > 0 && (
          <div className="detail-related">
            <div className="head">
              <div>
                <div className="eyebrow">Also in the catalog</div>
                <h2>More {genre}</h2>
              </div>
            </div>
            <div className="rel-grid">
              {relatedEvents.map((r) => (
                <EventCard key={r.id} event={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

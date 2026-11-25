import { useState, useEffect, type MouseEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Event, EventSummary, EVENT_SUMMARY_COLUMNS } from '../types/event';
import { useEventMeta } from '../hooks/useDocumentMeta';
import { splitTitle, timeOf, fullDate } from '../utils/eventText';
import EventCard, { Sleeve } from './home/EventCard';
import Logo from './brand/Logo';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) fetchEvent(id);
  }, [id]);

  // Keep title/meta/OG/JSON-LD in sync on client-side navigation (mirrors the edge SSR).
  useEventMeta(event);

  const fetchEvent = async (eventId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('eventi_prog').select('*').eq('id', eventId).maybeSingle();
      if (error) throw error;
      setEvent(data);

      if (data) {
        const { data: related } = await supabase
          .from('eventi_prog')
          .select(EVENT_SUMMARY_COLUMNS)
          .eq('sottogenere', data.sottogenere)
          .neq('id', eventId)
          .gte('data_ora', new Date().toISOString())
          .order('data_ora', { ascending: true })
          .limit(4)
          .overrideTypes<EventSummary[], { merge: false }>();
        setRelatedEvents(related || []);
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
            <div className="eyebrow">{genre} · Side A</div>
            <h1 className="detail-title">{main}</h1>
            {sub && <p className="dt-sub">{sub}</p>}
            <div className="dt-actions">
              {event.link && (
                <a className="cta" href={event.link} target="_blank" rel="noopener noreferrer">
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
              <dd>{event.venue}</dd>
              <dt>City</dt>
              <dd>{event.città}</dd>
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
                  {event.artisti.map((artist, i) => <span key={i}><i>{String(i + 1).padStart(2, '0')}</i>{artist}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>

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

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MapPin, Calendar, Clock, Users, Music, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import { shouldUsePlaceholder } from '../utils/imageUtils';
import { useEventMeta } from '../hooks/useDocumentMeta';
import CardArt from './home/CardArt';
import EventCard, { hueFor, seedFor } from './home/EventCard';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#F5F4F2';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  useEffect(() => {
    if (id) fetchEvent(id);
  }, [id]);

  // Keep title/meta/OG/JSON-LD in sync on client-side navigation (mirrors the edge SSR).
  useEventMeta(event);

  const fetchEvent = async (eventId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('eventi_prog').select('*').eq('id', eventId).single();
      if (error) throw error;
      setEvent(data);

      if (data) {
        const { data: related } = await supabase
          .from('eventi_prog')
          .select('*')
          .eq('sottogenere', data.sottogenere)
          .neq('id', eventId)
          .gte('data_ora', new Date().toISOString())
          .order('data_ora', { ascending: true })
          .limit(3);
        setRelatedEvents(related || []);
      }
    } catch (err) {
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      full: date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  };

  const handleShare = async () => {
    if (navigator.share && event) {
      try {
        await navigator.share({ title: event.nome_evento, text: `${event.nome_evento} - ${event.città}`, url: window.location.href });
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="pd">
        <div className="loading" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sk" style={{ width: 120, height: 120, borderRadius: 20, marginBottom: 16 }} />
          <p className="label">Loading event…</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="pd">
        <div className="empty" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3>Event not found</h3>
          <button className="cta" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Back to shows</button>
        </div>
      </div>
    );
  }

  const dateInfo = formatDate(event.data_ora);
  const hasImage = !shouldUsePlaceholder(event.immagine);

  return (
    <div className="pd">
      {/* Back / share bar */}
      <div className="detail-bar">
        <div className="detail-bar-inner">
          <button className="linkbtn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to shows
          </button>
          <button className="linkbtn" onClick={handleShare}>
            <Share2 size={16} /> <span className="hide-mob">Share</span>
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="detail-hero">
        {hasImage ? (
          <img src={event.immagine} alt={event.nome_evento} />
        ) : (
          <CardArt hue={hueFor(event.sottogenere)} seed={seedFor(event.id)} />
        )}
      </div>

      <div className="detail-wrap">
        <div className="detail-head">
          <span className="detail-chip">{event.sottogenere || 'Progressive'}</span>
          <h1 className="detail-title">{event.nome_evento}</h1>
        </div>

        {/* Info */}
        <div className="info-grid">
          <div className="info-card">
            <Calendar size={19} />
            <div>
              <div className="k">Date</div>
              <div className="v">{dateInfo.full}</div>
            </div>
          </div>
          <div className="info-card">
            <Clock size={19} />
            <div>
              <div className="k">Time</div>
              <div className="v num">{dateInfo.time}{event.orario ? ` — ${event.orario}` : ''}</div>
            </div>
          </div>
          <div className="info-card">
            <MapPin size={19} />
            <div>
              <div className="k">Venue</div>
              <div className="v">{event.venue}</div>
              <div className="v2">{event.città}</div>
            </div>
          </div>
          <div className="info-card">
            <Music size={19} />
            <div>
              <div className="k">Source</div>
              <div className="v" style={{ textTransform: 'capitalize' }}>{event.fonte}</div>
              <div className="v2">{event.tipo_inserimento === 'manual' ? 'User submitted' : 'Auto-scraped'}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        {event.descrizione && (
          <div className="detail-section">
            <h2>Description</h2>
            <p>{event.descrizione}</p>
          </div>
        )}

        {/* Lineup */}
        {event.artisti && event.artisti.length > 0 && (
          <div className="detail-section">
            <h2><Users size={14} /> Lineup</h2>
            <div className="lineup">
              {event.artisti.map((artist, i) => <span key={i}>{artist}</span>)}
            </div>
          </div>
        )}

        {/* CTA */}
        {event.link && (
          <a className="cta" href={event.link} target="_blank" rel="noopener noreferrer">
            View event / tickets <ExternalLink size={16} />
          </a>
        )}

        {/* Related */}
        {relatedEvents.length > 0 && (
          <div className="detail-related">
            <h2>More {event.sottogenere} shows</h2>
            <div className="rel-grid">
              {relatedEvents.map((r) => (
                <EventCard key={r.id} event={r} onSelect={(e) => navigate(`/event/${e.id}`)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

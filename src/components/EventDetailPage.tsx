import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MapPin, Calendar, Clock, Users, Music, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import EventImage from './EventImage';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchEvent(id);
  }, [id]);

  const fetchEvent = async (eventId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eventi_prog')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);

      // Fetch related events (same subgenre, exclude current)
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
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubgenreChipClass = (sottogenere: string) => {
    const s = (sottogenere || 'Progressive').toLowerCase();
    if (s.includes('metal')) return 'chip-metal';
    if (s.includes('kraut')) return 'chip-kraut';
    if (s.includes('space')) return 'chip-space';
    if (s.includes('symphonic')) return 'chip-symphonic';
    if (s.includes('electronic')) return 'chip-electronic';
    if (s.includes('fusion')) return 'chip-fusion';
    if (s.includes('psychedelic')) return 'chip-psychedelic';
    if (s.includes('post')) return 'chip-post';
    if (s.includes('math')) return 'chip-math';
    if (s.includes('neo')) return 'chip-neo';
    if (s.includes('folk')) return 'chip-folk';
    if (s.includes('avant') || s.includes('rio')) return 'chip-avant';
    return 'chip-default';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      full: date.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      year: date.getFullYear()
    };
  };

  const handleShare = async () => {
    if (navigator.share && event) {
      try {
        await navigator.share({
          title: event.nome_evento,
          text: `${event.nome_evento} - ${event.città}`,
          url: window.location.href
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-coal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎸</div>
          <p className="text-gray-500 text-sm uppercase tracking-wide">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-coal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🎸</div>
          <p className="text-gray-400 text-xl font-industrial uppercase mb-4">Event not found</p>
          <button
            onClick={() => navigate('/')}
            className="text-neon-green hover:underline text-sm uppercase tracking-wide"
          >
            Back to events
          </button>
        </div>
      </div>
    );
  }

  const dateInfo = formatDate(event.data_ora);
  const chipClass = getSubgenreChipClass(event.sottogenere);

  return (
    <div className="min-h-screen bg-coal-900">
      {/* Back button bar */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-coal-900/80 border-b border-asphalt-600/20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-neon-green transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-gray-400 hover:text-neon-green transition-colors text-sm"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Hero image */}
      <div className="relative h-56 sm:h-72 lg:h-80 overflow-hidden">
        <EventImage
          src={event.immagine}
          alt={event.nome_evento}
          className="w-full h-full object-cover"
          placeholderClassName="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coal-900 via-coal-900/40 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 pb-16">
        {/* Title area */}
        <div className="mb-8">
          <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider mb-3 ${chipClass}`}>
            {event.sottogenere}
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-industrial text-white leading-tight mb-4">
            {event.nome_evento}
          </h1>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <div className="flex items-start gap-3 bg-coal-700/30 border border-asphalt-600/30 rounded-xl p-4">
            <Calendar className="h-5 w-5 text-neon-green flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date</div>
              <div className="text-gray-200 font-medium">{dateInfo.full}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-coal-700/30 border border-asphalt-600/30 rounded-xl p-4">
            <Clock className="h-5 w-5 text-neon-green flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Time</div>
              <div className="text-gray-200 font-medium">{dateInfo.time}{event.orario ? ` - ${event.orario}` : ''}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-coal-700/30 border border-asphalt-600/30 rounded-xl p-4">
            <MapPin className="h-5 w-5 text-neon-green flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Venue</div>
              <div className="text-gray-200 font-medium">{event.venue}</div>
              <div className="text-gray-400 text-sm">{event.città}</div>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-coal-700/30 border border-asphalt-600/30 rounded-xl p-4">
            <Music className="h-5 w-5 text-neon-green flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Source</div>
              <div className="text-gray-200 font-medium capitalize">{event.fonte}</div>
              <div className="text-gray-500 text-xs uppercase">{event.tipo_inserimento === 'manual' ? 'User submitted' : 'Auto-scraped'}</div>
            </div>
          </div>
        </div>

        {/* Description */}
        {event.descrizione && (
          <div className="mb-8">
            <h2 className="text-sm font-industrial text-gray-400 uppercase tracking-wider mb-3">Description</h2>
            <p className="text-gray-300 leading-relaxed">{event.descrizione}</p>
          </div>
        )}

        {/* Artists */}
        {event.artisti && event.artisti.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-industrial text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Lineup
            </h2>
            <div className="flex flex-wrap gap-2">
              {event.artisti.map((artist, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-coal-700/50 border border-asphalt-600/30 rounded-lg text-sm text-gray-300 font-medium"
                >
                  {artist}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {event.link && (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/30 hover:border-neon-green/50 text-neon-green px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-200"
          >
            <span>View Event / Tickets</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        {/* Related Events */}
        {relatedEvents.length > 0 && (
          <div className="mt-16">
            <h2 className="text-sm font-industrial text-gray-400 uppercase tracking-wider mb-4">
              More {event.sottogenere} Events
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedEvents.map((related) => {
                const relDateInfo = formatDate(related.data_ora);
                return (
                  <div
                    key={related.id}
                    onClick={() => navigate(`/event/${related.id}`)}
                    className="event-card cursor-pointer bg-coal-700/30 border border-asphalt-600/30 rounded-xl overflow-hidden group"
                  >
                    <div className="relative h-32 overflow-hidden">
                      <EventImage
                        src={related.immagine}
                        alt={related.nome_evento}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        placeholderClassName="w-full h-full"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 border border-white/10">
                        <div className="text-sm font-bold text-white leading-none">{relDateInfo.day}</div>
                        <div className="text-[9px] text-gray-300 uppercase">{relDateInfo.month}</div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-coal-700/90 to-transparent"></div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-gray-200 line-clamp-1 group-hover:text-neon-green transition-colors">
                        {related.nome_evento}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {related.città}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

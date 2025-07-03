import React from 'react';
import { Calendar, MapPin, Music, ExternalLink, Globe, User, AlertTriangle } from 'lucide-react';
import { Event } from '../types/event';

interface EventListProps {
  events: Event[];
  loading: boolean;
}

export default function EventList({ events, loading }: EventListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-coal-800 border-2 border-asphalt-600 p-4 animate-pulse">
            <div className="flex space-x-4">
              <div className="w-24 h-16 bg-asphalt-700"></div>
              <div className="flex-1">
                <div className="h-6 bg-asphalt-700 mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-asphalt-700 w-3/4"></div>
                  <div className="h-3 bg-asphalt-700 w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-8xl mb-8">🎸</div>
        <p className="text-gray-400 text-3xl font-industrial uppercase tracking-wide">
          NO EVENTS FOUND
        </p>
        <div className="w-24 h-1 bg-burgundy-600 mx-auto mt-6"></div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUserSubmitted = (fonte: string) => {
    const lowerFonte = fonte.toLowerCase();
    return lowerFonte.includes('segnalazione') || lowerFonte.includes('segnalato');
  };

  const getSourceBadge = (fonte: string) => {
    if (isUserSubmitted(fonte)) {
      return {
        label: 'SEGNALATO',
        icon: AlertTriangle,
        bgColor: 'bg-yellow-900',
        textColor: 'text-yellow-300',
        borderColor: 'border-yellow-600'
      };
    } else {
      return {
        label: 'SCRAPED',
        icon: Globe,
        bgColor: 'bg-industrial-green-900',
        textColor: 'text-industrial-green-300',
        borderColor: 'border-industrial-green-600'
      };
    }
  };

  const getGenreIcon = (genere: string) => {
    const genre = genere.toLowerCase();
    if (genre.includes('techno') || genre.includes('house')) return '🔊';
    if (genre.includes('trance')) return '🌀';
    if (genre.includes('drum') || genre.includes('bass')) return '🥁';
    if (genre.includes('dubstep') || genre.includes('electro')) return '⚡';
    return '🎵';
  };

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const sourceBadge = getSourceBadge(event.fonte);
        const SourceIcon = sourceBadge.icon;
        
        return (
          <div
            key={event.id}
            className="bg-coal-800 border-2 border-asphalt-600 p-4 hover:border-industrial-green-600 transition-all duration-300 group"
          >
            {/* Mobile Layout */}
            <div className="block md:hidden">
              {/* Thumbnail */}
              <div className="w-full h-20 bg-asphalt-700 border border-asphalt-500 flex items-center justify-center text-3xl mb-4 relative overflow-hidden">
                {(event as any).copertina || (event as any).immagine ? (
                  <img 
                    src={(event as any).copertina || (event as any).immagine} 
                    alt={event.nome_evento}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <span className="text-4xl">🎸</span>
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <span className="text-white text-xs font-condensed font-bold uppercase tracking-wider opacity-60">
                        PROGDEALER
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 pr-4">
                  <h3 className="text-xl font-industrial text-gray-100 mb-2 tracking-wide uppercase group-hover:text-industrial-green-400 transition-colors leading-tight">
                    {event.nome_evento}
                  </h3>
                  <div className="w-12 h-0.5 bg-burgundy-600 group-hover:bg-industrial-green-600 transition-colors"></div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-condensed font-bold ${sourceBadge.bgColor} ${sourceBadge.textColor} border ${sourceBadge.borderColor} uppercase tracking-wide`}>
                  <SourceIcon className="h-3 w-3 mr-1" />
                  {sourceBadge.label}
                </span>
              </div>
              
              {/* Event Details */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center text-gray-300 font-condensed text-sm">
                  <span className="text-lg mr-3">📅</span>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">DATE</span>
                    <span>{formatDate(event.data_ora)}</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-300 font-condensed text-sm">
                  <span className="text-lg mr-3">🏙️</span>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">LOCATION</span>
                    <span>{event.luogo}</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-300 font-condensed text-sm">
                  <span className="text-lg mr-3">{getGenreIcon(event.genere)}</span>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">GENRE</span>
                    <span className="uppercase">{event.genere}</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-300 font-condensed text-sm">
                  <span className="text-lg mr-3">📍</span>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">VENUE</span>
                    <span>{event.venue}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block">
              <div className="flex space-x-6">
                {/* Thumbnail */}
                <div className="w-24 h-16 bg-asphalt-700 border border-asphalt-500 flex items-center justify-center text-2xl flex-shrink-0 relative overflow-hidden">
                  {(event as any).copertina || (event as any).immagine ? (
                    <img 
                      src={(event as any).copertina || (event as any).immagine} 
                      alt={event.nome_evento}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <span className="text-2xl">🎸</span>
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <span className="text-white text-xs font-condensed font-bold uppercase tracking-wider opacity-60">
                          PROGDEALER
                        </span>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-industrial text-gray-100 mb-2 tracking-wide uppercase group-hover:text-industrial-green-400 transition-colors leading-tight">
                        {event.nome_evento}
                      </h3>
                      <div className="w-12 h-0.5 bg-burgundy-600 group-hover:bg-industrial-green-600 transition-colors"></div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 text-xs font-condensed font-bold ${sourceBadge.bgColor} ${sourceBadge.textColor} border ${sourceBadge.borderColor} uppercase tracking-wide`}>
                      <SourceIcon className="h-3 w-3 mr-2" />
                      {sourceBadge.label}
                    </span>
                  </div>
                  
                  {/* Event Details Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center text-gray-300 font-condensed text-sm">
                      <span className="text-lg mr-3">📅</span>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500 block">DATE</span>
                        <span>{formatDate(event.data_ora)}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300 font-condensed text-sm">
                      <span className="text-lg mr-3">🏙️</span>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500 block">LOCATION</span>
                        <span>{event.luogo}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300 font-condensed text-sm">
                      <span className="text-lg mr-3">{getGenreIcon(event.genere)}</span>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500 block">GENRE</span>
                        <span className="uppercase">{event.genere}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300 font-condensed text-sm">
                      <span className="text-lg mr-3">📍</span>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500 block">VENUE</span>
                        <span>{event.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Ticket Link */}
            {event.link_biglietti && (
              <div className="mt-4 pt-4 border-t border-asphalt-600">
                <a
                  href={event.link_biglietti}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="industrial-button inline-flex items-center text-sm"
                >
                  <span className="text-base mr-2">🎫</span>
                  <ExternalLink className="h-3 w-3 mr-2" />
                  GET TICKETS
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
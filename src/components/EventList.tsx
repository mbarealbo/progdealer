import React from 'react';
import { Calendar, MapPin, Music, ExternalLink, Globe, User, AlertTriangle, Clock, Users } from 'lucide-react';
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

  const getSourceBadge = (fonte: string, tipo_inserimento: string) => {
    if (tipo_inserimento === 'manual') {
      return {
        label: 'SCRAPED',
        icon: () => <span className="text-sm">🤖</span>,
        bgColor: 'bg-yellow-900',
        textColor: 'text-yellow-300',
        borderColor: 'border-yellow-600'
      };
    } else {
      return {
        label: 'SCRAPED',
        icon: () => <span className="text-sm">🤖</span>,
        bgColor: 'bg-industrial-green-900',
        textColor: 'text-white',
        borderColor: 'border-industrial-green-600'
      };
    }
  };

  const getSubgenreIcon = (sottogenere: string) => {
    const subgenre = (sottogenere || 'Progressive').toLowerCase();
    if (subgenre.includes('metal')) return '🤘';
    if (subgenre.includes('kraut')) return '🇩🇪';
    if (subgenre.includes('space')) return '🚀';
    if (subgenre.includes('symphonic')) return '🎼';
    if (subgenre.includes('electronic')) return '🔊';
    if (subgenre.includes('fusion')) return '🎺';
    if (subgenre.includes('psychedelic')) return '🌀';
    if (subgenre.includes('post')) return '📡';
    if (subgenre.includes('math')) return '🔢';
    return '🎵';
  };

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const sourceBadge = getSourceBadge(event.fonte, event.tipo_inserimento);
        const SourceIcon = sourceBadge.icon;
        
        return (
          <div
            key={event.id}
            className="bg-coal-800 border-2 border-asphalt-600 p-3 hover:border-industrial-green-600 transition-all duration-300 group"
          >
            {/* Mobile Layout */}
            <div className="block md:hidden">
              {/* Thumbnail */}
              <div className="w-full h-16 bg-asphalt-700 border border-asphalt-500 flex items-center justify-center text-2xl mb-3 relative overflow-hidden">
                {event.immagine ? (
                  <img 
                    src={event.immagine} 
                    alt={event.nome_evento}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <span className="text-3xl">🎸</span>
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <span className="text-white text-xs font-condensed font-bold uppercase tracking-wider opacity-60">
                        PROGDEALER
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-3">
                  <h3 className="text-lg font-industrial text-gray-100 mb-1 tracking-wide uppercase group-hover:text-industrial-green-400 transition-colors leading-tight">
                    {event.nome_evento}
                  </h3>
                  <div className="w-8 h-0.5 bg-burgundy-600 group-hover:bg-industrial-green-600 transition-colors"></div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-condensed font-bold ${sourceBadge.bgColor} ${sourceBadge.textColor} border ${sourceBadge.borderColor} uppercase tracking-wide`}>
                  <SourceIcon />
                  {sourceBadge.label}
                </span>
              </div>
              
              {/* Event Details */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center text-gray-300 font-condensed text-sm">
                  <span className="text-base mr-2">📅</span>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">DATE</span>
                    <span>{formatDate(event.data_ora)}</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-300 font-condensed text-sm">
                  <span className="text-base mr-2">🏙️</span>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">CITY</span>
                    <span>{event.città}</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-300 font-condensed text-sm">
                  <span className="text-base mr-2">{getSubgenreIcon(event.sottogenere)}</span>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">SUBGENRE</span>
                    <span className="uppercase">{event.sottogenere}</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-300 font-condensed text-sm">
                  <span className="text-base mr-2">📍</span>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">VENUE</span>
                    <span>{event.venue}</span>
                  </div>
                </div>
                {event.artisti && event.artisti.length > 0 && (
                  <div className="flex items-center text-gray-300 font-condensed text-sm">
                    <span className="text-base mr-2">👥</span>
                    <div>
                      <span className="text-xs uppercase tracking-wide text-gray-500 block">ARTISTS</span>
                      <span>{event.artisti?.join(', ') || 'N/A'}</span>
                    </div>
                  </div>
                )}
                {event.orario && (
                  <div className="flex items-center text-gray-300 font-condensed text-sm">
                    <span className="text-base mr-2">⏰</span>
                    <div>
                      <span className="text-xs uppercase tracking-wide text-gray-500 block">TIME</span>
                      <span>{event.orario}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block">
              <div className="flex space-x-4">
                {/* Thumbnail */}
                <div className="w-20 h-14 bg-asphalt-700 border border-asphalt-500 flex items-center justify-center text-xl flex-shrink-0 relative overflow-hidden">
                  {event.immagine ? (
                    <img 
                      src={event.immagine} 
                      alt={event.nome_evento}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <span className="text-xl">🎸</span>
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
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-industrial text-gray-100 mb-1 tracking-wide uppercase group-hover:text-industrial-green-400 transition-colors leading-tight">
                        {event.nome_evento}
                      </h3>
                      <div className="w-8 h-0.5 bg-burgundy-600 group-hover:bg-industrial-green-600 transition-colors"></div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-condensed font-bold ${sourceBadge.bgColor} ${sourceBadge.textColor} border ${sourceBadge.borderColor} uppercase tracking-wide`}>
                      <SourceIcon className="h-3 w-3 mr-1" />
                      {sourceBadge.label}
                    </span>
                  </div>
                  
                  {/* Event Details Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-2">
                    <div className="flex items-center text-gray-300 font-condensed text-sm">
                      <span className="text-base mr-2">📅</span>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500 block">DATE</span>
                        <span className="text-xs">{formatDate(event.data_ora)}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300 font-condensed text-sm">
                      <span className="text-base mr-2">🏙️</span>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500 block">CITY</span>
                        <span className="text-xs">{event.città}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300 font-condensed text-sm">
                      <span className="text-base mr-2">{getSubgenreIcon(event.sottogenere)}</span>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500 block">SUBGENRE</span>
                        <span className="bg-industrial-green-600 text-white px-2 py-1 text-xs font-bold uppercase tracking-wide">{event.sottogenere}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-300 font-condensed text-sm">
                      <span className="text-base mr-2">📍</span>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500 block">VENUE</span>
                        <span className="text-xs">{event.venue}</span>
                      </div>
                    </div>
                    {event.artisti && event.artisti.length > 0 && (
                      <div className="flex items-center text-gray-300 font-condensed text-sm">
                        <span className="text-base mr-2">👥</span>
                        <div>
                          <span className="text-xs uppercase tracking-wide text-gray-500 block">ARTISTS</span>
                          <span className="text-xs">
                            {event.artisti && event.artisti.length > 0 
                              ? `${event.artisti.slice(0, 2).join(', ')}${event.artisti.length > 2 ? '...' : ''}` 
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {event.descrizione && (
                    <p className="text-gray-400 text-xs font-condensed mb-2 line-clamp-2">
                      {event.descrizione}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Link */}
            {event.link && (
              <div className="mt-3 pt-3 border-t border-asphalt-600">
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="industrial-button inline-flex items-center text-sm"
                >
                  <span className="text-base mr-2">🎫</span>
                  <ExternalLink className="h-3 w-3 mr-2" />
                  VIEW EVENT
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
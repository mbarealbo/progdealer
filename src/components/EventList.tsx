import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Music, ExternalLink, Globe, User, AlertTriangle, Clock, Users, ChevronDown, Loader2 } from 'lucide-react';
import { Event } from '../types/event';

interface EventListProps {
  events: Event[];
  loading: boolean;
}

const EVENTS_PER_PAGE = 15;

export default function EventList({ events, loading }: EventListProps) {
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Reset pagination when events change
  useEffect(() => {
    setCurrentPage(1);
    setDisplayedEvents(events.slice(0, EVENTS_PER_PAGE));
    setHasMore(events.length > EVENTS_PER_PAGE);
  }, [events]);

  // Load more events function
  const loadMoreEvents = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = (nextPage - 1) * EVENTS_PER_PAGE;
      const endIndex = startIndex + EVENTS_PER_PAGE;
      const newEvents = events.slice(0, endIndex);
      
      setDisplayedEvents(newEvents);
      setCurrentPage(nextPage);
      setHasMore(endIndex < events.length);
      setIsLoadingMore(false);
    }, 500);
  }, [currentPage, events, isLoadingMore, hasMore]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000 // Load when 1000px from bottom
      ) {
        loadMoreEvents();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreEvents]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-coal-800 border-2 border-asphalt-600 p-4 animate-pulse">
            <div className="flex space-x-4">
              <div className="w-32 h-24 bg-asphalt-700"></div>
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
    const date = new Date(dateString);
    return {
      day: date.toLocaleDateString('it-IT', { day: 'numeric' }),
      month: date.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase(),
      year: date.getFullYear(),
      time: date.toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getSourceBadge = (fonte: string, tipo_inserimento: string) => {
    if (tipo_inserimento === 'manual') {
      return {
        label: 'MANUAL',
        icon: () => <span className="text-sm">👤</span>,
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
    <div className="space-y-4">
      {displayedEvents.map((event) => {
        const sourceBadge = getSourceBadge(event.fonte, event.tipo_inserimento);
        const SourceIcon = sourceBadge.icon;
        const dateInfo = formatDate(event.data_ora);
        
        return (
          <div
            key={event.id}
            className="bg-coal-800 border-2 border-asphalt-600 p-4 hover:border-industrial-green-600 transition-all duration-300 group"
          >
            {/* Mobile Layout */}
            <div className="block md:hidden">
              <div className="flex space-x-4">
                {/* Larger Image */}
                <div className="w-20 h-20 bg-asphalt-700 border border-asphalt-500 flex items-center justify-center text-2xl flex-shrink-0 relative overflow-hidden">
                  {event.immagine ? (
                    <img 
                      src={event.immagine} 
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
                
                <div className="flex-1 min-w-0">
                  {/* Header with Source Badge */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 pr-2">
                      <h3 className="text-lg font-industrial text-gray-100 mb-1 tracking-wide uppercase group-hover:text-industrial-green-400 transition-colors leading-tight">
                        {event.nome_evento}
                      </h3>
                      <div className="w-8 h-0.5 bg-burgundy-600 group-hover:bg-industrial-green-600 transition-colors"></div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-condensed font-bold ${sourceBadge.bgColor} ${sourceBadge.textColor} border ${sourceBadge.borderColor} uppercase tracking-wide flex-shrink-0`}>
                      <SourceIcon />
                      {sourceBadge.label}
                    </span>
                  </div>

                  {/* Prominent Date */}
                  <div className="mb-3 p-2 bg-industrial-green-900 border border-industrial-green-600">
                    <div className="text-center">
                      <div className="text-xl font-industrial text-white leading-none">
                        {dateInfo.day}
                      </div>
                      <div className="text-sm font-condensed text-industrial-green-300 uppercase tracking-wide">
                        {dateInfo.month} {dateInfo.year}
                      </div>
                      <div className="text-xs text-industrial-green-400 font-condensed">
                        {dateInfo.time}
                      </div>
                    </div>
                  </div>

                  {/* Location Group */}
                  <div className="mb-2 p-2 bg-asphalt-700 border border-asphalt-500">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 uppercase tracking-wide block">CITY</span>
                        <span className="text-gray-300 font-condensed font-bold">{event.città}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase tracking-wide block">VENUE</span>
                        <span className="text-gray-300 font-condensed font-bold">{event.venue}</span>
                      </div>
                    </div>
                  </div>

                  {/* Other Details */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center text-gray-300 font-condensed">
                      <span className="text-base mr-2">{getSubgenreIcon(event.sottogenere)}</span>
                      <span className="bg-industrial-green-600 text-white px-2 py-1 font-bold uppercase tracking-wide">
                        {event.sottogenere}
                      </span>
                    </div>
                    
                    {event.artisti && event.artisti.length > 0 && (
                      <div className="flex items-center text-gray-300 font-condensed">
                        <span className="text-base mr-2">👥</span>
                        <span>{event.artisti?.join(', ') || 'N/A'}</span>
                      </div>
                    )}
                    
                    {event.orario && (
                      <div className="flex items-center text-gray-300 font-condensed">
                        <span className="text-base mr-2">⏰</span>
                        <span>{event.orario}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:block">
              <div className="flex space-x-6">
                {/* Larger Image */}
                <div className="w-32 h-24 bg-asphalt-700 border border-asphalt-500 flex items-center justify-center text-xl flex-shrink-0 relative overflow-hidden">
                  {event.immagine ? (
                    <img 
                      src={event.immagine} 
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

                {/* Prominent Date */}
                <div className="w-24 flex-shrink-0">
                  <div className="bg-industrial-green-900 border-2 border-industrial-green-600 p-3 text-center h-full flex flex-col justify-center">
                    <div className="text-2xl font-industrial text-white leading-none mb-1">
                      {dateInfo.day}
                    </div>
                    <div className="text-sm font-condensed text-industrial-green-300 uppercase tracking-wide mb-1">
                      {dateInfo.month}
                    </div>
                    <div className="text-xs text-industrial-green-400 font-condensed mb-1">
                      {dateInfo.year}
                    </div>
                    <div className="text-xs text-industrial-green-400 font-condensed">
                      {dateInfo.time}
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 pr-4">
                      <h3 className="text-2xl font-industrial text-gray-100 mb-2 tracking-wide uppercase group-hover:text-industrial-green-400 transition-colors leading-tight">
                        {event.nome_evento}
                      </h3>
                      <div className="w-12 h-0.5 bg-burgundy-600 group-hover:bg-industrial-green-600 transition-colors"></div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 text-sm font-condensed font-bold ${sourceBadge.bgColor} ${sourceBadge.textColor} border ${sourceBadge.borderColor} uppercase tracking-wide flex-shrink-0`}>
                      <SourceIcon />
                      {sourceBadge.label}
                    </span>
                  </div>
                  
                  {/* Location Group - Side by Side */}
                  <div className="mb-3 p-3 bg-asphalt-700 border border-asphalt-500">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center text-gray-300 font-condensed">
                        <span className="text-lg mr-3">🏙️</span>
                        <div>
                          <span className="text-xs uppercase tracking-wide text-gray-500 block">CITY</span>
                          <span className="text-sm font-bold">{event.città}</span>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-300 font-condensed">
                        <span className="text-lg mr-3">📍</span>
                        <div>
                          <span className="text-xs uppercase tracking-wide text-gray-500 block">VENUE</span>
                          <span className="text-sm font-bold">{event.venue}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-2">
                    <div className="flex items-center text-gray-300 font-condensed">
                      <span className="text-lg mr-3">{getSubgenreIcon(event.sottogenere)}</span>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-500 block">SUBGENRE</span>
                        <span className="bg-industrial-green-600 text-white px-2 py-1 text-xs font-bold uppercase tracking-wide">
                          {event.sottogenere}
                        </span>
                      </div>
                    </div>

                    {event.artisti && event.artisti.length > 0 && (
                      <div className="flex items-center text-gray-300 font-condensed">
                        <span className="text-lg mr-3">👥</span>
                        <div>
                          <span className="text-xs uppercase tracking-wide text-gray-500 block">ARTISTS</span>
                          <span className="text-sm">
                            {event.artisti && event.artisti.length > 0 
                              ? `${event.artisti.slice(0, 2).join(', ')}${event.artisti.length > 2 ? '...' : ''}` 
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    )}

                    {event.orario && (
                      <div className="flex items-center text-gray-300 font-condensed">
                        <span className="text-lg mr-3">⏰</span>
                        <div>
                          <span className="text-xs uppercase tracking-wide text-gray-500 block">TIME INFO</span>
                          <span className="text-sm">{event.orario}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {event.descrizione && (
                    <p className="text-gray-400 text-sm font-condensed mb-2 line-clamp-2">
                      {event.descrizione}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Link */}
            {event.link && (
              <div className="mt-4 pt-3 border-t border-asphalt-600">
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

      {/* Load More Button */}
      {hasMore && !isLoadingMore && (
        <div className="text-center py-8">
          <button
            onClick={loadMoreEvents}
            className="industrial-button flex items-center space-x-3 mx-auto text-lg px-6 py-3"
          >
            <ChevronDown className="h-5 w-5" />
            <span>LOAD MORE EVENTS</span>
            <span className="bg-industrial-green-600 text-white px-2 py-1 text-sm font-bold rounded">
              {Math.min(EVENTS_PER_PAGE, events.length - displayedEvents.length)}
            </span>
          </button>
        </div>
      )}

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="text-center py-8">
          <div className="flex items-center justify-center space-x-3 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="font-condensed font-bold uppercase tracking-wide text-lg">
              LOADING MORE EVENTS...
            </span>
          </div>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && displayedEvents.length > 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 font-condensed font-bold uppercase tracking-wide">
            🎸 END OF EVENTS 🎸
          </div>
          <div className="w-24 h-1 bg-burgundy-600 mx-auto mt-4"></div>
        </div>
      )}

      {/* Pagination Info */}
      <div className="text-center py-4 text-gray-500 font-condensed text-sm uppercase tracking-wide">
        SHOWING {displayedEvents.length} OF {events.length} EVENTS
      </div>
    </div>
  );
}
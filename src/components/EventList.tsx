import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Loader2, ChevronDown, Calendar } from 'lucide-react';
import { Event } from '../types/event';
import EventImage from './EventImage';

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

  // Group events by month and year for separators
  const groupEventsByMonth = (eventsList: Event[]) => {
    const grouped: { [key: string]: Event[] } = {};
    
    eventsList.forEach(event => {
      const date = new Date(event.data_ora);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(event);
    });
    
    return grouped;
  };

  // Format month/year for display
  const formatMonthYear = (monthYearKey: string) => {
    const [year, month] = monthYearKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      month: date.toLocaleDateString('en-US', { month: 'long' }).toUpperCase(),
      year: year
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-coal-800 border border-asphalt-600 p-6 animate-pulse">
            <div className="flex space-x-6">
              <div className="w-40 h-32 bg-asphalt-700 rounded"></div>
              <div className="flex-1">
                <div className="h-8 bg-asphalt-700 mb-4 rounded"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-asphalt-700 w-3/4 rounded"></div>
                  <div className="h-4 bg-asphalt-700 w-1/2 rounded"></div>
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
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      year: date.getFullYear(),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    };
  };

  const getSourceBadge = (fonte: string, tipo_inserimento: string) => {
    if (tipo_inserimento === 'manual') {
      return {
        label: 'MANUAL',
        emoji: '👤',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-800',
        borderColor: 'border-amber-300'
      };
    } else {
      return {
        label: 'SCRAPED',
        emoji: '🤖',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-300'
      };
    }
  };

  const getSubgenreColor = (sottogenere: string) => {
    const subgenre = (sottogenere || 'Progressive').toLowerCase();
    
    if (subgenre.includes('metal')) return 'bg-red-600 text-white';
    if (subgenre.includes('kraut')) return 'bg-orange-600 text-white';
    if (subgenre.includes('space')) return 'bg-purple-600 text-white';
    if (subgenre.includes('symphonic')) return 'bg-blue-600 text-white';
    if (subgenre.includes('electronic')) return 'bg-cyan-600 text-white';
    if (subgenre.includes('fusion')) return 'bg-yellow-600 text-black';
    if (subgenre.includes('psychedelic')) return 'bg-pink-600 text-white';
    if (subgenre.includes('post')) return 'bg-gray-600 text-white';
    if (subgenre.includes('math')) return 'bg-indigo-600 text-white';
    
    return 'bg-industrial-green-600 text-white';
  };

  // Group displayed events by month/year
  const groupedEvents = groupEventsByMonth(displayedEvents);
  const sortedMonthYears = Object.keys(groupedEvents).sort();

  return (
    <div className="space-y-6">
      {sortedMonthYears.map((monthYearKey) => {
        const { month, year } = formatMonthYear(monthYearKey);
        const monthEvents = groupedEvents[monthYearKey];

        return (
          <div key={monthYearKey} className="space-y-6">
            {/* Month/Year Separator */}
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-4 bg-coal-800 border-2 border-asphalt-600 px-8 py-4">
                <Calendar className="h-6 w-6 text-industrial-green-600" />
                <div className="text-center">
                  <div className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
                    {month}
                  </div>
                  <div className="text-lg font-condensed text-gray-400 uppercase tracking-wide">
                    {year}
                  </div>
                </div>
                <Calendar className="h-6 w-6 text-industrial-green-600" />
              </div>
            </div>

            {/* Events for this month */}
            {monthEvents.map((event) => {
              const sourceBadge = getSourceBadge(event.fonte, event.tipo_inserimento);
              const dateInfo = formatDate(event.data_ora);
              const subgenreColor = getSubgenreColor(event.sottogenere);
              
              return (
                <div
                  key={event.id}
                  id={`event-${event.id}`}
                  className="bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-20 rounded-lg shadow-lg hover:bg-opacity-15 hover:border-opacity-30 transition-all duration-300 overflow-hidden"
                >
                  {/* Mobile Layout */}
                  <div className="block md:hidden p-6">
                    <div className="flex space-x-4 mb-4">
                      {/* Event Image */}
                      <div className="w-24 h-24 bg-black bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-white border-opacity-10">
                        <EventImage
                          src={event.immagine}
                          alt={event.nome_evento}
                          className="w-full h-full object-cover rounded-lg"
                          placeholderClassName="w-full h-full rounded-lg"
                        />
                      </div>
                      
                      {/* Date Card */}
                      <div className="bg-white bg-opacity-15 backdrop-blur-sm border border-white border-opacity-20 rounded-lg p-3 text-center min-w-[80px]">
                        <div className="text-2xl font-bold text-gray-100 leading-none">
                          {dateInfo.day}
                        </div>
                        <div className="text-sm font-medium text-gray-300 uppercase tracking-wide">
                          {dateInfo.month}
                        </div>
                        <div className="text-xs text-gray-400">
                          {dateInfo.year}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {dateInfo.time}
                        </div>
                      </div>
                    </div>

                    {/* Event Title */}
                    <h3 className="text-xl font-bold text-gray-100 mb-3 leading-tight">
                      {event.nome_evento}
                    </h3>

                    {/* Description */}
                    {event.descrizione && (
                      <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                        {event.descrizione}
                      </p>
                    )}

                    {/* City & Venue */}
                    <div className="flex items-center space-x-4 mb-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">📍</span>
                        <span className="font-medium text-gray-100">{event.città}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">🏢</span>
                        <span className="text-gray-200">{event.venue}</span>
                      </div>
                    </div>

                    {/* Subgenre Tag */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${subgenreColor}`}>
                        {event.sottogenere}
                      </span>
                      
                      {/* Source Badge */}
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${sourceBadge.bgColor} ${sourceBadge.textColor} border ${sourceBadge.borderColor}`}>
                        <span className="mr-1">{sourceBadge.emoji}</span>
                        {sourceBadge.label}
                      </span>
                    </div>

                    {/* Additional Info */}
                    {(event.artisti?.length || event.orario) && (
                      <div className="space-y-2 mb-4 text-sm">
                        {event.artisti && event.artisti.length > 0 && (
                          <div className="flex items-start space-x-2">
                            <span className="text-gray-400 mt-0.5">👥</span>
                            <span className="text-gray-200">{event.artisti.join(', ')}</span>
                          </div>
                        )}
                        {event.orario && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">⏰</span>
                            <span className="text-gray-200">{event.orario}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Event Link */}
                    {event.link && (
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 bg-industrial-green-600 hover:bg-industrial-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        <span>🎫</span>
                        <span>VIEW EVENT</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:block p-6">
                    <div className="flex space-x-6">
                      {/* Event Image */}
                      <div className="w-40 h-32 bg-black bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-white border-opacity-10">
                        <EventImage
                          src={event.immagine}
                          alt={event.nome_evento}
                          className="w-full h-full object-cover rounded-lg"
                          placeholderClassName="w-full h-full rounded-lg"
                        />
                      </div>

                      {/* Date Card */}
                      <div className="bg-white bg-opacity-15 backdrop-blur-sm border border-white border-opacity-20 rounded-lg p-4 text-center min-w-[100px] h-fit">
                        <div className="text-3xl font-bold text-gray-100 leading-none mb-1">
                          {dateInfo.day}
                        </div>
                        <div className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-1">
                          {dateInfo.month}
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                          {dateInfo.year}
                        </div>
                        <div className="text-xs text-gray-400">
                          {dateInfo.time}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header with Source Badge */}
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-2xl font-bold text-gray-100 leading-tight pr-4">
                            {event.nome_evento}
                          </h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${sourceBadge.bgColor} ${sourceBadge.textColor} border ${sourceBadge.borderColor} flex-shrink-0`}>
                            <span className="mr-1">{sourceBadge.emoji}</span>
                            {sourceBadge.label}
                          </span>
                        </div>

                        {/* Description */}
                        {event.descrizione && (
                          <p className="text-gray-300 mb-4 leading-relaxed">
                            {event.descrizione}
                          </p>
                        )}
                        
                        {/* City & Venue - Side by Side */}
                        <div className="flex items-center space-x-8 mb-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">📍</span>
                            <div>
                              <span className="text-xs text-gray-500 uppercase tracking-wide block">CITY</span>
                              <span className="font-medium text-gray-100">{event.città}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">🏢</span>
                            <div>
                              <span className="text-xs text-gray-500 uppercase tracking-wide block">VENUE</span>
                              <span className="text-gray-200">{event.venue}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: Subgenre, Artists, Time, Link */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6">
                            {/* Subgenre Tag */}
                            <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide ${subgenreColor}`}>
                              {event.sottogenere}
                            </span>

                            {/* Artists */}
                            {event.artisti && event.artisti.length > 0 && (
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-400">👥</span>
                                <span className="text-gray-200">
                                  {event.artisti.slice(0, 3).join(', ')}
                                  {event.artisti.length > 3 ? '...' : ''}
                                </span>
                              </div>
                            )}

                            {/* Time Info */}
                            {event.orario && (
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-400">⏰</span>
                                <span className="text-gray-200">{event.orario}</span>
                              </div>
                            )}
                          </div>

                          {/* Event Link */}
                          {event.link && (
                            <a
                              href={event.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 bg-industrial-green-600 hover:bg-industrial-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                            >
                              <span>🎫</span>
                              <span>VIEW EVENT</span>
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Load More Button */}
      {hasMore && !isLoadingMore && (
        <div className="text-center py-8">
          <button
            onClick={loadMoreEvents}
            className="inline-flex items-center space-x-3 bg-coal-800 hover:bg-coal-700 border-2 border-asphalt-600 hover:border-industrial-green-600 text-white px-8 py-4 transition-all duration-200 font-condensed font-bold uppercase tracking-wide text-lg"
          >
            <ChevronDown className="h-6 w-6" />
            <span>LOAD MORE EVENTS</span>
            <span className="bg-industrial-green-600 text-white px-3 py-1 text-sm font-bold rounded">
              {Math.min(EVENTS_PER_PAGE, events.length - displayedEvents.length)}
            </span>
          </button>
          <p className="text-gray-500 font-condensed text-sm uppercase tracking-wide mt-4">
            SHOWING {displayedEvents.length} OF {events.length} EVENTS
          </p>
        </div>
      )}

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="text-center py-8">
          <div className="flex items-center justify-center space-x-3 text-gray-400 mb-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="font-condensed font-bold uppercase tracking-wide text-lg">
              LOADING MORE EVENTS...
            </span>
          </div>
          <div className="w-32 h-1 bg-industrial-green-600 mx-auto animate-pulse"></div>
        </div>
      )}

      {/* End of Results */}
      {!hasMore && displayedEvents.length > 0 && (
        <div className="text-center py-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="w-16 h-1 bg-burgundy-600"></div>
            <div className="text-gray-500 font-condensed font-bold uppercase tracking-wide text-lg">
              🎸 ALL EVENTS LOADED 🎸
            </div>
            <div className="w-16 h-1 bg-burgundy-600"></div>
          </div>
          <p className="text-gray-500 font-condensed text-sm uppercase tracking-wide">
            TOTAL: {events.length} EVENTS
          </p>
        </div>
      )}
    </div>
  );
}
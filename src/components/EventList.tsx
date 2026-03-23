import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, Loader2, ChevronDown, Calendar, MapPin, Clock, Grid3X3, List, LayoutList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Event } from '../types/event';
import EventImage from './EventImage';

export type ViewMode = 'grid' | 'list' | 'compact';

interface EventListProps {
  events: Event[];
  loading: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

const EVENTS_PER_PAGE = 18;

export default function EventList({ events, loading, viewMode = 'grid', onViewModeChange }: EventListProps) {
  const [displayedEvents, setDisplayedEvents] = useState<Event[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentPage(1);
    const perPage = viewMode === 'compact' ? 30 : EVENTS_PER_PAGE;
    setDisplayedEvents(events.slice(0, perPage));
    setHasMore(events.length > perPage);
  }, [events, viewMode]);

  const loadMoreEvents = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const perPage = viewMode === 'compact' ? 30 : EVENTS_PER_PAGE;

    setTimeout(() => {
      const nextPage = currentPage + 1;
      const endIndex = nextPage * perPage;
      setDisplayedEvents(events.slice(0, endIndex));
      setCurrentPage(nextPage);
      setHasMore(endIndex < events.length);
      setIsLoadingMore(false);
    }, 300);
  }, [currentPage, events, isLoadingMore, hasMore, viewMode]);

  const groupEventsByMonth = (eventsList: Event[]) => {
    const grouped: { [key: string]: Event[] } = {};
    eventsList.forEach(event => {
      const date = new Date(event.data_ora);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthYear]) grouped[monthYear] = [];
      grouped[monthYear].push(event);
    });
    return grouped;
  };

  const formatMonthYear = (monthYearKey: string) => {
    const [year, month] = monthYearKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      month: date.toLocaleDateString('en-US', { month: 'long' }).toUpperCase(),
      year
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      year: date.getFullYear(),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    };
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

  const isHappeningSoon = (dateString: string) => {
    const eventDate = new Date(dateString);
    const now = new Date();
    const diffDays = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  };

  // --- View mode toggle ---
  const ViewToggle = () => (
    <div className="flex items-center gap-1 bg-coal-700/30 border border-asphalt-600/30 rounded-lg p-0.5">
      {[
        { mode: 'grid' as ViewMode, icon: Grid3X3, label: 'Grid' },
        { mode: 'list' as ViewMode, icon: LayoutList, label: 'List' },
        { mode: 'compact' as ViewMode, icon: List, label: 'Compact' },
      ].map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => onViewModeChange?.(mode)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            viewMode === mode
              ? 'bg-neon-green/10 text-neon-green border border-neon-green/20'
              : 'text-gray-500 hover:text-gray-300 border border-transparent'
          }`}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );

  // --- Skeletons ---
  if (loading) {
    return (
      <div>
        <div className="flex justify-end mb-4"><ViewToggle /></div>
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-2'
        }>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-coal-700/30 border border-asphalt-600/30 rounded-xl animate-pulse overflow-hidden">
              {viewMode === 'grid' ? (
                <>
                  <div className="h-44 bg-asphalt-700/30"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-asphalt-700/30 rounded w-3/4"></div>
                    <div className="h-4 bg-asphalt-700/30 rounded w-1/2"></div>
                  </div>
                </>
              ) : (
                <div className="p-3 flex items-center gap-3">
                  <div className="w-12 h-12 bg-asphalt-700/30 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-asphalt-700/30 rounded w-2/3"></div>
                    <div className="h-3 bg-asphalt-700/30 rounded w-1/3"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-7xl mb-6">🎸</div>
        <p className="text-gray-400 text-2xl font-industrial uppercase tracking-wide">NO EVENTS FOUND</p>
        <div className="w-20 h-0.5 bg-neon-green mx-auto mt-4 opacity-50"></div>
      </div>
    );
  }

  const groupedEvents = groupEventsByMonth(displayedEvents);
  const sortedMonthYears = Object.keys(groupedEvents).sort();

  // --- Month separator ---
  const MonthSeparator = ({ monthYearKey }: { monthYearKey: string }) => {
    const { month, year } = formatMonthYear(monthYearKey);
    return (
      <div className="flex items-center gap-3 mb-4 mt-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-asphalt-600/50 to-transparent"></div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-coal-700/30 border border-asphalt-600/30 rounded-full">
          <Calendar className="h-3.5 w-3.5 text-neon-green" />
          <span className="text-xs font-industrial text-gray-300 tracking-wide">{month} {year}</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-asphalt-600/50 to-transparent"></div>
      </div>
    );
  };

  // --- GRID CARD ---
  const GridCard = ({ event }: { event: Event }) => {
    const dateInfo = formatDate(event.data_ora);
    const chipClass = getSubgenreChipClass(event.sottogenere);
    const soon = isHappeningSoon(event.data_ora);

    return (
      <div
        id={`event-${event.id}`}
        onClick={() => navigate(`/event/${event.id}`)}
        className={`event-card cursor-pointer bg-coal-700/30 border border-asphalt-600/40 rounded-xl overflow-hidden group ${soon ? 'happening-soon' : ''}`}
      >
        <div className="relative h-44 overflow-hidden">
          <EventImage
            src={event.immagine}
            alt={event.nome_evento}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            placeholderClassName="w-full h-full"
          />
          <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10">
            <div className="text-lg font-bold text-white leading-none">{dateInfo.day}</div>
            <div className="text-[10px] font-medium text-gray-300 uppercase tracking-wider">{dateInfo.month}</div>
          </div>
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${chipClass}`}>
              {event.sottogenere}
            </span>
          </div>
          {soon && (
            <div className="absolute bottom-3 left-3 bg-neon-green/90 text-black px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">SOON</div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-coal-700/90 to-transparent"></div>
        </div>
        <div className="p-4">
          <h3 className="text-base font-bold text-gray-100 leading-snug mb-2 line-clamp-2 group-hover:text-neon-green transition-colors duration-200">
            {event.nome_evento}
          </h3>
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{event.città}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{dateInfo.time} - {event.venue}</span>
            </div>
          </div>
          {event.artisti && event.artisti.length > 0 && (
            <div className="text-xs text-gray-500 truncate">
              {event.artisti.slice(0, 3).join(' / ')}
              {event.artisti.length > 3 && ` +${event.artisti.length - 3}`}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- LIST CARD ---
  const ListCard = ({ event }: { event: Event }) => {
    const dateInfo = formatDate(event.data_ora);
    const chipClass = getSubgenreChipClass(event.sottogenere);
    const soon = isHappeningSoon(event.data_ora);

    return (
      <div
        id={`event-${event.id}`}
        onClick={() => navigate(`/event/${event.id}`)}
        className={`event-card cursor-pointer bg-coal-700/20 border border-asphalt-600/30 rounded-xl overflow-hidden group ${soon ? 'happening-soon' : ''}`}
      >
        <div className="flex items-center p-3 gap-4">
          {/* Image thumbnail */}
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-asphalt-600/20">
            <EventImage
              src={event.immagine}
              alt={event.nome_evento}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              placeholderClassName="w-full h-full"
            />
          </div>

          {/* Date block */}
          <div className="text-center flex-shrink-0 w-12">
            <div className="text-lg font-bold text-gray-200 leading-none">{dateInfo.day}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{dateInfo.month}</div>
            <div className="text-[10px] text-gray-600">{dateInfo.time}</div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-gray-100 leading-snug line-clamp-1 group-hover:text-neon-green transition-colors">
                {event.nome_evento}
              </h3>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${chipClass}`}>
                {event.sottogenere}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {event.città}
              </span>
              <span className="truncate hidden sm:inline">{event.venue}</span>
            </div>
            {event.artisti && event.artisti.length > 0 && (
              <div className="text-[11px] text-gray-600 mt-1 truncate">
                {event.artisti.slice(0, 4).join(', ')}
                {event.artisti.length > 4 && ` +${event.artisti.length - 4}`}
              </div>
            )}
          </div>

          {/* Link */}
          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 p-2 text-gray-600 hover:text-neon-green transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    );
  };

  // --- COMPACT ROW ---
  const CompactRow = ({ event }: { event: Event }) => {
    const dateInfo = formatDate(event.data_ora);
    const soon = isHappeningSoon(event.data_ora);

    return (
      <div
        id={`event-${event.id}`}
        onClick={() => navigate(`/event/${event.id}`)}
        className={`cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-coal-700/30 transition-all group ${
          soon ? 'bg-neon-green/5 border-l-2 border-neon-green/40' : 'border-l-2 border-transparent'
        }`}
      >
        <span className="text-xs text-gray-600 font-mono w-10 flex-shrink-0 text-right">
          {dateInfo.day}/{dateInfo.month}
        </span>
        <span className="text-xs text-gray-600 w-10 flex-shrink-0">{dateInfo.time}</span>
        <span className="text-sm text-gray-200 font-medium truncate flex-1 group-hover:text-neon-green transition-colors">
          {event.nome_evento}
        </span>
        <span className="text-xs text-gray-500 truncate hidden sm:block max-w-[150px]">
          {event.città}
        </span>
        <span className="text-[9px] text-gray-600 uppercase tracking-wider hidden md:block w-24 text-right truncate">
          {event.sottogenere}
        </span>
        {event.link && (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-700 hover:text-neon-green transition-colors flex-shrink-0"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  };

  // --- Render ---
  return (
    <div>
      {/* View toggle */}
      <div className="flex justify-end mb-4">
        <ViewToggle />
      </div>

      <div className="space-y-6">
        {sortedMonthYears.map((monthYearKey) => {
          const monthEvents = groupedEvents[monthYearKey];

          return (
            <div key={monthYearKey}>
              <MonthSeparator monthYearKey={monthYearKey} />

              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {monthEvents.map((event) => <GridCard key={event.id} event={event} />)}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="space-y-2">
                  {monthEvents.map((event) => <ListCard key={event.id} event={event} />)}
                </div>
              )}

              {viewMode === 'compact' && (
                <div className="bg-coal-700/10 border border-asphalt-600/20 rounded-xl divide-y divide-asphalt-600/10 overflow-hidden">
                  {monthEvents.map((event) => <CompactRow key={event.id} event={event} />)}
                </div>
              )}
            </div>
          );
        })}

        {/* Load More */}
        {hasMore && !isLoadingMore && (
          <div className="text-center py-6">
            <button
              onClick={loadMoreEvents}
              className="inline-flex items-center gap-2 bg-coal-700/30 hover:bg-coal-600/30 border border-asphalt-600/30 hover:border-neon-green/20 text-gray-400 hover:text-white px-6 py-2.5 rounded-xl transition-all text-sm font-medium"
            >
              <ChevronDown className="h-4 w-4" />
              Load more
              <span className="text-xs text-gray-600">
                ({displayedEvents.length}/{events.length})
              </span>
            </button>
          </div>
        )}

        {isLoadingMore && (
          <div className="text-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-neon-green mx-auto" />
          </div>
        )}

        {!hasMore && displayedEvents.length > 0 && (
          <div className="text-center py-6">
            <span className="text-xs text-gray-600 uppercase tracking-wide">
              All {events.length} events loaded
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

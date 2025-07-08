import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Music, MapPin, Building, Users } from 'lucide-react';
import { Event } from '../types/event';

interface SearchSuggestion {
  type: 'event' | 'venue' | 'city' | 'artist';
  value: string;
  event?: Event;
  icon: React.ReactNode;
  label: string;
}

interface SearchInputProps {
  events: Event[];
  onSearch: (query: string) => void;
  onSelectEvent?: (event: Event) => void;
  className?: string;
}

export default function SearchInput({ 
  events, 
  onSearch, 
  onSelectEvent,
  className = "" 
}: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isActive, setIsActive] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Generate suggestions based on query
  const generateSuggestions = (searchQuery: string): SearchSuggestion[] => {
    if (searchQuery.length < 2) return [];

    const normalizedQuery = searchQuery.toLowerCase().trim();
    const suggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();

    // Helper function to check if text matches query
    const matches = (text: string) => 
      text.toLowerCase().includes(normalizedQuery);

    // Search through events
    events.forEach(event => {
      // Event title matches
      if (matches(event.nome_evento)) {
        const key = `event:${event.nome_evento}`;
        if (!seen.has(key)) {
          suggestions.push({
            type: 'event',
            value: event.nome_evento,
            event,
            icon: <Music className="h-4 w-4" />,
            label: event.nome_evento
          });
          seen.add(key);
        }
      }

      // Venue matches
      if (matches(event.venue)) {
        const key = `venue:${event.venue}`;
        if (!seen.has(key)) {
          suggestions.push({
            type: 'venue',
            value: event.venue,
            event,
            icon: <Building className="h-4 w-4" />,
            label: `${event.venue} • ${event.città}`
          });
          seen.add(key);
        }
      }

      // City matches
      if (matches(event.città)) {
        const key = `city:${event.città}`;
        if (!seen.has(key)) {
          suggestions.push({
            type: 'city',
            value: event.città,
            event,
            icon: <MapPin className="h-4 w-4" />,
            label: event.città
          });
          seen.add(key);
        }
      }

      // Artist matches
      if (event.artisti && event.artisti.length > 0) {
        event.artisti.forEach(artist => {
          if (matches(artist)) {
            const key = `artist:${artist}`;
            if (!seen.has(key)) {
              suggestions.push({
                type: 'artist',
                value: artist,
                event,
                icon: <Users className="h-4 w-4" />,
                label: `${artist} • ${event.nome_evento}`
              });
              seen.add(key);
            }
          }
        });
      }
    });

    // Sort suggestions by relevance
    return suggestions
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.value.toLowerCase() === normalizedQuery;
        const bExact = b.value.toLowerCase() === normalizedQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Then prioritize starts with
        const aStarts = a.value.toLowerCase().startsWith(normalizedQuery);
        const bStarts = b.value.toLowerCase().startsWith(normalizedQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Then by type priority (events first, then venues, cities, artists)
        const typePriority = { event: 0, venue: 1, city: 2, artist: 3 };
        const aPriority = typePriority[a.type];
        const bPriority = typePriority[b.type];
        if (aPriority !== bPriority) return aPriority - bPriority;

        // Finally alphabetically
        return a.value.localeCompare(b.value);
      })
      .slice(0, 8); // Limit to 8 suggestions
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce suggestion generation
    debounceRef.current = setTimeout(() => {
      const newSuggestions = generateSuggestions(newQuery);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0 && newQuery.length >= 2);
      setSelectedIndex(-1);
    }, 150);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    let searchTerm = '';
    
    switch (suggestion.type) {
      case 'event':
        searchTerm = suggestion.value;
        if (onSelectEvent && suggestion.event) {
          onSelectEvent(suggestion.event);
        }
        break;
      case 'venue':
        searchTerm = `venue:${suggestion.value}`;
        break;
      case 'city':
        searchTerm = `city:${suggestion.value}`;
        break;
      case 'artist':
        searchTerm = `artist:${suggestion.value}`;
        break;
    }

    setQuery(searchTerm);
    onSearch(searchTerm);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        onSearch(query);
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          onSearch(query);
          setShowSuggestions(false);
          inputRef.current?.blur();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle focus and blur
  const handleFocus = () => {
    setIsActive(true);
    if (suggestions.length > 0 && query.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setIsActive(false);
      }
    }, 150);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    onSearch('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Submit search
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Get type badge styling
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'event':
        return { bg: 'bg-industrial-green-600', text: 'text-white', label: 'EVENT' };
      case 'venue':
        return { bg: 'bg-blue-600', text: 'text-white', label: 'VENUE' };
      case 'city':
        return { bg: 'bg-purple-600', text: 'text-white', label: 'CITY' };
      case 'artist':
        return { bg: 'bg-orange-600', text: 'text-white', label: 'ARTIST' };
      default:
        return { bg: 'bg-gray-600', text: 'text-white', label: 'ITEM' };
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative transition-all duration-200 ${
          isActive ? 'transform scale-105' : ''
        }`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`w-full bg-coal-800 border-2 text-gray-100 pl-10 pr-10 py-2 font-condensed focus:outline-none transition-all duration-200 text-sm ${
              isActive 
                ? 'border-industrial-green-600 bg-coal-700' 
                : 'border-asphalt-600 hover:border-asphalt-500'
            }`}
            placeholder="SEARCH EVENTS, VENUES, CITIES, ARTISTS..."
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-coal-800 border-2 border-asphalt-600 max-h-80 overflow-y-auto shadow-xl"
        >
          {suggestions.map((suggestion, index) => {
            const typeBadge = getTypeBadge(suggestion.type);
            return (
              <button
                key={`${suggestion.type}-${suggestion.value}-${index}`}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-4 py-3 font-condensed text-sm transition-all duration-150 border-b border-asphalt-600 last:border-b-0 ${
                  index === selectedIndex
                    ? 'bg-industrial-green-900 text-white border-l-4 border-industrial-green-600'
                    : 'text-gray-300 hover:bg-asphalt-700 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="text-gray-400 flex-shrink-0">
                      {suggestion.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold uppercase tracking-wide text-white truncate">
                        {suggestion.label}
                      </div>
                      {suggestion.event && suggestion.type !== 'event' && (
                        <div className="text-xs text-gray-400 uppercase tracking-wide mt-1 truncate">
                          {new Date(suggestion.event.data_ora).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })} • {suggestion.event.sottogenere}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-bold ${typeBadge.bg} ${typeBadge.text} uppercase tracking-wide flex-shrink-0 ml-2`}>
                    {typeBadge.label}
                  </span>
                </div>
              </button>
            );
          })}
          
          {/* Search all results footer */}
          <div className="px-4 py-2 bg-asphalt-700 border-t border-asphalt-600">
            <button
              type="button"
              onClick={() => {
                onSearch(query);
                setShowSuggestions(false);
                inputRef.current?.blur();
              }}
              className="text-xs text-gray-400 hover:text-white font-condensed uppercase tracking-wide transition-colors duration-200"
            >
              🔍 SEARCH ALL RESULTS FOR "{query}"
            </button>
          </div>
        </div>
      )}

      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && query.length >= 2 && (
        <div className="absolute z-40 w-full mt-1 bg-coal-800 border-2 border-asphalt-600 px-4 py-3">
          <div className="text-gray-400 font-condensed text-sm uppercase tracking-wide text-center">
            NO SUGGESTIONS FOUND
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { EventFilters } from '../types/event';

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  uniqueLocations: string[];
  uniqueGenres: string[];
}

const PROG_SUBGENRES = [
  'Symphonic',
  'Canterbury',
  'Zeuhl',
  'Avant-Prog',
  'Krautrock',
  'Italian Prog',
  'Neo-Prog',
  'Prog Metal',
  'Post Prog'
];

export default function EventFiltersComponent({
  filters,
  onFiltersChange,
  uniqueLocations,
  uniqueGenres
}: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [excludedGenres, setExcludedGenres] = useState<string[]>([]);

  const handleFilterChange = (key: keyof EventFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const toggleGenreExclusion = (genre: string) => {
    const newExcludedGenres = excludedGenres.includes(genre) 
      ? excludedGenres.filter(g => g !== genre)
      : [...excludedGenres, genre];
    
    setExcludedGenres(newExcludedGenres);
    
    // Update filters with excluded genres
    onFiltersChange({
      ...filters,
      excludedGenres: newExcludedGenres
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      luogo: '',
      genere: '',
      dataInizio: '',
      dataFine: '',
      excludedGenres: []
    });
    setExcludedGenres([]);
  };

  // Sync excludedGenres with filters
  useEffect(() => {
    if (filters.excludedGenres) {
      setExcludedGenres(filters.excludedGenres);
    }
  }, [filters.excludedGenres]);

  const hasActiveFilters = Object.values(filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter !== ''
  );

  return (
    <div className="mb-8">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 industrial-button mb-6"
      >
        <span className="text-xl">🎚️</span>
        <span className="text-lg font-industrial tracking-wide uppercase">
          FILTERS
        </span>
        {hasActiveFilters && (
          <span className="bg-industrial-green-600 text-white px-2 py-1 text-xs font-bold">
            {Object.values(filters).filter(f => 
              Array.isArray(f) ? f.length > 0 : f !== ''
            ).length}
          </span>
        )}
      </button>

      {/* Collapsible Filter Panel */}
      {isOpen && (
        <div className="bg-coal-800 border-2 border-asphalt-600 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
              FILTER EVENTS
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="industrial-button flex items-center text-sm"
              >
                <X className="h-4 w-4 mr-2" />
                CLEAR ALL
              </button>
            )}
          </div>
          
          <div className="space-y-8">
            {/* Progressive Rock Subgenres */}
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-400 mb-4 uppercase tracking-wide">
                🎵 PROGRESSIVE SUBGENRES
              </label>
              <div className="flex flex-wrap gap-3">
                {PROG_SUBGENRES.map((genre) => {
                  const isExcluded = excludedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => toggleGenreExclusion(genre)}
                      className={`
                        px-4 py-2 text-sm font-condensed font-bold uppercase tracking-wide
                        border-2 transition-all duration-200 flex items-center space-x-2
                        ${isExcluded 
                          ? 'bg-asphalt-700 border-asphalt-500 text-gray-400 line-through' 
                          : 'bg-industrial-green-900 border-industrial-green-600 text-white hover:bg-industrial-green-800'
                        }
                      `}
                    >
                      <span>{genre}</span>
                      {isExcluded && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3 font-condensed uppercase tracking-wide">
                Click to exclude subgenres from results
              </p>
            </div>

            {/* Location and Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-4 uppercase tracking-wide">
                  🏙️ LOCATION
                </label>
                <select
                  value={filters.luogo}
                  onChange={(e) => handleFilterChange('luogo', e.target.value)}
                  className="brutal-input w-full"
                >
                  <option value="">ALL LOCATIONS</option>
                  {uniqueLocations.map((location) => (
                    <option key={location} value={location}>
                      {location.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-4 uppercase tracking-wide">
                  📅 FROM DATE
                </label>
                <input
                  type="date"
                  value={filters.dataInizio}
                  onChange={(e) => handleFilterChange('dataInizio', e.target.value)}
                  className="brutal-input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-4 uppercase tracking-wide">
                  📅 TO DATE
                </label>
                <input
                  type="date"
                  value={filters.dataFine}
                  onChange={(e) => handleFilterChange('dataFine', e.target.value)}
                  className="brutal-input w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { EventFilters, PROG_SUBGENRES } from '../types/event';

interface EventFiltersProps {
  filters: EventFilters;
  searchQuery?: string;
  onFiltersChange: (filters: EventFilters) => void;
  uniqueLocations: string[];
  uniqueCountries: string[];
}

export default function EventFiltersComponent({
  filters,
  searchQuery = '',
  onFiltersChange,
  uniqueLocations,
  uniqueCountries
}: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: keyof EventFilters, value: string | string[]) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };


  const clearFilters = () => {
    onFiltersChange({
      country: '',
      city: '',
      subgenre: '',
      dateRange: { start: '', end: '' },
      excludedSubgenres: [],
      searchQuery: ''
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key === 'dateRange' ? (value as any).start !== '' || (value as any).end !== '' :
    Array.isArray(value) ? value.length > 0 : 
    value !== ''
  );

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    key === 'dateRange' ? (value as any).start !== '' || (value as any).end !== '' :
    Array.isArray(value) ? value.length > 0 : 
    value !== ''
  ).length + (searchQuery.trim() ? 1 : 0);

  return (
    <div className="mb-8">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 industrial-button mb-6"
      >
        <span className="text-lg">🎚️</span>
        <span className="text-lg font-industrial tracking-wide uppercase">
          FILTERS
        </span>
        {hasActiveFilters && (
          <span className="bg-industrial-green-600 text-white px-2 py-1 text-xs font-bold rounded">
            {activeFilterCount}{searchQuery.trim() ? ' + SEARCH' : ''}
          </span>
        )}
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Collapsible Filter Panel */}
      {isOpen && (
        <div className="bg-coal-800 border-2 border-asphalt-600 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-industrial text-gray-100 tracking-wide uppercase">
              FILTER EVENTS
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="industrial-button flex items-center text-sm"
                title={searchQuery.trim() ? 'Clear filters (search will remain active)' : 'Clear all filters'}
              >
                <X className="h-4 w-4 mr-2" />
                CLEAR FILTERS
              </button>
            )}
            {searchQuery.trim() && (
              <div className="text-sm text-gray-400 font-condensed uppercase tracking-wide">
                🔍 SEARCH: "{searchQuery}"
              </div>
            )}
          </div>
          
          <div className="space-y-6">

            {/* Location, Date, and Source Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-3 uppercase tracking-wide">
                  🌍 COUNTRY
                </label>
                <select
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  className="brutal-input w-full text-sm"
                >
                  <option value="">ALL COUNTRIES</option>
                  {uniqueCountries.map((country) => (
                    <option key={country} value={country}>
                      {country.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-3 uppercase tracking-wide">
                  🏙️ CITY
                </label>
                <select
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="brutal-input w-full text-sm"
                >
                  <option value="">ALL CITIES</option>
                  {uniqueLocations.map((location) => (
                    <option key={location} value={location}>
                      {location.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-3 uppercase tracking-wide">
                  🎵 SUBGENRE
                </label>
                <select
                  value={filters.subgenre}
                  onChange={(e) => handleFilterChange('subgenre', e.target.value)}
                  className="brutal-input w-full text-sm"
                >
                  <option value="">ALL SUBGENRES</option>
                  {PROG_SUBGENRES.map((subgenre) => (
                    <option key={subgenre} value={subgenre}>
                      {subgenre.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-3 uppercase tracking-wide">
                  📅 FROM DATE
                </label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="brutal-input w-full text-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-3 uppercase tracking-wide">
                  📅 TO DATE
                </label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="brutal-input w-full text-sm"
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
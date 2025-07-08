import React, { useState, useEffect } from 'react';
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { EventFilters, PROG_SUBGENRES } from '../types/event';

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  uniqueLocations: string[];
  uniqueSources: string[];
}

export default function EventFiltersComponent({
  filters,
  onFiltersChange,
  uniqueLocations,
  uniqueSources
}: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: keyof EventFilters, value: string | string[]) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const toggleSubgenreExclusion = (subgenre: string) => {
    const newExcludedSubgenres = filters.excludedSubgenres.includes(subgenre) 
      ? filters.excludedSubgenres.filter(s => s !== subgenre)
      : [...filters.excludedSubgenres, subgenre];
    
    handleFilterChange('excludedSubgenres', newExcludedSubgenres);
  };

  const clearFilters = () => {
    onFiltersChange({
      città: '',
      sottogenere: '',
      dataInizio: '',
      dataFine: '',
      excludedSubgenres: [],
      fonte: '',
      tipo_inserimento: ''
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    Array.isArray(value) ? value.length > 0 : value !== ''
  );

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    Array.isArray(value) ? value.length > 0 : value !== ''
  ).length;

  return (
    <div className="mb-8">
      {/* Filter Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 industrial-button mb-6"
      >
        <Filter className="h-5 w-5" />
        <span className="text-lg font-industrial tracking-wide uppercase">
          FILTERS
        </span>
        {hasActiveFilters && (
          <span className="bg-industrial-green-600 text-white px-2 py-1 text-xs font-bold rounded">
            {activeFilterCount}
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
              >
                <X className="h-4 w-4 mr-2" />
                CLEAR ALL
              </button>
            )}
          </div>
          
          <div className="space-y-6">
            {/* Progressive Subgenres - Chip Interface */}
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-400 mb-4 uppercase tracking-wide">
                🎵 PROGRESSIVE SUBGENRES
              </label>
              <div className="flex flex-wrap gap-2">
                {PROG_SUBGENRES.map((subgenre) => {
                  const isExcluded = filters.excludedSubgenres.includes(subgenre);
                  return (
                    <button
                      key={subgenre}
                      onClick={() => toggleSubgenreExclusion(subgenre)}
                      className={`
                        px-3 py-1 text-xs font-condensed font-bold uppercase tracking-wide
                        border transition-all duration-200 flex items-center space-x-1
                        ${isExcluded 
                          ? 'bg-asphalt-700 border-asphalt-500 text-gray-500 line-through' 
                          : 'bg-industrial-green-600 border-industrial-green-600 text-white hover:bg-industrial-green-700'
                        }
                      `}
                    >
                      <span>{subgenre}</span>
                      {isExcluded && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2 font-condensed uppercase tracking-wide">
                Click to exclude subgenres • Active subgenres will be included in results
              </p>
            </div>

            {/* Location, Date, and Source Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-3 uppercase tracking-wide">
                  🏙️ CITY
                </label>
                <select
                  value={filters.città}
                  onChange={(e) => handleFilterChange('città', e.target.value)}
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
                  📅 FROM DATE
                </label>
                <input
                  type="date"
                  value={filters.dataInizio}
                  onChange={(e) => handleFilterChange('dataInizio', e.target.value)}
                  className="brutal-input w-full text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-3 uppercase tracking-wide">
                  📅 TO DATE
                </label>
                <input
                  type="date"
                  value={filters.dataFine}
                  onChange={(e) => handleFilterChange('dataFine', e.target.value)}
                  className="brutal-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-condensed font-bold text-gray-400 mb-3 uppercase tracking-wide">
                  🔗 SOURCE
                </label>
                <select
                  value={filters.fonte}
                  onChange={(e) => handleFilterChange('fonte', e.target.value)}
                  className="brutal-input w-full text-sm"
                >
                  <option value="">ALL SOURCES</option>
                  {uniqueSources.map((source) => (
                    <option key={source} value={source}>
                      {source.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-400 mb-3 uppercase tracking-wide">
                ⚙️ ENTRY TYPE
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleFilterChange('tipo_inserimento', filters.tipo_inserimento === 'scraped' ? '' : 'scraped')}
                  className={`px-4 py-2 text-sm font-condensed font-bold uppercase tracking-wide border transition-all duration-200 ${
                    filters.tipo_inserimento === 'scraped'
                      ? 'bg-industrial-green-900 border-industrial-green-600 text-white'
                      : 'bg-transparent border-asphalt-500 text-gray-400 hover:border-industrial-green-600'
                  }`}
                >
                  🤖 SCRAPED
                </button>
                <button
                  onClick={() => handleFilterChange('tipo_inserimento', filters.tipo_inserimento === 'manual' ? '' : 'manual')}
                  className={`px-4 py-2 text-sm font-condensed font-bold uppercase tracking-wide border transition-all duration-200 ${
                    filters.tipo_inserimento === 'manual'
                      ? 'bg-industrial-green-900 border-industrial-green-600 text-white'
                      : 'bg-transparent border-asphalt-500 text-gray-400 hover:border-industrial-green-600'
                  }`}
                >
                  👤 MANUAL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
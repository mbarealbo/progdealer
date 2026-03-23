import React, { useState } from 'react';
import { X, SlidersHorizontal, ChevronDown, Tag } from 'lucide-react';
import { EventFilters, PROG_SUBGENRES } from '../types/event';

interface EventFiltersProps {
  filters: EventFilters;
  searchQuery?: string;
  onFiltersChange: (filters: EventFilters) => void;
  uniqueLocations: string[];
  uniqueCountries: string[];
  eventCount?: number;
}

export default function EventFiltersComponent({
  filters,
  searchQuery = '',
  onFiltersChange,
  uniqueLocations,
  uniqueCountries,
  eventCount = 0
}: EventFiltersProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [showGenres, setShowGenres] = useState(false);

  const handleFilterChange = (key: keyof EventFilters, value: string | string[]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleSubgenreExclusion = (subgenre: string) => {
    const newExcluded = filters.excludedSubgenres.includes(subgenre)
      ? filters.excludedSubgenres.filter(s => s !== subgenre)
      : [...filters.excludedSubgenres, subgenre];
    handleFilterChange('excludedSubgenres', newExcluded);
  };

  const toggleCountrySelection = (country: string) => {
    const newCountries = filters.countries.includes(country)
      ? filters.countries.filter(c => c !== country)
      : [...filters.countries, country];
    handleFilterChange('countries', newCountries);
  };

  const clearFilters = () => {
    onFiltersChange({
      città: '',
      sottogenere: '',
      dataInizio: '',
      dataFine: '',
      excludedSubgenres: [],
      countries: [],
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([_, value]) =>
    Array.isArray(value) ? value.length > 0 : value !== ''
  );

  const activeFilterCount = Object.entries(filters).filter(([_, value]) =>
    Array.isArray(value) ? value.length > 0 : value !== ''
  ).length;

  return (
    <div className="mb-6">
      {/* Minimal top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">
            {eventCount} events
          </span>
          {searchQuery.trim() && (
            <span className="text-[11px] text-gray-600 px-2 py-0.5 bg-coal-700/30 rounded-full truncate max-w-[160px]">
              "{searchQuery}"
            </span>
          )}
          {/* Active filter pills */}
          {filters.excludedSubgenres.length > 0 && (
            <span className="text-[10px] text-amber-500/70 px-1.5 py-0.5 bg-amber-500/5 rounded-full">
              -{filters.excludedSubgenres.length} genres
            </span>
          )}
          {filters.countries.length > 0 && (
            <span className="text-[10px] text-neon-green/70 px-1.5 py-0.5 bg-neon-green/5 rounded-full hidden sm:inline">
              {filters.countries.length} countries
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] text-gray-600 hover:text-red-400 transition-colors px-1.5 py-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              showPanel || hasActiveFilters
                ? 'border-neon-green/20 text-neon-green bg-neon-green/5'
                : 'border-asphalt-600/30 text-gray-500 hover:text-gray-400'
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            {activeFilterCount > 0 && (
              <span className="bg-neon-green/15 text-neon-green text-[10px] px-1 rounded font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable filter panel */}
      {showPanel && (
        <div className="mt-3 p-3 bg-coal-700/20 border border-asphalt-600/20 rounded-xl space-y-3">
          {/* Row 1: City + Date range */}
          <div className="grid grid-cols-3 gap-2">
            <select
              value={filters.città}
              onChange={(e) => handleFilterChange('città', e.target.value)}
              className="bg-coal-800/80 border border-asphalt-600/30 text-gray-300 text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-neon-green/30"
            >
              <option value="">All cities</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.dataInizio}
              onChange={(e) => handleFilterChange('dataInizio', e.target.value)}
              className="bg-coal-800/80 border border-asphalt-600/30 text-gray-300 text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-neon-green/30"
              placeholder="From"
            />
            <input
              type="date"
              value={filters.dataFine}
              onChange={(e) => handleFilterChange('dataFine', e.target.value)}
              className="bg-coal-800/80 border border-asphalt-600/30 text-gray-300 text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-neon-green/30"
              placeholder="To"
            />
          </div>

          {/* Country pills */}
          {uniqueCountries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {uniqueCountries.map((country) => {
                const isSelected = filters.countries.includes(country);
                return (
                  <button
                    key={country}
                    onClick={() => toggleCountrySelection(country)}
                    className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-full border transition-all ${
                      isSelected
                        ? 'bg-neon-green/10 border-neon-green/30 text-neon-green'
                        : 'bg-transparent border-asphalt-600/20 text-gray-600 hover:text-gray-400 hover:border-asphalt-500/30'
                    }`}
                  >
                    {country}
                  </button>
                );
              })}
            </div>
          )}

          {/* Genre toggle */}
          <button
            onClick={() => setShowGenres(!showGenres)}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
          >
            <Tag className="h-3 w-3" />
            <span>Subgenres</span>
            {filters.excludedSubgenres.length > 0 && (
              <span className="text-amber-500/70">(-{filters.excludedSubgenres.length})</span>
            )}
            <ChevronDown className={`h-2.5 w-2.5 transition-transform ${showGenres ? 'rotate-180' : ''}`} />
          </button>

          {showGenres && (
            <div className="flex flex-wrap gap-1">
              {PROG_SUBGENRES.map((subgenre) => {
                const isExcluded = filters.excludedSubgenres.includes(subgenre);
                return (
                  <button
                    key={subgenre}
                    onClick={() => toggleSubgenreExclusion(subgenre)}
                    className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-full border transition-all ${
                      isExcluded
                        ? 'bg-transparent border-asphalt-600/20 text-gray-700 line-through'
                        : 'bg-coal-700/30 border-asphalt-600/20 text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {subgenre}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

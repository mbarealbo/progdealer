import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface NominatimResult {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
    country?: string;
    country_code?: string;
  };
  lat: string;
  lon: string;
}

interface CityData {
  city: string;
  region: string;
  country: string;
  displayName: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string, cityData?: CityData) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function CityAutocomplete({ 
  value, 
  onChange, 
  placeholder = "CITY", 
  className = "",
  required = false 
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchCitySuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
        {
          headers: {
            'User-Agent': 'ProgDealer/1.0 (https://progdealer.netlify.app)'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data: NominatimResult[] = await response.json();
      
      // Process results to extract city, region, and country
      const cityData: CityData[] = data
        .map(result => {
          const address = result.address;
          
          // Extract city name (prioritize city, then town, village, municipality)
          const city = address.city || address.town || address.village || address.municipality || '';
          
          // Extract region/state
          const region = address.state || address.region || address.county || '';
          
          // Extract country
          const country = address.country || '';
          
          // Create display name
          const parts = [city, region, country].filter(part => part.length > 0);
          const displayName = parts.join(', ');
          
          return {
            city,
            region,
            country,
            displayName
          };
        })
        .filter(item => item.city.length > 0) // Only include results with valid city names
        .filter((item, index, array) => 
          // Remove duplicates based on display name
          array.findIndex(other => other.displayName === item.displayName) === index
        )
        .slice(0, 5); // Limit to 5 suggestions

      setSuggestions(cityData);
      setShowSuggestions(cityData.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce API calls
    debounceRef.current = setTimeout(() => {
      fetchCitySuggestions(newValue);
    }, 300);
  };

  const handleSuggestionClick = (cityData: CityData) => {
    onChange(cityData.city, cityData);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

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
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  const handleFocus = () => {
    if (suggestions.length > 0 && value.length >= 3) {
      setShowSuggestions(true);
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          required={required}
          className={`w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 pr-10 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm ${className}`}
          placeholder={placeholder}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-coal-800 border-2 border-asphalt-600 max-h-60 overflow-y-auto shadow-lg"
        >
          {suggestions.map((cityData, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(cityData)}
              className={`w-full text-left px-3 py-3 font-condensed text-sm transition-colors duration-150 border-b border-asphalt-600 last:border-b-0 ${
                index === selectedIndex
                  ? 'bg-industrial-green-900 text-white border-l-4 border-industrial-green-600'
                  : 'text-gray-300 hover:bg-asphalt-700 hover:text-white'
              }`}
            >
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold uppercase tracking-wide text-white">
                    {cityData.city}
                  </div>
                  {(cityData.region || cityData.country) && (
                    <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">
                      {[cityData.region, cityData.country]
                        .filter(part => part.length > 0)
                        .join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading state when typing */}
      {isLoading && value.length >= 3 && (
        <div className="absolute z-40 w-full mt-1 bg-coal-800 border-2 border-asphalt-600 px-3 py-3">
          <div className="flex items-center space-x-2 text-gray-400 font-condensed text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="uppercase tracking-wide">SEARCHING CITIES...</span>
          </div>
        </div>
      )}
    </div>
  );
}
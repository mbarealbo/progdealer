import React, { useState, useEffect } from 'react';
import { Music, Database, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Event, EventFilters } from './types/event';
import EventList from './components/EventList';
import EventFiltersComponent from './components/EventFilters';
import AddEventForm from './components/AddEventForm';
import Footer from './components/Footer';

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>({
    luogo: '',
    genere: '',
    dataInizio: '',
    dataFine: '',
    excludedGenres: []
  });

  // Get unique values for filters
  const uniqueLocations = [...new Set(events.map(event => event.luogo))].sort();
  const uniqueGenres = [...new Set(events.map(event => event.genere))].sort();

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('eventi_prog')
        .select('*')
        .order('data_ora', { ascending: true });

      if (error) throw error;
      
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = events;

    if (filters.luogo) {
      filtered = filtered.filter(event => event.luogo === filters.luogo);
    }

    if (filters.genere) {
      filtered = filtered.filter(event => event.genere === filters.genere);
    }

    // Apply excluded genres filter
    if (filters.excludedGenres && filters.excludedGenres.length > 0) {
      filtered = filtered.filter(event => {
        const eventGenre = event.genere.toLowerCase();
        return !filters.excludedGenres!.some(excludedGenre => 
          eventGenre.includes(excludedGenre.toLowerCase())
        );
      });
    }

    if (filters.dataInizio) {
      filtered = filtered.filter(event => 
        new Date(event.data_ora) >= new Date(filters.dataInizio)
      );
    }

    if (filters.dataFine) {
      filtered = filtered.filter(event => 
        new Date(event.data_ora) <= new Date(filters.dataFine + 'T23:59:59')
      );
    }

    setFilteredEvents(filtered);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const handleRefresh = () => {
    setLoading(true);
    fetchEvents();
  };

  const handleFiltersChange = (newFilters: EventFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-coal-900 bg-noise">
      {/* Header */}
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="text-4xl mr-4">🎸</div>
              <h1 className="text-4xl font-industrial text-gray-100 tracking-mega-wide">
                PROGDEALER
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center text-gray-400 font-condensed uppercase tracking-wide">
                <Database className="h-5 w-5 mr-2" />
                <span className="text-lg font-bold">
                  {filteredEvents.length} EVENTS
                </span>
              </div>
              <button
                onClick={handleRefresh}
                className="industrial-button"
                title="REFRESH EVENTS"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-6xl font-industrial text-gray-100 mb-6 tracking-ultra-wide">
            PROG EVENTS
          </h2>
          <div className="w-32 h-1 bg-industrial-green-600 mx-auto mb-6"></div>
          <p className="text-gray-400 text-xl font-condensed uppercase tracking-wide mb-4">
            LIVE ELECTRONIC MUSIC CULTURE
          </p>
          <p className="text-gray-300 text-lg font-condensed max-w-2xl mx-auto leading-relaxed">
            Raccogliamo i concerti prog, metal e alternativi da tutta Europa. Automaticamente.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Filters */}
        <EventFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          uniqueLocations={uniqueLocations}
          uniqueGenres={uniqueGenres}
        />

        {/* Events List */}
        <EventList events={filteredEvents} loading={loading} />
      </main>

      {/* Add Event Form */}
      <AddEventForm onEventAdded={fetchEvents} />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
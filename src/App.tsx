import React, { useState, useEffect } from 'react';
import { Music, Database, RefreshCw, Shield } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Event, EventFilters } from './types/event';
import EventList from './components/EventList';
import EventFiltersComponent from './components/EventFilters';
import AddEventForm from './components/AddEventForm';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';

function App() {
  const [currentView, setCurrentView] = useState<'events' | 'admin'>('events');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>({
    città: '',
    sottogenere: '',
    dataInizio: '',
    dataFine: '',
    excludedSubgenres: [],
    fonte: '',
    tipo_inserimento: ''
  });

  // Get unique values for filters
  const uniqueLocations = [...new Set(events.map(event => event.città))].sort();
  const uniqueSources = [...new Set(events.map(event => event.fonte))].sort();

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

    if (filters.città) {
      filtered = filtered.filter(event => event.città === filters.città);
    }

    if (filters.sottogenere) {
      filtered = filtered.filter(event => event.sottogenere === filters.sottogenere);
    }

    if (filters.fonte) {
      filtered = filtered.filter(event => event.fonte === filters.fonte);
    }

    if (filters.tipo_inserimento) {
      filtered = filtered.filter(event => event.tipo_inserimento === filters.tipo_inserimento);
    }

    // Apply excluded subgenres filter
    if (filters.excludedSubgenres && filters.excludedSubgenres.length > 0) {
      filtered = filtered.filter(event => {
        const eventSubgenre = event.sottogenere.toLowerCase();
        return !filters.excludedSubgenres.some(excludedSubgenre => 
          eventSubgenre.includes(excludedSubgenre.toLowerCase())
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
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

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

  const handleAdminAccess = () => {
    if (isAuthenticated) {
      setCurrentView('admin');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setCurrentView('admin');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentView('events');
  };

  const handleBackToMain = () => {
    setCurrentView('events');
  };

  // Get pending events count for admin badge
  const pendingCount = events.filter(event => (event.status || 'approved') === 'pending').length;

  if (currentView === 'admin') {
    return (
      <AdminPanel 
        isAuthenticated={isAuthenticated}
        onAuthRequired={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onBackToMain={handleBackToMain}
      />
    );
  }

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
              <button
                onClick={handleAdminAccess}
                className="industrial-button flex items-center space-x-2"
                title="ADMIN PANEL"
              >
                <Shield className="h-5 w-5" />
                {pendingCount > 0 && (
                  <span className="bg-yellow-600 text-black px-2 py-1 text-xs font-bold rounded">
                    {pendingCount}
                  </span>
                )}
              </button>
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="industrial-button text-sm"
                  title="LOGOUT"
                >
                  LOGOUT
                </button>
              )}
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
            PROGRESSIVE MUSIC CULTURE DATABASE
          </p>
          <p className="text-gray-300 text-lg font-condensed max-w-2xl mx-auto leading-relaxed">
            Europe's best progressive music events, all in one place.
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
          uniqueSources={uniqueSources}
        />

        {/* Events List */}
        <EventList events={filteredEvents} loading={loading} />
      </main>

      {/* Add Event Form */}
      <AddEventForm onEventAdded={fetchEvents} />

      {/* Footer */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Event } from './types/event';
import EventList from './components/EventList';
import EventFiltersComponent from './components/EventFilters';
import AddEventForm from './components/AddEventForm';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import SearchInput from './components/SearchInput';
import { RefreshCw, Shield, Database, Menu, X } from 'lucide-react';

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    country: '',
    city: '',
    subgenre: '',
    dateRange: { start: '', end: '' }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const uniqueLocations = [...new Set(events.map(event => event.città))].sort();
  const uniqueCountries = [...new Set(events.map(event => event.country).filter(Boolean))].sort();

  useEffect(() => {
    checkAuthStatus();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingCount();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [events, searchQuery, filters]);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eventi_prog')
        .select('*')
        .order('data_ora', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('eventi_prog')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const applyFilters = () => {
    let filtered = events;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.nome_evento.toLowerCase().includes(query) ||
        event.città.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.artisti?.some(artist => artist.toLowerCase().includes(query)) ||
        event.sottogenere.toLowerCase().includes(query)
      );
    }

    if (filters.country) {
      filtered = filtered.filter(event => event.country === filters.country);
    }

    if (filters.city) {
      filtered = filtered.filter(event => event.città === filters.city);
    }

    if (filters.subgenre) {
      filtered = filtered.filter(event => event.sottogenere === filters.subgenre);
    }

    if (filters.dateRange.start) {
      filtered = filtered.filter(event => 
        new Date(event.data_ora) >= new Date(filters.dateRange.start)
      );
    }

    if (filters.dateRange.end) {
      filtered = filtered.filter(event => 
        new Date(event.data_ora) <= new Date(filters.dateRange.end)
      );
    }

    setFilteredEvents(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectEvent = (event: Event) => {
    // Scroll to the event in the list
    const eventElement = document.getElementById(`event-${event.id}`);
    if (eventElement) {
      eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      eventElement.classList.add('highlight-event');
      setTimeout(() => {
        eventElement.classList.remove('highlight-event');
      }, 3000);
    }
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleRefresh = () => {
    fetchEvents();
    if (isAuthenticated) {
      fetchPendingCount();
    }
  };

  const handleAdminAccess = () => {
    if (isAuthenticated) {
      setShowAdminPanel(true);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    fetchPendingCount();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setShowAdminPanel(false);
    setPendingCount(0);
  };

  if (showAdminPanel) {
    return (
      <AdminPanel
        onClose={() => setShowAdminPanel(false)}
        onEventUpdated={fetchEvents}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-coal-900 bg-noise">
      {/* Header */}
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo - visible on all screen sizes */}
            <div className="flex items-center">
              <div className="text-4xl mr-4">🎸</div>
              <h1 className="text-3xl md:text-4xl font-industrial text-gray-100 tracking-mega-wide">
                PROGDEALER
              </h1>
            </div>
            
            {/* Search Input - Desktop */}
            <div className="hidden lg:block flex-1 max-w-md mx-8">
              <SearchInput
                events={events}
                onSearch={handleSearch}
                onSelectEvent={handleSelectEvent}
              />
            </div>
            
            <div className="flex items-center space-x-4 md:space-x-6">
              {/* Desktop navigation */}
              <div className="hidden md:flex items-center space-x-4">
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

              {/* Mobile hamburger menu */}
              <div className="md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="industrial-button p-2"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-asphalt-600 py-4">
              <div className="space-y-3">
                {/* Mobile navigation items */}
                <button
                  onClick={() => {
                    handleRefresh();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full industrial-button text-center flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>REFRESH EVENTS</span>
                </button>

                {isAuthenticated && (
                  <button
                    onClick={() => {
                      handleAdminAccess();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full industrial-button text-center flex items-center justify-center space-x-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span>ADMIN AREA</span>
                    {pendingCount > 0 && (
                      <span className="bg-yellow-600 text-black px-2 py-1 text-xs font-bold rounded ml-2">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                )}

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full industrial-button text-center"
                  >
                    LOGOUT
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowAuthModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full industrial-button text-center"
                  >
                    LOGIN
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Search */}
      <div className="lg:hidden bg-coal-800 border-b border-asphalt-600 px-4 py-3">
        <SearchInput
          events={events}
          onSearch={handleSearch}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      {/* Hero Section */}
      <section className="hero-video-container py-20 px-4 sm:px-6 lg:px-8">
        <video
          className="hero-video-background"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/progv.mp4" type="video/mp4" />
        </video>
        
        <div className="hero-video-overlay"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-rock-salt text-gray-100 mb-6 tracking-wide relative z-30 leading-relaxed sm:leading-relaxed md:leading-normal">
            PROG EVENTS
          </h2>
          <div className="w-32 h-1 bg-industrial-green-600 mx-auto mb-6 relative z-30"></div>
          <p className="text-gray-400 text-xl font-condensed uppercase tracking-wide mb-4 relative z-30">
            PROGRESSIVE MUSIC CULTURE DATABASE
          </p>
          <p className="text-gray-300 text-lg font-condensed max-w-2xl mx-auto leading-relaxed relative z-30">
            Europe's best progressive music events, all in one place.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <EventFiltersComponent
          filters={filters}
          searchQuery={searchQuery}
          onFiltersChange={handleFiltersChange}
          uniqueLocations={uniqueLocations}
          uniqueCountries={uniqueCountries}
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center text-gray-400 font-condensed uppercase tracking-wide">
            <Database className="h-4 w-4 mr-2" />
            <span className="font-bold">
              {filteredEvents.length} EVENTS
            </span>
            {filteredEvents.length !== events.length && (
              <span className="text-gray-500 ml-1">
                / {events.length}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <div className="flex items-center text-gray-500 font-condensed text-xs uppercase tracking-wide">
                <span className="mr-1">⏱️</span>
                <span>
                  {lastUpdated.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })}
                </span>
              </div>
            )}

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors duration-200"
              title="REFRESH EVENTS"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-xs font-condensed font-bold uppercase tracking-wide">
                {loading ? 'UPDATING...' : 'REFRESH'}
              </span>
            </button>
          </div>
        </div>

        <EventList events={filteredEvents} loading={loading} />
      </main>

      <AddEventForm onEventAdded={fetchEvents} />
      <Footer />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}

export default App;
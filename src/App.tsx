import React, { useState, useEffect } from 'react';
import { Music, Database, RefreshCw, Shield } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Event, EventFilters } from './types/event';
import EventList from './components/EventList';
import EventFiltersComponent from './components/EventFilters';
import AddEventForm from './components/AddEventForm';
import SearchInput from './components/SearchInput';
import AdminPanel from './components/AdminPanel';
import AuthModal from './components/AuthModal';
import Footer from './components/Footer';

function App() {
  const [currentView, setCurrentView] = useState<'events' | 'admin'>('events');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>({
    città: '',
    sottogenere: '',
    dataInizio: '',
    dataFine: '',
    excludedSubgenres: [],
    countries: [],
  });

  // Get unique values for filters
  const uniqueLocations = [...new Set(events.map(event => event.città))].sort();
  const uniqueCountries = [...new Set(events.map(event => {
    // Extract country from city data or use a mapping
    // For now, we'll extract from existing city names or use a simple mapping
    const city = event.città.toLowerCase();
    
    // Simple country mapping based on common European cities
    if (city.includes('london') || city.includes('manchester') || city.includes('birmingham') || city.includes('liverpool') || city.includes('bristol') || city.includes('leeds') || city.includes('glasgow') || city.includes('edinburgh')) return 'United Kingdom';
    if (city.includes('paris') || city.includes('lyon') || city.includes('marseille') || city.includes('toulouse') || city.includes('nice') || city.includes('nantes') || city.includes('strasbourg') || city.includes('montpellier') || city.includes('bordeaux') || city.includes('lille')) return 'France';
    if (city.includes('berlin') || city.includes('munich') || city.includes('hamburg') || city.includes('cologne') || city.includes('frankfurt') || city.includes('stuttgart') || city.includes('düsseldorf') || city.includes('dortmund') || city.includes('essen') || city.includes('leipzig')) return 'Germany';
    if (city.includes('rome') || city.includes('milan') || city.includes('naples') || city.includes('turin') || city.includes('palermo') || city.includes('genoa') || city.includes('bologna') || city.includes('florence') || city.includes('bari') || city.includes('catania')) return 'Italy';
    if (city.includes('madrid') || city.includes('barcelona') || city.includes('valencia') || city.includes('seville') || city.includes('zaragoza') || city.includes('málaga') || city.includes('murcia') || city.includes('palma') || city.includes('bilbao') || city.includes('alicante')) return 'Spain';
    if (city.includes('amsterdam') || city.includes('rotterdam') || city.includes('the hague') || city.includes('utrecht') || city.includes('eindhoven') || city.includes('tilburg') || city.includes('groningen') || city.includes('almere') || city.includes('breda') || city.includes('nijmegen')) return 'Netherlands';
    if (city.includes('brussels') || city.includes('antwerp') || city.includes('ghent') || city.includes('charleroi') || city.includes('liège') || city.includes('bruges') || city.includes('namur') || city.includes('leuven') || city.includes('mons') || city.includes('aalst')) return 'Belgium';
    if (city.includes('zurich') || city.includes('geneva') || city.includes('basel') || city.includes('bern') || city.includes('lausanne') || city.includes('winterthur') || city.includes('lucerne') || city.includes('st. gallen') || city.includes('lugano') || city.includes('biel')) return 'Switzerland';
    if (city.includes('vienna') || city.includes('graz') || city.includes('linz') || city.includes('salzburg') || city.includes('innsbruck') || city.includes('klagenfurt') || city.includes('villach') || city.includes('wels') || city.includes('sankt pölten') || city.includes('dornbirn')) return 'Austria';
    if (city.includes('prague') || city.includes('brno') || city.includes('ostrava') || city.includes('plzen') || city.includes('liberec') || city.includes('olomouc') || city.includes('budweis') || city.includes('hradec králové') || city.includes('ústí nad labem') || city.includes('pardubice')) return 'Czech Republic';
    if (city.includes('warsaw') || city.includes('krakow') || city.includes('lodz') || city.includes('wroclaw') || city.includes('poznan') || city.includes('gdansk') || city.includes('szczecin') || city.includes('bydgoszcz') || city.includes('lublin') || city.includes('katowice')) return 'Poland';
    if (city.includes('stockholm') || city.includes('gothenburg') || city.includes('malmö') || city.includes('uppsala') || city.includes('västerås') || city.includes('örebro') || city.includes('linköping') || city.includes('helsingborg') || city.includes('jönköping') || city.includes('norrköping')) return 'Sweden';
    if (city.includes('copenhagen') || city.includes('aarhus') || city.includes('odense') || city.includes('aalborg') || city.includes('esbjerg') || city.includes('randers') || city.includes('kolding') || city.includes('horsens') || city.includes('vejle') || city.includes('roskilde')) return 'Denmark';
    if (city.includes('oslo') || city.includes('bergen') || city.includes('trondheim') || city.includes('stavanger') || city.includes('drammen') || city.includes('fredrikstad') || city.includes('kristiansand') || city.includes('sandnes') || city.includes('tromsø') || city.includes('sarpsborg')) return 'Norway';
    if (city.includes('helsinki') || city.includes('espoo') || city.includes('tampere') || city.includes('vantaa') || city.includes('oulu') || city.includes('turku') || city.includes('jyväskylä') || city.includes('lahti') || city.includes('kuopio') || city.includes('pori')) return 'Finland';
    if (city.includes('dublin') || city.includes('cork') || city.includes('limerick') || city.includes('galway') || city.includes('waterford') || city.includes('drogheda') || city.includes('dundalk') || city.includes('swords') || city.includes('bray') || city.includes('navan')) return 'Ireland';
    if (city.includes('lisbon') || city.includes('porto') || city.includes('vila nova de gaia') || city.includes('amadora') || city.includes('braga') || city.includes('funchal') || city.includes('coimbra') || city.includes('setúbal') || city.includes('almada') || city.includes('agualva-cacém')) return 'Portugal';
    
    // Default fallback - try to extract from city name or return "Other"
    return 'Other';
  }))].filter(country => country !== 'Other').sort();

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('eventi_prog')
        .select('*')
        .eq('status', 'approved')
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

    // Apply search query first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // Check for special search prefixes
      if (query.startsWith('venue:')) {
        const venueQuery = query.replace('venue:', '').trim();
        filtered = filtered.filter(event => 
          event.venue.toLowerCase().includes(venueQuery)
        );
      } else if (query.startsWith('city:')) {
        const cityQuery = query.replace('city:', '').trim();
        filtered = filtered.filter(event => 
          event.città.toLowerCase().includes(cityQuery)
        );
      } else if (query.startsWith('artist:')) {
        const artistQuery = query.replace('artist:', '').trim();
        filtered = filtered.filter(event => 
          event.artisti?.some(artist => 
            artist.toLowerCase().includes(artistQuery)
          )
        );
      } else {
        // General search across all fields
        filtered = filtered.filter(event => {
          const searchFields = [
            event.nome_evento,
            event.venue,
            event.città,
            event.descrizione || '',
            event.sottogenere,
            ...(event.artisti || [])
          ];
          
          return searchFields.some(field => 
            field.toLowerCase().includes(query)
          );
        });
      }
    }

    if (filters.città) {
      filtered = filtered.filter(event => event.città === filters.città);
    }

    if (filters.sottogenere) {
      filtered = filtered.filter(event => event.sottogenere === filters.sottogenere);
    }

    if (filters.countries && filters.countries.length > 0) {
      filtered = filtered.filter(event => {
        const eventCountry = getEventCountry(event.città);
        return filters.countries.includes(eventCountry);
      });
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
    
    // Listen for event approval to refresh the list
    const handleEventApproved = () => {
      fetchEvents();
    };
    
    window.addEventListener('eventApproved', handleEventApproved);
    
    return () => {
      window.removeEventListener('eventApproved', handleEventApproved);
    };
  }, []);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  useEffect(() => {
    applyFilters();
  }, [events, filters, searchQuery]);

  const handleRefresh = () => {
    setLoading(true);
    fetchEvents();
  };

  const handleFiltersChange = (newFilters: EventFilters) => {
    setFilters(newFilters);
  };

  // Helper function to get country from city
  const getEventCountry = (city: string): string => {
    const cityLower = city.toLowerCase();
    
    if (cityLower.includes('london') || cityLower.includes('manchester') || cityLower.includes('birmingham') || cityLower.includes('liverpool') || cityLower.includes('bristol') || cityLower.includes('leeds') || cityLower.includes('glasgow') || cityLower.includes('edinburgh')) return 'United Kingdom';
    if (cityLower.includes('paris') || cityLower.includes('lyon') || cityLower.includes('marseille') || cityLower.includes('toulouse') || cityLower.includes('nice') || cityLower.includes('nantes') || cityLower.includes('strasbourg') || cityLower.includes('montpellier') || cityLower.includes('bordeaux') || cityLower.includes('lille')) return 'France';
    if (cityLower.includes('berlin') || cityLower.includes('munich') || cityLower.includes('hamburg') || cityLower.includes('cologne') || cityLower.includes('frankfurt') || cityLower.includes('stuttgart') || cityLower.includes('düsseldorf') || cityLower.includes('dortmund') || cityLower.includes('essen') || cityLower.includes('leipzig')) return 'Germany';
    if (cityLower.includes('rome') || cityLower.includes('milan') || cityLower.includes('naples') || cityLower.includes('turin') || cityLower.includes('palermo') || cityLower.includes('genoa') || cityLower.includes('bologna') || cityLower.includes('florence') || cityLower.includes('bari') || cityLower.includes('catania')) return 'Italy';
    if (cityLower.includes('madrid') || cityLower.includes('barcelona') || cityLower.includes('valencia') || cityLower.includes('seville') || cityLower.includes('zaragoza') || cityLower.includes('málaga') || cityLower.includes('murcia') || cityLower.includes('palma') || cityLower.includes('bilbao') || cityLower.includes('alicante')) return 'Spain';
    if (cityLower.includes('amsterdam') || cityLower.includes('rotterdam') || cityLower.includes('the hague') || cityLower.includes('utrecht') || cityLower.includes('eindhoven') || cityLower.includes('tilburg') || cityLower.includes('groningen') || cityLower.includes('almere') || cityLower.includes('breda') || cityLower.includes('nijmegen')) return 'Netherlands';
    if (cityLower.includes('brussels') || cityLower.includes('antwerp') || cityLower.includes('ghent') || cityLower.includes('charleroi') || cityLower.includes('liège') || cityLower.includes('bruges') || cityLower.includes('namur') || cityLower.includes('leuven') || cityLower.includes('mons') || cityLower.includes('aalst')) return 'Belgium';
    if (cityLower.includes('zurich') || cityLower.includes('geneva') || cityLower.includes('basel') || cityLower.includes('bern') || cityLower.includes('lausanne') || cityLower.includes('winterthur') || cityLower.includes('lucerne') || cityLower.includes('st. gallen') || cityLower.includes('lugano') || cityLower.includes('biel')) return 'Switzerland';
    if (cityLower.includes('vienna') || cityLower.includes('graz') || cityLower.includes('linz') || cityLower.includes('salzburg') || cityLower.includes('innsbruck') || cityLower.includes('klagenfurt') || cityLower.includes('villach') || cityLower.includes('wels') || cityLower.includes('sankt pölten') || cityLower.includes('dornbirn')) return 'Austria';
    if (cityLower.includes('prague') || cityLower.includes('brno') || cityLower.includes('ostrava') || cityLower.includes('plzen') || cityLower.includes('liberec') || cityLower.includes('olomouc') || cityLower.includes('budweis') || cityLower.includes('hradec králové') || cityLower.includes('ústí nad labem') || cityLower.includes('pardubice')) return 'Czech Republic';
    if (cityLower.includes('warsaw') || cityLower.includes('krakow') || cityLower.includes('lodz') || cityLower.includes('wroclaw') || cityLower.includes('poznan') || cityLower.includes('gdansk') || cityLower.includes('szczecin') || cityLower.includes('bydgoszcz') || cityLower.includes('lublin') || cityLower.includes('katowice')) return 'Poland';
    if (cityLower.includes('stockholm') || cityLower.includes('gothenburg') || cityLower.includes('malmö') || cityLower.includes('uppsala') || cityLower.includes('västerås') || cityLower.includes('örebro') || cityLower.includes('linköping') || cityLower.includes('helsingborg') || cityLower.includes('jönköping') || cityLower.includes('norrköping')) return 'Sweden';
    if (cityLower.includes('copenhagen') || cityLower.includes('aarhus') || cityLower.includes('odense') || cityLower.includes('aalborg') || cityLower.includes('esbjerg') || cityLower.includes('randers') || cityLower.includes('kolding') || cityLower.includes('horsens') || cityLower.includes('vejle') || cityLower.includes('roskilde')) return 'Denmark';
    if (cityLower.includes('oslo') || cityLower.includes('bergen') || cityLower.includes('trondheim') || cityLower.includes('stavanger') || cityLower.includes('drammen') || cityLower.includes('fredrikstad') || cityLower.includes('kristiansand') || cityLower.includes('sandnes') || cityLower.includes('tromsø') || cityLower.includes('sarpsborg')) return 'Norway';
    if (cityLower.includes('helsinki') || cityLower.includes('espoo') || cityLower.includes('tampere') || cityLower.includes('vantaa') || cityLower.includes('oulu') || cityLower.includes('turku') || cityLower.includes('jyväskylä') || cityLower.includes('lahti') || cityLower.includes('kuopio') || cityLower.includes('pori')) return 'Finland';
    if (cityLower.includes('dublin') || cityLower.includes('cork') || cityLower.includes('limerick') || cityLower.includes('galway') || cityLower.includes('waterford') || cityLower.includes('drogheda') || cityLower.includes('dundalk') || cityLower.includes('swords') || cityLower.includes('bray') || cityLower.includes('navan')) return 'Ireland';
    if (cityLower.includes('lisbon') || cityLower.includes('porto') || cityLower.includes('vila nova de gaia') || cityLower.includes('amadora') || cityLower.includes('braga') || cityLower.includes('funchal') || cityLower.includes('coimbra') || cityLower.includes('setúbal') || cityLower.includes('almada') || cityLower.includes('agualva-cacém')) return 'Portugal';
    
    return 'Other';
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleSelectEvent = (event: Event) => {
    // Scroll to the event in the list
    const eventElement = document.getElementById(`event-${event.id}`);
    if (eventElement) {
      eventElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Briefly highlight the event
      eventElement.classList.add('ring-2', 'ring-industrial-green-600');
      setTimeout(() => {
        eventElement.classList.remove('ring-2', 'ring-industrial-green-600');
      }, 2000);
    }
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
              <div className="hidden md:flex items-center text-gray-400 font-condensed uppercase tracking-wide">
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

      {/* Mobile Search */}
      <div className="lg:hidden bg-coal-800 border-b border-asphalt-600 px-4 py-3">
        <SearchInput
          events={events}
          onSearch={handleSearch}
          onSelectEvent={handleSelectEvent}
        />
      </div>

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
          searchQuery={searchQuery}
          onFiltersChange={handleFiltersChange}
          uniqueLocations={uniqueLocations}
          uniqueCountries={uniqueCountries}
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
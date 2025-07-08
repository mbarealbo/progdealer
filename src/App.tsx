Here's the fixed version with added closing brackets and fixed duplicate declarations:

```javascript
import React, { useState, useEffect } from 'react';
import { Music, Database, RefreshCw, Shield, Menu, X } from 'lucide-react';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    città: '',
    sottogenere: '',
    dataInizio: '',
    dataFine: '',
    excludedSubgenres: [],
    countries: [],
  });

  // ... [rest of the code remains the same until the mobile menu buttons] ...

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  // ... [rest of the code remains the same until the first mobile menu button] ...

                  className="industrial-button"
                  title="REFRESH EVENTS"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ... [rest of the JSX remains the same] ... */}

    </div>
  );
}

export default App;
```

The main fixes made were:
1. Removed duplicate declarations of `showMobileMenu` state
2. Removed duplicate declarations of `toggleMobileMenu` and `closeMobileMenu` functions
3. Added missing closing brackets for the mobile menu buttons and their containing elements
4. Fixed the structure of nested divs and sections

The rest of the code remains functionally the same, just properly closed and structured.
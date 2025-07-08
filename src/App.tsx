Here's the fixed version with all missing closing brackets and proper structure:

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
  // ... [all state declarations and other code remains the same until the mobile menu button section]

  return (
    <div className="min-h-screen bg-coal-900 bg-noise">
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* ... [header content remains the same] ... */}
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="lg:hidden bg-coal-900 border-t border-asphalt-600">
            <div className="px-4 py-4 space-y-4">
              {/* Mobile Search */}
              <div>
                <SearchInput
                  events={events}
                  onSearch={(query) => {
                    handleSearch(query);
                    closeMobileMenu();
                  }}
                  onSelectEvent={(event) => {
                    handleSelectEvent(event);
                    closeMobileMenu();
                  }}
                />
              </div>

              {/* Mobile Stats and Controls */}
              <div className="flex items-center justify-between py-2 border-t border-asphalt-600">
                <div className="flex items-center text-gray-400 font-condensed uppercase tracking-wide text-sm">
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
                <button
                  onClick={() => {
                    handleRefresh();
                    closeMobileMenu();
                  }}
                  className="industrial-button"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>

              {/* Admin Button */}
              <button
                onClick={() => {
                  handleAdminAccess();
                  closeMobileMenu();
                }}
                className="w-full flex items-center justify-center space-x-2 bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:border-industrial-green-500 hover:text-white transition-all duration-200"
              >
                <Shield className="h-5 w-5" />
                <span>ADMIN PANEL</span>
                {pendingCount > 0 && (
                  <span className="bg-yellow-600 text-black px-2 py-1 text-xs font-bold rounded ml-2">
                    {pendingCount}
                  </span>
                )}
              </button>

              {/* Logout Button - Only show if authenticated */}
              {isAuthenticated && (
                <button
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="w-full flex items-center justify-center space-x-2 bg-transparent border-2 border-burgundy-500 text-burgundy-300 px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-400 hover:text-white transition-all duration-200"
                >
                  <span>LOGOUT</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Rest of the components */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <EventFiltersComponent
          filters={filters}
          searchQuery={searchQuery}
          onFiltersChange={handleFiltersChange}
          uniqueLocations={uniqueLocations}
          uniqueCountries={uniqueCountries}
        />
        <EventList events={filteredEvents} loading={loading} />
      </main>

      <AddEventForm onEventAdded={fetchEvents} />
      <Footer 
        onAdminAccess={handleAdminAccess}
        pendingCount={pendingCount}
      />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}

export default App;
```
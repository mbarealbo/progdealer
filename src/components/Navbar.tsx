import React from 'react';
import { Link } from 'react-router-dom';
import { Music, RefreshCw, User as UserIcon } from 'lucide-react';
import SearchInput from './SearchInput';
import { Event } from '../types/event';

interface NavbarProps {
  events?: Event[];
  onSearch?: (query: string) => void;
  onSelectEvent?: (event: Event) => void;
  onRefresh?: () => void;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  onLogout?: () => void;
  showSearch?: boolean;
}

export default function Navbar({ 
  events = [], 
  onSearch, 
  onSelectEvent, 
  onRefresh,
  isAuthenticated = false,
  isAdmin = false,
  onLogout,
  showSearch = true
}: NavbarProps) {
  return (
    <header className="bg-coal-800 border-b-2 border-asphalt-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo cliccabile */}
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity duration-200">
            <div className="text-4xl mr-4">🎸</div>
            <h1 className="text-3xl md:text-4xl font-industrial text-gray-100 tracking-mega-wide">
              PROGDEALER
            </h1>
          </Link>
          
          {/* Search Input - Desktop (solo se showSearch è true) */}
          {showSearch && onSearch && (
            <div className="hidden lg:block flex-1 max-w-md mx-8">
              <SearchInput
                events={events}
                onSearch={onSearch}
                onSelectEvent={onSelectEvent}
              />
            </div>
          )}
          
          <div className="flex items-center space-x-4 md:space-x-6">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="industrial-button"
                title="REFRESH EVENTS"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            )}
            <Link
              to="/userarea"
              className="industrial-button"
              title="USER AREA"
            >
              <UserIcon className="h-5 w-5" />
              {isAuthenticated && (
                <span className="ml-2 text-sm">
                  {isAdmin ? 'ADMIN' : 'USER'}
                </span>
              )}
            </Link>
            {isAuthenticated && onLogout && (
              <button
                onClick={onLogout}
                className="industrial-button text-sm"
                title="LOGOUT"
              >
                LOGOUT
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search (solo se showSearch è true) */}
      {showSearch && onSearch && (
        <div className="lg:hidden bg-coal-800 border-b border-asphalt-600 px-4 py-3">
          <SearchInput
            events={events}
            onSearch={onSearch}
            onSelectEvent={onSelectEvent}
          />
        </div>
      )}
    </header>
  );
}
import React, { useState, useEffect } from 'react';
import { ArrowLeft, User as UserIcon, Trash2, Eye, Clock, CheckCircle, XCircle, Plus, Settings, LogOut } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/auth-js';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import { UserProfile } from '../hooks/useUserRole';
import EventImage from './EventImage';
import AddEventForm from './AddEventForm';
import DeleteAccountModal from './DeleteAccountModal';

interface UserPanelProps {
  isAuthenticated: boolean;
  currentUser: SupabaseUser | null;
  userProfile: UserProfile | null;
  onAuthRequired: () => void;
  onLogout: () => void;
  onBackToMain: () => void;
}

export default function UserPanel({ 
  isAuthenticated, 
  currentUser,
  userProfile,
  onAuthRequired, 
  onLogout, 
  onBackToMain 
}: UserPanelProps) {
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    fetchUserEvents();
  }, [isAuthenticated]);

  useEffect(() => {
    applyFilter();
  }, [userEvents, filter]);

  const fetchUserEvents = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      console.log('Fetching events for user:', currentUser.id);
      
      // Fetch events submitted by this specific user only
      const { data, error } = await supabase
        .from('eventi_prog')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('User events fetched:', data);
      setUserEvents(data || []);
    } catch (error) {
      console.error('Error fetching user events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('eventi_prog')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      setUserEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    }
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredEvents(userEvents);
    } else {
      setFilteredEvents(userEvents.filter(event => (event.status || 'pending') === filter));
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'APPROVED';
      case 'rejected':
        return 'REJECTED';
      case 'pending':
      default:
        return 'PENDING REVIEW';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400';
      case 'rejected':
        return 'text-red-400';
      case 'pending':
      default:
        return 'text-yellow-400';
    }
  };

  const handleAccountDeleted = () => {
    // Account has been deleted, redirect to homepage
    window.location.href = '/';
  };

  if (!isAuthenticated) {
    return null;
  }

  // Settings Page
  if (showSettings) {
    return (
      <div className="min-h-screen bg-coal-900 bg-noise">
        {/* Header */}
        <header className="bg-coal-800 border-b-2 border-asphalt-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <div className="flex items-center space-x-4 sm:space-x-6">
                {/* Clickable Logo */}
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex items-center hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                  title="BACK TO HOME"
                >
                  <div className="text-xl sm:text-2xl mr-2">🎸</div>
                  <div className="text-sm sm:text-lg font-industrial text-gray-100 tracking-wide uppercase">
                    PROGDEALER
                  </div>
                </button>
                
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-300 hover:text-white transition-colors duration-200 p-2"
                  title="BACK TO USER AREA"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-4">
                <button
                  onClick={onLogout}
                  className="text-gray-300 hover:text-white transition-colors duration-200 p-2"
                  title="LOGOUT"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Page Title */}
          <div className="flex items-center space-x-4 mb-6 sm:mb-8">
            <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-industrial-green-600" />
            <div>
              <h1 className="text-xl sm:text-2xl font-industrial text-gray-100 tracking-wide uppercase">
                SETTINGS
              </h1>
              <p className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                Account Configuration
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-coal-800 border-2 border-asphalt-600 p-4 sm:p-6">
              <h2 className="text-lg font-industrial text-gray-100 tracking-wide uppercase mb-4">
                ACCOUNT INFO
              </h2>
              
              {/* Email (Read-only) */}
              <div className="mb-4">
                <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                  USERNAME (EMAIL)
                </label>
                <div className="bg-coal-900 border-2 border-asphalt-600 text-gray-300 px-3 py-2 font-condensed text-sm">
                  {userProfile?.email || currentUser?.email || 'User'}
                </div>
              </div>

              {/* Role Tag */}
              <div className="mb-4">
                <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                  ROLE
                </label>
                <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  userProfile?.user_role === 'admin' 
                    ? 'bg-burgundy-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}>
                  {userProfile?.user_role?.toUpperCase() || 'USER'}
                </span>
              </div>
            </div>

            {/* Coming Soon Features */}
            <div className="bg-coal-800 border-2 border-asphalt-600 p-4 sm:p-6">
              <h2 className="text-lg font-industrial text-gray-100 tracking-wide uppercase mb-4">
                PREFERENCES
              </h2>
              
              {/* Notifications Toggle (Disabled) */}
              <div className="mb-4">
                <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                  NOTIFICATIONS
                </label>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <input
                      type="checkbox"
                      disabled
                      className="sr-only"
                    />
                    <div className="w-10 h-6 bg-gray-600 rounded-full shadow-inner opacity-50"></div>
                    <div className="absolute w-4 h-4 bg-gray-400 rounded-full shadow left-1 top-1 transition"></div>
                  </div>
                  <span className="text-sm text-gray-500 font-condensed">
                    Enable notifications – Coming soon
                  </span>
                </div>
              </div>

              {/* Favorite Band Dropdown (Disabled) */}
              <div className="mb-4">
                <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                  FAVORITE BAND
                </label>
                <select
                  disabled
                  className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-500 px-3 py-2 font-condensed text-sm opacity-50 cursor-not-allowed"
                >
                  <option>Choose your favorite band – Coming soon</option>
                </select>
              </div>
            </div>

            {/* Delete Account */}
            <div className="bg-burgundy-900 border-2 border-burgundy-600 p-4 sm:p-6">
              <h2 className="text-lg font-industrial text-burgundy-300 tracking-wide uppercase mb-4">
                DANGER ZONE
              </h2>
              
              <p className="text-burgundy-300 text-sm font-condensed mb-4 leading-relaxed">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-burgundy-800 border-2 border-burgundy-600 text-white px-4 py-2 text-sm font-condensed font-bold uppercase tracking-wide hover:bg-burgundy-700 transition-all duration-200"
              >
                DELETE ACCOUNT
              </button>
            </div>
          </div>
        </main>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <DeleteAccountModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onAccountDeleted={handleAccountDeleted}
            userEmail={userProfile?.email || currentUser?.email || ''}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coal-900 bg-noise">
      {/* Header - Simplified for Mobile */}
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center space-x-4 sm:space-x-6">
              {/* Clickable Logo */}
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                title="BACK TO HOME"
              >
                <div className="text-xl sm:text-2xl mr-2">🎸</div>
                <div className="text-sm sm:text-lg font-industrial text-gray-100 tracking-wide uppercase">
                  PROGDEALER
                </div>
              </button>
              
              <button
                onClick={onBackToMain}
                className="text-gray-300 hover:text-white transition-colors duration-200 p-2"
                title="BACK TO MAIN"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Simplified Mobile Header - Only Icons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setShowSettings(true)}
                className="text-gray-300 hover:text-white transition-colors duration-200 p-2"
                title="SETTINGS"
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={onLogout}
                className="text-gray-300 hover:text-white transition-colors duration-200 p-2"
                title="LOGOUT"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Title - Now Visible on All Screens */}
        <div className="flex flex-col items-start text-left mb-6 sm:mb-8">
          <div className="flex items-center space-x-4 mb-2">
            <UserIcon className="h-6 w-6 sm:h-8 sm:w-8 text-industrial-green-600" />
            <h1 className="text-xl sm:text-2xl font-industrial text-gray-100 tracking-wide uppercase">
              USER AREA
            </h1>
          </div>
          {/* Role Tag Under Title */}
          <span className={`inline-block px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            userProfile?.user_role === 'admin'
              ? 'bg-burgundy-600 text-white'
              : 'bg-blue-600 text-white'
          }`}>
            {userProfile?.user_role?.toUpperCase() || 'USER'}
          </span>
          {/* Greeting */}
          <p className="text-gray-300 text-sm font-condensed mt-2">
            Hello, {userProfile?.email || currentUser?.email}
          </p>
        </div>

        {/* Stats - Better Mobile Spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-coal-800 border-2 border-asphalt-600 p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-industrial-green-600" />
              <div>
                <div className="text-xl sm:text-2xl font-industrial text-gray-100">
                  {userEvents.length}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm font-condensed uppercase tracking-wide">
                  Total Events
                </div>
              </div>
            </div>
          </div>

          <div className="bg-coal-800 border-2 border-asphalt-600 p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
              <div>
                <div className="text-xl sm:text-2xl font-industrial text-gray-100">
                  {userEvents.filter(e => e.status === 'approved').length}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm font-condensed uppercase tracking-wide">
                  Approved
                </div>
              </div>
            </div>
          </div>

          <div className="bg-coal-800 border-2 border-asphalt-600 p-4 sm:p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
              <div>
                <div className="text-xl sm:text-2xl font-industrial text-gray-100">
                  {userEvents.filter(e => e.status === 'pending' || !e.status).length}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm font-condensed uppercase tracking-wide">
                  Pending
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls - Better Mobile Layout */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-6">
          {/* Filter Buttons - Better Mobile Spacing */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-condensed font-bold uppercase tracking-wide border-2 transition-all duration-200 ${
                  filter === filterOption
                    ? 'bg-industrial-green-600 border-industrial-green-600 text-white'
                    : 'bg-transparent border-asphalt-500 text-gray-300 hover:border-industrial-green-600 hover:text-white'
                }`}
              >
                {filterOption.toUpperCase()}
                {filterOption !== 'all' && (
                  <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                    {filterOption === 'pending' ? userEvents.filter(e => e.status === 'pending' || !e.status).length : 
                     filterOption === 'approved' ? userEvents.filter(e => e.status === 'approved').length : 
                     userEvents.filter(e => e.status === 'rejected').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Add Event Button */}
          <button
            onClick={() => {
              setShowAddForm(true);
            }}
            className="w-full sm:w-auto bg-industrial-green-600 border-2 border-industrial-green-600 text-white px-4 sm:px-6 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 hover:border-industrial-green-700 transition-all duration-200 flex items-center justify-center space-x-2 text-sm"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>ADD EVENT</span>
          </button>
        </div>

        {/* Events List */}
        <div className="bg-coal-800 border-2 border-asphalt-600">
          <div className="p-4 sm:p-6 border-b border-asphalt-600">
            <h2 className="text-lg sm:text-xl font-industrial text-gray-100 tracking-wide uppercase">
              YOUR EVENTS ({filteredEvents.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-industrial-green-600 mx-auto mb-4"></div>
              <p className="text-gray-400 font-condensed uppercase tracking-wide text-sm">
                Loading your events...
              </p>
            </div>
          ) : userEvents.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="text-4xl sm:text-6xl mb-4">🎸</div>
              <p className="text-gray-400 text-lg sm:text-xl font-condensed uppercase tracking-wide mb-4">
                No Events Yet
              </p>
              <p className="text-gray-500 font-condensed text-sm">
                Start by adding your first event using the button above.
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="text-3xl sm:text-4xl mb-4">🔍</div>
              <p className="text-gray-400 text-lg sm:text-xl font-condensed uppercase tracking-wide mb-4">
                No {filter.toUpperCase()} Events
              </p>
              <p className="text-gray-500 font-condensed text-sm">
                Try selecting a different filter or add a new event.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-asphalt-600">
              {filteredEvents.map((event) => (
                <div key={event.id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                    {/* Event Image */}
                    <div className="w-full sm:w-24 h-20 bg-coal-700 border border-asphalt-500 flex-shrink-0 overflow-hidden">
                      <EventImage
                        src={event.immagine}
                        alt={event.nome_evento}
                        className="w-full h-full object-cover"
                        placeholderClassName="w-full h-full"
                      />
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-gray-100 leading-tight mb-2 sm:mb-0">
                          {event.nome_evento}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(event.status)}
                          <span className={`text-xs sm:text-sm font-condensed font-bold uppercase tracking-wide ${getStatusColor(event.status)}`}>
                            {getStatusText(event.status)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-3 text-xs sm:text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">📅</span>
                          <span className="text-gray-200">
                            {new Date(event.data_ora).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">📍</span>
                          <span className="text-gray-200">{event.città}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">🏢</span>
                          <span className="text-gray-200">{event.venue}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">🎵</span>
                          <span className="text-gray-200">{event.sottogenere}</span>
                        </div>
                      </div>

                      {event.descrizione && (
                        <p className="text-gray-300 text-xs sm:text-sm mb-3 leading-relaxed">
                          {event.descrizione}
                        </p>
                      )}

                      {event.artisti && event.artisti.length > 0 && (
                        <div className="flex items-center space-x-2 mb-3 text-xs sm:text-sm">
                          <span className="text-gray-400">👥</span>
                          <span className="text-gray-200">
                            {event.artisti.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions - Stack on mobile */}
                    <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2">
                      {event.link && (
                        <a
                          href={event.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none bg-industrial-green-600 hover:bg-industrial-green-700 text-white px-3 py-2 text-xs sm:text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 text-center"
                        >
                          VIEW
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="flex-1 sm:flex-none bg-burgundy-600 hover:bg-burgundy-700 text-white px-3 py-2 text-xs sm:text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 flex items-center justify-center space-x-1"
                        title="Delete Event"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>DELETE</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Event Form */}
      <AddEventForm 
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onEventAdded={() => {
          fetchUserEvents();
          setShowAddForm(false);
        }} 
      />
    </div>
  );
}
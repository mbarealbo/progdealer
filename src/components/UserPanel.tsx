import React, { useState, useEffect } from 'react';
import { ArrowLeft, User as UserIcon, Trash2, Eye, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/auth-js';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import { UserProfile } from '../hooks/useUserRole';
import EventImage from './EventImage';
import AddEventForm from './AddEventForm';

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-coal-900 bg-noise">
      {/* Header */}
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              {/* Clickable Logo */}
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                title="BACK TO HOME"
              >
                <div className="text-2xl mr-2">🎸</div>
                <div className="text-lg font-industrial text-gray-100 tracking-wide uppercase">
                  PROGDEALER
                </div>
              </button>
              
              <button
                onClick={onBackToMain}
                className="industrial-button flex items-center space-x-2"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>BACK</span>
              </button>
              
              <div className="flex items-center space-x-4">
                <UserIcon className="h-8 w-8 text-industrial-green-600" />
                <div>
                  <h1 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
                    USER AREA
                  </h1>
                  <p className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                    Manage Your Events
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-gray-400 font-condensed text-sm flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                  userProfile?.user_role === 'admin' 
                    ? 'bg-burgundy-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}>
                  {userProfile?.user_role?.toUpperCase() || 'USER'}
                </span>
                <span className="uppercase tracking-wide">
                  {userProfile?.email || currentUser?.email || 'User'}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="industrial-button"
              >
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-coal-800 border-2 border-asphalt-600 p-6">
            <div className="flex items-center space-x-3">
              <Eye className="h-6 w-6 text-industrial-green-600" />
              <div>
                <div className="text-2xl font-industrial text-gray-100">
                  {userEvents.length}
                </div>
                <div className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                  Total Events
                </div>
              </div>
            </div>
          </div>

          <div className="bg-coal-800 border-2 border-asphalt-600 p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <div className="text-2xl font-industrial text-gray-100">
                  {userEvents.filter(e => e.status === 'approved').length}
                </div>
                <div className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                  Approved
                </div>
              </div>
            </div>
          </div>

          <div className="bg-coal-800 border-2 border-asphalt-600 p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-yellow-500" />
              <div>
                <div className="text-2xl font-industrial text-gray-100">
                  {userEvents.filter(e => e.status === 'pending' || !e.status).length}
                </div>
                <div className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                  Pending
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 text-sm font-condensed font-bold uppercase tracking-wide border-2 transition-all duration-200 ${
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
            onClick={() => setShowAddForm(true)}
            className="bg-industrial-green-600 border-2 border-industrial-green-600 text-white px-6 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 hover:border-industrial-green-700 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>ADD EVENT</span>
          </button>
        </div>

        {/* Events List */}
        <div className="bg-coal-800 border-2 border-asphalt-600">
          <div className="p-6 border-b border-asphalt-600">
            <h2 className="text-xl font-industrial text-gray-100 tracking-wide uppercase">
              YOUR EVENTS ({filteredEvents.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-industrial-green-600 mx-auto mb-4"></div>
              <p className="text-gray-400 font-condensed uppercase tracking-wide">
                Loading your events...
              </p>
            </div>
          ) : userEvents.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🎸</div>
              <p className="text-gray-400 text-xl font-condensed uppercase tracking-wide mb-4">
                No Events Yet
              </p>
              <p className="text-gray-500 font-condensed">
                Start by adding your first event using the button above.
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400 text-xl font-condensed uppercase tracking-wide mb-4">
                No {filter.toUpperCase()} Events
              </p>
              <p className="text-gray-500 font-condensed">
                Try selecting a different filter or add a new event.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-asphalt-600">
              {filteredEvents.map((event) => (
                <div key={event.id} className="p-6">
                  <div className="flex items-start space-x-6">
                    {/* Event Image */}
                    <div className="w-24 h-20 bg-coal-700 border border-asphalt-500 flex-shrink-0 overflow-hidden">
                      <EventImage
                        src={event.immagine}
                        alt={event.nome_evento}
                        className="w-full h-full object-cover"
                        placeholderClassName="w-full h-full"
                      />
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-100 leading-tight">
                          {event.nome_evento}
                        </h3>
                        <div className="flex items-center space-x-2 ml-4">
                          {getStatusIcon(event.status)}
                          <span className={`text-sm font-condensed font-bold uppercase tracking-wide ${getStatusColor(event.status)}`}>
                            {getStatusText(event.status)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
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
                        <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                          {event.descrizione}
                        </p>
                      )}

                      {event.artisti && event.artisti.length > 0 && (
                        <div className="flex items-center space-x-2 mb-3 text-sm">
                          <span className="text-gray-400">👥</span>
                          <span className="text-gray-200">
                            {event.artisti.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2">
                      {event.link && (
                        <a
                          href={event.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-industrial-green-600 hover:bg-industrial-green-700 text-white px-3 py-2 text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 text-center"
                        >
                          VIEW
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="bg-burgundy-600 hover:bg-burgundy-700 text-white px-3 py-2 text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 flex items-center justify-center space-x-1"
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
      {showAddForm && (
        <AddEventForm 
          onEventAdded={() => {
            fetchUserEvents();
            setShowAddForm(false);
          }} 
        />
      )}
    </div>
  );
}
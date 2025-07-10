import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Check, X, Eye, Clock, CheckCircle, XCircle, Trash2, Upload, Download, User as UserIcon } from 'lucide-react';
import type { User } from '@supabase/auth-js';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import { UserProfile } from '../hooks/useUserRole';
import EventImage from './EventImage';
import ImportEvents from './ImportEvents';
import UserManagement from './UserManagement';

interface AdminPanelProps {
  isAuthenticated: boolean;
  currentUser: User | null;
  userProfile: UserProfile | null;
  onAuthRequired: () => void;
  onLogout: () => void;
  onBackToMain: () => void;
}

export default function AdminPanel({ 
  isAuthenticated, 
  currentUser,
  userProfile,
  onAuthRequired, 
  onLogout, 
  onBackToMain 
}: AdminPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !userProfile || userProfile.user_role !== 'admin') {
      onAuthRequired();
      return;
    }
    fetchEvents();
  }, [isAuthenticated, userProfile]);

  useEffect(() => {
    applyFilter();
  }, [events, filter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Admin can see all events regardless of user_id
      const { data, error } = await supabase
        .from('eventi_prog')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter(event => (event.status || 'approved') === filter));
    }
  };

  const updateEventStatus = async (eventId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('eventi_prog')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, status } : event
      ));

      // Dispatch custom event for main app to refresh
      window.dispatchEvent(new CustomEvent('eventApproved'));
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const { error } = await supabase
        .from('eventi_prog')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `progdealer-events-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
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
        return 'PENDING';
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

  const pendingCount = events.filter(event => (event.status || 'approved') === 'pending').length;
  const approvedCount = events.filter(event => (event.status || 'approved') === 'approved').length;
  const rejectedCount = events.filter(event => (event.status || 'approved') === 'rejected').length;

  return (
    <div>
      {/* Page Header */}
      <div className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4">
            <Shield className="h-8 w-8 text-industrial-green-600" />
            <div>
              <h1 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
                ADMIN PANEL
              </h1>
              <p className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                Event Management System
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-coal-800 border-2 border-asphalt-600 p-6">
            <div className="flex items-center space-x-3">
              <Eye className="h-6 w-6 text-industrial-green-600" />
              <div>
                <div className="text-2xl font-industrial text-gray-100">
                  {events.length}
                </div>
                <div className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                  Total Events
                </div>
              </div>
            </div>
          </div>

          <div className="bg-coal-800 border-2 border-asphalt-600 p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-yellow-500" />
              <div>
                <div className="text-2xl font-industrial text-gray-100">
                  {pendingCount}
                </div>
                <div className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                  Pending Review
                </div>
              </div>
            </div>
          </div>

          <div className="bg-coal-800 border-2 border-asphalt-600 p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <div className="text-2xl font-industrial text-gray-100">
                  {approvedCount}
                </div>
                <div className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                  Approved
                </div>
              </div>
            </div>
          </div>

          <div className="bg-coal-800 border-2 border-asphalt-600 p-6">
            <div className="flex items-center space-x-3">
              <XCircle className="h-6 w-6 text-red-500" />
              <div>
                <div className="text-2xl font-industrial text-gray-100">
                  {rejectedCount}
                </div>
                <div className="text-gray-400 text-sm font-condensed uppercase tracking-wide">
                  Rejected
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
                    {filterOption === 'pending' ? pendingCount : 
                     filterOption === 'approved' ? approvedCount : rejectedCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowUserManagement(!showUserManagement)}
              className={`industrial-button flex items-center space-x-2 ${
                showUserManagement ? 'bg-industrial-green-600 border-industrial-green-600 text-white' : ''
              }`}
            >
              <UserIcon className="h-4 w-4" />
              <span>USERS</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="industrial-button flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>IMPORT</span>
            </button>
            <button
              onClick={exportEvents}
              className="industrial-button flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>EXPORT</span>
            </button>
          </div>
        </div>

        {/* User Management Section */}
        <UserManagement isVisible={showUserManagement} />

        {/* Events List */}
        <div className="bg-coal-800 border-2 border-asphalt-600">
          <div className="p-6 border-b border-asphalt-600">
            <h2 className="text-xl font-industrial text-gray-100 tracking-wide uppercase">
              EVENTS ({filteredEvents.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-industrial-green-600 mx-auto mb-4"></div>
              <p className="text-gray-400 font-condensed uppercase tracking-wide">
                Loading events...
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🎸</div>
              <p className="text-gray-400 text-xl font-condensed uppercase tracking-wide">
                No Events Found
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

                      <div className="flex items-center space-x-4 mb-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">📊</span>
                          <span className="text-gray-200">{event.fonte}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">⚙️</span>
                          <span className="text-gray-200">{event.tipo_inserimento}</span>
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
                      {(event.status || 'approved') === 'pending' && (
                        <>
                          <button
                            onClick={() => updateEventStatus(event.id, 'approved')}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 flex items-center space-x-1"
                          >
                            <Check className="h-3 w-3" />
                            <span>APPROVE</span>
                          </button>
                          <button
                            onClick={() => updateEventStatus(event.id, 'rejected')}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 flex items-center space-x-1"
                          >
                            <X className="h-3 w-3" />
                            <span>REJECT</span>
                          </button>
                        </>
                      )}
                      
                      {(event.status || 'approved') === 'rejected' && (
                        <button
                          onClick={() => updateEventStatus(event.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 flex items-center space-x-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>APPROVE</span>
                        </button>
                      )}

                      {(event.status || 'approved') === 'approved' && (
                        <button
                          onClick={() => updateEventStatus(event.id, 'rejected')}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 flex items-center space-x-1"
                        >
                          <X className="h-3 w-3" />
                          <span>REJECT</span>
                        </button>
                      )}

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
                        onClick={() => deleteEvent(event.id)}
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

      {/* Import Modal */}
      {showImportModal && (
        <ImportEvents 
          onEventsImported={() => {
            fetchEvents();
            setShowImportModal(false);
          }} 
        />
      )}
    </div>
  );
}
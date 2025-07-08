import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Check, X, Trash2, Edit, Plus, Upload, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import EventImage from './EventImage';
import ImportEvents from './ImportEvents';

interface AdminPanelProps {
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onLogout: () => Promise<void>;
  onBackToMain: () => void;
}

export default function AdminPanel({ 
  isAuthenticated,
  onAuthRequired, 
  onLogout, 
  onBackToMain 
}: AdminPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showImport, setShowImport] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
  }, [isAuthenticated, onAuthRequired]);

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('eventi_prog')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (eventId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('eventi_prog')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;
      
      await fetchEvents();
      
      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('eventUpdated'));
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
      
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const exportEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('eventi_prog')
        .select('*')
        .order('data_ora', { ascending: true });

      if (error) throw error;

      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `progdealer-events-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting events:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    };
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-600 text-white';
      case 'approved':
        return 'bg-green-600 text-white';
      case 'rejected':
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const filteredEvents = events;
  const pendingCount = events.filter(e => e.status === 'pending').length;

  // Show loading or authentication required state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-coal-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-industrial-green-600 mx-auto mb-4" />
          <p className="text-gray-400 text-xl font-condensed uppercase tracking-wide">
            AUTHENTICATION REQUIRED
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coal-900">
      {/* Header */}
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToMain}
                className="industrial-button flex items-center space-x-2"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>BACK TO EVENTS</span>
              </button>
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-industrial-green-600" />
                <h1 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
                  ADMIN PANEL
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowImport(true)}
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
        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-8">
          {[
            { key: 'pending', label: 'PENDING', count: pendingCount },
            { key: 'approved', label: 'APPROVED', count: events.filter(e => e.status === 'approved').length },
            { key: 'rejected', label: 'REJECTED', count: events.filter(e => e.status === 'rejected').length },
            { key: 'all', label: 'ALL', count: events.length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-4 py-2 font-condensed font-bold uppercase tracking-wide text-sm border-2 transition-all duration-200 ${
                filter === key
                  ? 'bg-industrial-green-600 border-industrial-green-600 text-white'
                  : 'bg-transparent border-asphalt-500 text-gray-300 hover:border-industrial-green-600 hover:text-white'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Events List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-coal-800 border border-asphalt-600 p-6 animate-pulse">
                <div className="flex space-x-4">
                  <div className="w-32 h-24 bg-asphalt-700 rounded"></div>
                  <div className="flex-1">
                    <div className="h-6 bg-asphalt-700 mb-3 rounded"></div>
                    <div className="h-4 bg-asphalt-700 w-3/4 mb-2 rounded"></div>
                    <div className="h-4 bg-asphalt-700 w-1/2 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">📋</div>
            <p className="text-gray-400 text-2xl font-industrial uppercase tracking-wide">
              NO {filter.toUpperCase()} EVENTS
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const dateInfo = formatDate(event.data_ora);
              
              return (
                <div
                  key={event.id}
                  className="bg-coal-800 border border-asphalt-600 p-6 hover:border-asphalt-500 transition-colors duration-200"
                >
                  <div className="flex space-x-6">
                    {/* Event Image */}
                    <div className="w-32 h-24 flex-shrink-0 overflow-hidden border border-asphalt-500">
                      <EventImage
                        src={event.immagine}
                        alt={event.nome_evento}
                        className="w-full h-full object-cover"
                        placeholderClassName="w-full h-full"
                      />
                    </div>
                    
                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-gray-100 leading-tight pr-4">
                          {event.nome_evento}
                        </h3>
                        <span className={`inline-flex items-center px-3 py-1 text-sm font-bold uppercase tracking-wide ${getStatusBadge(event.status)}`}>
                          {event.status || 'approved'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-500 uppercase tracking-wide block">DATE</span>
                          <span className="text-gray-200">{dateInfo.date}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase tracking-wide block">TIME</span>
                          <span className="text-gray-200">{dateInfo.time}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase tracking-wide block">CITY</span>
                          <span className="text-gray-200">{event.città}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 uppercase tracking-wide block">VENUE</span>
                          <span className="text-gray-200">{event.venue}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="px-2 py-1 bg-industrial-green-600 text-white text-xs font-bold uppercase tracking-wide">
                            {event.sottogenere}
                          </span>
                          <span className="text-gray-400 text-xs uppercase tracking-wide">
                            {event.tipo_inserimento === 'manual' ? '👤 USER SUBMITTED' : '🤖 SCRAPED'}
                          </span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          {event.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateEventStatus(event.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700 text-white p-2 transition-colors duration-200"
                                title="APPROVE EVENT"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => updateEventStatus(event.id, 'rejected')}
                                className="bg-red-600 hover:bg-red-700 text-white p-2 transition-colors duration-200"
                                title="REJECT EVENT"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="bg-burgundy-600 hover:bg-burgundy-700 text-white p-2 transition-colors duration-200"
                            title="DELETE EVENT"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Import Modal */}
      {showImport && (
        <ImportEvents
          onEventsImported={() => {
            fetchEvents();
            setShowImport(false);
            // Dispatch custom event for real-time updates
            window.dispatchEvent(new CustomEvent('eventUpdated'));
          }}
        />
      )}
    </div>
  );
}
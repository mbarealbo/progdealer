import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  MapPin,
  Music,
  Users,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import CityAutocomplete from './CityAutocomplete';
import ImportEvents from './ImportEvents';
import EventImage from './EventImage';

interface AdminPanelProps {
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onLogout: () => void;
  onBackToMain: () => void;
}

export default function AdminPanel({ isAuthenticated, onAuthRequired, onLogout, onBackToMain }: AdminPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    fetchEvents();
  }, [isAuthenticated]);

  useEffect(() => {
    applyFilters();
  }, [events, searchTerm, statusFilter]);

  const fetchEvents = async () => {
    try {
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

  const applyFilters = () => {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.nome_evento.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.città.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => 
        (event.status || 'approved') === statusFilter
      );
    }

    setFilteredEvents(filtered);
  };

  const updateEventStatus = async (eventId: string, status: 'pending' | 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('eventi_prog')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;
      
      setEvents(events.map(event => 
        event.id === eventId ? { ...event, status } : event
      ));
    } catch (error) {
      console.error('Error updating event status:', error);
      alert('Error updating event status');
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('eventi_prog')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      setEvents(events.filter(event => event.id !== eventId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event');
    }
  };

  const deleteAllEvents = async () => {
    try {
      const { error } = await supabase
        .from('eventi_prog')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      
      setEvents([]);
      setShowDeleteAllConfirm(false);
    } catch (error) {
      console.error('Error deleting all events:', error);
      alert('Error deleting all events');
    }
  };

  const saveEditedEvent = async (updatedEvent: Event) => {
    try {
      const { error } = await supabase
        .from('eventi_prog')
        .update({
          nome_evento: updatedEvent.nome_evento,
          data_ora: updatedEvent.data_ora,
          venue: updatedEvent.venue,
          città: updatedEvent.città,
          sottogenere: updatedEvent.sottogenere,
          descrizione: updatedEvent.descrizione,
          artisti: updatedEvent.artisti,
          orario: updatedEvent.orario,
          link: updatedEvent.link,
          immagine: updatedEvent.immagine,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedEvent.id);

      if (error) throw error;
      
      setEvents(events.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      ));
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Error updating event');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status?: string) => {
    const eventStatus = status || 'approved';
    switch (eventStatus) {
      case 'pending':
        return { bg: 'bg-yellow-900', text: 'text-yellow-300', border: 'border-yellow-600', label: 'PENDING' };
      case 'approved':
        return { bg: 'bg-industrial-green-900', text: 'text-industrial-green-300', border: 'border-industrial-green-600', label: 'APPROVED' };
      case 'rejected':
        return { bg: 'bg-burgundy-900', text: 'text-burgundy-300', border: 'border-burgundy-600', label: 'REJECTED' };
      default:
        return { bg: 'bg-industrial-green-900', text: 'text-industrial-green-300', border: 'border-industrial-green-600', label: 'APPROVED' };
    }
  };

  const pendingCount = events.filter(event => (event.status || 'approved') === 'pending').length;

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-coal-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-industrial-green-600 mx-auto mb-4" />
          <p className="text-gray-400 text-xl font-industrial uppercase tracking-wide">
            LOADING ADMIN PANEL...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coal-900 bg-noise">
      {/* Header */}
      <header className="bg-coal-800 border-b-2 border-asphalt-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBackToMain}
                className="industrial-button flex items-center space-x-2"
                title="BACK TO MAIN"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden md:inline">BACK</span>
              </button>
              <Shield className="h-8 w-8 text-industrial-green-600 mr-4" />
              <h1 className="text-3xl font-industrial text-gray-100 tracking-wide uppercase">
                ADMIN PANEL
              </h1>
              {pendingCount > 0 && (
                <span className="ml-4 bg-yellow-600 text-black px-3 py-1 text-sm font-bold rounded">
                  {pendingCount} PENDING
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={onLogout}
                className="industrial-button text-sm"
                title="LOGOUT"
              >
                LOGOUT
              </button>
              <div className="text-gray-400 font-condensed uppercase tracking-wide">
                <span className="text-lg font-bold">
                  {filteredEvents.length} / {events.length} EVENTS
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="SEARCH EVENTS..."
                  className="pl-10 pr-4 py-2 bg-coal-800 border-2 border-asphalt-600 text-gray-100 font-condensed uppercase tracking-wide text-sm focus:outline-none focus:border-industrial-green-600"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-coal-800 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed uppercase tracking-wide text-sm focus:outline-none focus:border-industrial-green-600"
              >
                <option value="all">ALL STATUS</option>
                <option value="pending">PENDING</option>
                <option value="approved">APPROVED</option>
                <option value="rejected">REJECTED</option>
              </select>
            </div>

            {/* Danger Zone */}
            <button
              onClick={() => setShowDeleteAllConfirm(true)}
              className="bg-burgundy-800 border-2 border-burgundy-600 text-white px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:bg-burgundy-700 transition-all duration-200 text-sm flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>DELETE ALL EVENTS</span>
            </button>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-coal-800 border-2 border-asphalt-600">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <AlertTriangle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-xl font-industrial uppercase tracking-wide">
                NO EVENTS FOUND
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-asphalt-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-condensed font-bold text-gray-300 uppercase tracking-wide">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-condensed font-bold text-gray-300 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-condensed font-bold text-gray-300 uppercase tracking-wide">Venue</th>
                    <th className="px-4 py-3 text-left text-xs font-condensed font-bold text-gray-300 uppercase tracking-wide">City</th>
                    <th className="px-4 py-3 text-left text-xs font-condensed font-bold text-gray-300 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-condensed font-bold text-gray-300 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-asphalt-600">
                  {filteredEvents.map((event) => {
                    const statusBadge = getStatusBadge(event.status);
                    return (
                      <tr key={event.id} className="hover:bg-asphalt-700 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-condensed font-bold text-gray-100 uppercase">
                              {event.nome_evento}
                            </div>
                            <div className="text-xs text-gray-400 font-condensed uppercase">
                              {event.sottogenere}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 font-condensed">
                          {formatDate(event.data_ora)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 font-condensed">
                          {event.venue}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 font-condensed">
                          {event.città}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-condensed font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border} uppercase tracking-wide`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedEvent(event)}
                              className="bg-transparent border border-asphalt-500 text-gray-300 p-1 hover:border-industrial-green-600 hover:text-white transition-all duration-200"
                              title="VIEW DETAILS"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="bg-transparent border border-asphalt-500 text-gray-300 p-1 hover:border-yellow-600 hover:text-white transition-all duration-200"
                              title="EDIT EVENT"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(event.id)}
                              className="bg-transparent border border-asphalt-500 text-gray-300 p-1 hover:border-burgundy-600 hover:text-white transition-all duration-200"
                              title="DELETE EVENT"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Import Events - Admin Only */}
      <ImportEvents onEventsImported={fetchEvents} />

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onStatusChange={updateEventStatus}
        />
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={saveEditedEvent}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmationModal
          title="DELETE EVENT"
          message="Are you sure you want to delete this event? This action cannot be undone."
          onConfirm={() => deleteEvent(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
          confirmText="DELETE"
          confirmStyle="bg-burgundy-800 border-burgundy-600 hover:bg-burgundy-700"
        />
      )}

      {/* Delete All Confirmation */}
      {showDeleteAllConfirm && (
        <ConfirmationModal
          title="DELETE ALL EVENTS"
          message="⚠️ WARNING: This will permanently delete ALL events in the database. This action cannot be undone. Are you absolutely sure?"
          onConfirm={deleteAllEvents}
          onCancel={() => setShowDeleteAllConfirm(false)}
          confirmText="DELETE ALL EVENTS"
          confirmStyle="bg-burgundy-800 border-burgundy-600 hover:bg-burgundy-700"
        />
      )}
    </div>
  );
}

// Event Details Modal Component
function EventDetailsModal({ 
  event, 
  onClose, 
  onStatusChange 
}: { 
  event: Event; 
  onClose: () => void; 
  onStatusChange: (id: string, status: 'pending' | 'approved' | 'rejected') => void;
}) {
  const statusBadge = {
    pending: { bg: 'bg-yellow-900', text: 'text-yellow-300', border: 'border-yellow-600' },
    approved: { bg: 'bg-industrial-green-900', text: 'text-industrial-green-300', border: 'border-industrial-green-600' },
    rejected: { bg: 'bg-burgundy-900', text: 'text-burgundy-300', border: 'border-burgundy-600' }
  };

  const currentStatus = event.status || 'approved';
  const badge = statusBadge[currentStatus as keyof typeof statusBadge];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
            EVENT DETAILS
          </h2>
          <button
            onClick={onClose}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Image */}
          <div className="lg:col-span-1">
            <div className="w-full h-48 bg-asphalt-700 border border-asphalt-500 flex items-center justify-center relative overflow-hidden">
              <EventImage
                src={event.immagine}
                alt={event.nome_evento}
                className="w-full h-full object-cover"
                placeholderClassName="w-full h-48"
              />
            </div>
          </div>

          {/* Event Details */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-xl font-industrial text-gray-100 mb-2 tracking-wide uppercase">
                {event.nome_evento}
              </h3>
              <div className="w-16 h-0.5 bg-burgundy-600"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-gray-300 font-condensed">
                <Calendar className="h-5 w-5 mr-3 text-industrial-green-600" />
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500 block">DATE & TIME</span>
                  <span>{new Date(event.data_ora).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>

              <div className="flex items-center text-gray-300 font-condensed">
                <MapPin className="h-5 w-5 mr-3 text-industrial-green-600" />
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500 block">VENUE</span>
                  <span>{event.venue}</span>
                </div>
              </div>

              <div className="flex items-center text-gray-300 font-condensed">
                <MapPin className="h-5 w-5 mr-3 text-industrial-green-600" />
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500 block">CITY</span>
                  <span>{event.città}</span>
                </div>
              </div>

              <div className="flex items-center text-gray-300 font-condensed">
                <Music className="h-5 w-5 mr-3 text-industrial-green-600" />
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-500 block">SUBGENRE</span>
                  <span className="uppercase">{event.sottogenere}</span>
                </div>
              </div>

              {event.artisti && event.artisti.length > 0 && (
                <div className="flex items-center text-gray-300 font-condensed md:col-span-2">
                  <Users className="h-5 w-5 mr-3 text-industrial-green-600" />
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">ARTISTS</span>
                    <span>{event.artisti.join(', ')}</span>
                  </div>
                </div>
              )}

              {event.orario && (
                <div className="flex items-center text-gray-300 font-condensed">
                  <Clock className="h-5 w-5 mr-3 text-industrial-green-600" />
                  <div>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">TIME INFO</span>
                    <span>{event.orario}</span>
                  </div>
                </div>
              )}
            </div>

            {event.descrizione && (
              <div>
                <span className="text-xs uppercase tracking-wide text-gray-500 block mb-2">DESCRIPTION</span>
                <p className="text-gray-300 font-condensed">{event.descrizione}</p>
              </div>
            )}

            {/* Status and Actions */}
            <div className="pt-4 border-t border-asphalt-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-xs uppercase tracking-wide text-gray-500">STATUS:</span>
                  <span className={`inline-flex items-center px-3 py-1 text-sm font-condensed font-bold ${badge.bg} ${badge.text} border ${badge.border} uppercase tracking-wide`}>
                    {currentStatus.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onStatusChange(event.id, 'approved')}
                    className="bg-industrial-green-800 border-2 border-industrial-green-600 text-white px-3 py-1 text-sm font-condensed font-bold uppercase tracking-wide hover:bg-industrial-green-700 transition-all duration-200 flex items-center space-x-1"
                  >
                    <Check className="h-4 w-4" />
                    <span>APPROVE</span>
                  </button>
                  <button
                    onClick={() => onStatusChange(event.id, 'rejected')}
                    className="bg-burgundy-800 border-2 border-burgundy-600 text-white px-3 py-1 text-sm font-condensed font-bold uppercase tracking-wide hover:bg-burgundy-700 transition-all duration-200 flex items-center space-x-1"
                  >
                    <X className="h-4 w-4" />
                    <span>REJECT</span>
                  </button>
                  <button
                    onClick={() => onStatusChange(event.id, 'pending')}
                    className="bg-yellow-800 border-2 border-yellow-600 text-white px-3 py-1 text-sm font-condensed font-bold uppercase tracking-wide hover:bg-yellow-700 transition-all duration-200"
                  >
                    PENDING
                  </button>
                </div>
              </div>
            </div>

            {/* Event Link */}
            {event.link && (
              <div className="pt-4">
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-industrial-green-600 hover:text-white transition-all duration-200 text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>VIEW EVENT</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Event Modal Component
function EditEventModal({ 
  event, 
  onClose, 
  onSave 
}: { 
  event: Event; 
  onClose: () => void; 
  onSave: (event: Event) => void;
}) {
  const [editedEvent, setEditedEvent] = useState<Event>({ ...event });
  const [artists, setArtists] = useState<string[]>(
    event.artisti && event.artisti.length > 0 ? event.artisti : ['']
  );

  const handleChange = (field: keyof Event, value: any) => {
    setEditedEvent({ ...editedEvent, [field]: value });
  };

  const handleArtistChange = (index: number, value: string) => {
    const newArtists = [...artists];
    newArtists[index] = value;
    setArtists(newArtists);
  };

  const addArtist = () => {
    setArtists([...artists, '']);
  };

  const removeArtist = (index: number) => {
    if (artists.length > 1) {
      setArtists(artists.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    const filteredArtists = artists.filter(artist => artist.trim() !== '');
    const finalEvent = {
      ...editedEvent,
      artisti: filteredArtists.length > 0 ? filteredArtists : []
    };
    onSave(finalEvent);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
            EDIT EVENT
          </h2>
          <button
            onClick={onClose}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                EVENT NAME
              </label>
              <input
                type="text"
                value={editedEvent.nome_evento}
                onChange={(e) => handleChange('nome_evento', e.target.value)}
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                DATE & TIME
              </label>
              <input
                type="datetime-local"
                value={editedEvent.data_ora.slice(0, 16)}
                onChange={(e) => handleChange('data_ora', e.target.value)}
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                VENUE
              </label>
              <input
                type="text"
                value={editedEvent.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                CITY
              </label>
              <CityAutocomplete
                value={editedEvent.città}
                onChange={(value, data) => {
                  handleChange('città', value);
                  // Could store additional city data if needed for future features
                }}
                placeholder="CITY"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                SUBGENRE
              </label>
              <input
                type="text"
                value={editedEvent.sottogenere}
                onChange={(e) => handleChange('sottogenere', e.target.value)}
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                TIME INFO
              </label>
              <input
                type="text"
                value={editedEvent.orario || ''}
                onChange={(e) => handleChange('orario', e.target.value)}
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
              />
            </div>
          </div>

          {/* Artists */}
          <div>
            <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
              ARTISTS
            </label>
            <div className="space-y-2">
              {artists.map((artist, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => handleArtistChange(index, e.target.value)}
                    className="flex-1 bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                    placeholder={`ARTIST ${index + 1}`}
                  />
                  {artists.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArtist(index)}
                      className="bg-burgundy-800 border-2 border-burgundy-600 text-white p-2 hover:bg-burgundy-700 transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addArtist}
                className="industrial-button flex items-center space-x-2 text-sm"
              >
                <Users className="h-4 w-4" />
                <span>ADD ARTIST</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
              DESCRIPTION
            </label>
            <textarea
              value={editedEvent.descrizione || ''}
              onChange={(e) => handleChange('descrizione', e.target.value)}
              rows={3}
              className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                EVENT LINK
              </label>
              <input
                type="url"
                value={editedEvent.link || ''}
                onChange={(e) => handleChange('link', e.target.value)}
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                IMAGE URL
              </label>
              <input
                type="url"
                value={editedEvent.immagine || ''}
                onChange={(e) => handleChange('immagine', e.target.value)}
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-4 pt-6 mt-6 border-t border-asphalt-600">
          <button
            onClick={onClose}
            className="flex-1 bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-500 hover:text-white transition-all duration-200 text-sm"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-industrial-green-800 border-2 border-industrial-green-600 text-white px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 transition-all duration-200 text-sm"
          >
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
function ConfirmationModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  confirmStyle
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText: string;
  confirmStyle: string;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-md">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-industrial text-gray-100 mb-4 tracking-wide uppercase">
            {title}
          </h2>
          <p className="text-gray-300 font-condensed mb-6 leading-relaxed">
            {message}
          </p>
          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-industrial-green-500 hover:text-white transition-all duration-200 text-sm"
            >
              CANCEL
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 ${confirmStyle} text-white px-4 py-2 uppercase tracking-wide font-condensed font-bold transition-all duration-200 text-sm`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
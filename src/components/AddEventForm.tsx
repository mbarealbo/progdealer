import React, { useState } from 'react';
import { Plus, X, Check, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { supabase, classifySubgenre } from '../lib/supabase';
import { PROG_SUBGENRES } from '../types/event';
import CityAutocomplete from './CityAutocomplete';
import EventImage from './EventImage';

interface AddEventFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onEventAdded: () => void;
  onAuthRequired?: () => void;
  isAuthenticated?: boolean;
}

export default function AddEventForm({ 
  isOpen: externalIsOpen, 
  onClose: externalOnClose, 
  onEventAdded,
  onAuthRequired,
  isAuthenticated = false
}: AddEventFormProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [artists, setArtists] = useState<string[]>(['']);
  const [cityData, setCityData] = useState<{city: string, region: string, country: string} | null>(null);
  
  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnClose ? (value: boolean) => {
    if (!value) externalOnClose();
  } : setInternalIsOpen;

  const [formData, setFormData] = useState({
    nome_evento: '',
    data_ora: '',
    venue: '',
    città: '',
    sottogenere: '',
    descrizione: '',
    orario: '',
    link: '',
    immagine: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    console.log('Attempting to insert event with data:', {
      nome_evento: formData.nome_evento,
      data_ora: formData.data_ora,
      venue: formData.venue,
      città: formData.città,
      sottogenere: formData.sottogenere || classifySubgenre(formData.nome_evento, formData.descrizione, artists.filter(artist => artist.trim() !== '')),
      artists: artists.filter(artist => artist.trim() !== '')
    });

    try {
      // Auto-classify subgenre if not manually selected
      const finalSubgenre = formData.sottogenere || 
        classifySubgenre(
          formData.nome_evento, 
          formData.descrizione, 
          artists.filter(artist => artist.trim() !== '')
        );

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const eventData = {
        nome_evento: formData.nome_evento,
        data_ora: formData.data_ora,
        venue: formData.venue,
        città: formData.città,
        sottogenere: finalSubgenre,
        descrizione: formData.descrizione || null,
        artisti: artists.filter(artist => artist.trim() !== ''),
        orario: formData.orario || null,
        link: formData.link || '',
        immagine: formData.immagine?.trim() || null,
        fonte: 'manual-submission',
        tipo_inserimento: 'manual',
        status: 'pending',
        user_id: user.id // Explicitly set user_id
      };

      console.log('Final event data being inserted:', eventData);

      const { error } = await supabase
        .from('eventi_prog')
        .insert([eventData]);

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Event inserted successfully');

      // Silent notification to admin - don't wait for response or show errors
      try {
        console.log('Attempting to send admin notification...');
        await fetch('https://mlnmpfohtsiyjxnjwtkk.supabase.co/functions/v1/notify-albo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_email: user.email
          })
        });
        console.log('Admin notification fetch request completed');
      } catch (error) {
        // Silent failure - don't show anything to the user
        console.error('Admin notification failed (silent):', error);
      }

      // Reset form
      setFormData({
        nome_evento: '',
        data_ora: '',
        venue: '',
        città: '',
        sottogenere: '',
        descrizione: '',
        orario: '',
        link: '',
        immagine: ''
      });
      setArtists(['']);
      
      setIsOpen(false);
      setShowAdvanced(false);
      setShowSuccess(true);
      onEventAdded();

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error adding event:', error);
      
      // More detailed error message
      let errorMessage = 'ERRORE NELL\'INVIO DELLA SEGNALAZIONE';
      if (error instanceof Error) {
        errorMessage += ': ' + error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
      const newArtists = artists.filter((_, i) => i !== index);
      setArtists(newArtists);
    }
  };

  // Success Toast
  if (showSuccess) {
    return (
      <div className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 bg-industrial-green-800 border-2 border-industrial-green-600 text-white p-4 sm:p-6 z-50 flex items-center space-x-3 max-w-xs sm:max-w-none">
        <Check className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="font-condensed font-bold uppercase tracking-wide text-sm sm:text-base">
          EVENT SUBMITTED SUCCESSFULLY
        </span>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          if (!isAuthenticated && onAuthRequired) {
            onAuthRequired();
          } else {
            setIsOpen(true);
          }
        }}
        className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 bg-coal-800 hover:bg-coal-700 border-2 border-asphalt-600 hover:border-industrial-green-600 text-white p-3 sm:p-4 transition-all duration-200 z-50"
        title="SUBMIT AN EVENT"
      >
        <Plus className="h-6 w-6 sm:h-8 sm:w-8" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-4 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-industrial text-gray-100 tracking-wide uppercase">
            SUBMIT AN EVENT
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Fields - Always Visible */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                EVENT NAME *
              </label>
              <input
                type="text"
                name="nome_evento"
                value={formData.nome_evento}
                onChange={handleChange}
                required
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                placeholder="EVENT NAME"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                DATE & TIME *
              </label>
              <input
                type="datetime-local"
                name="data_ora"
                value={formData.data_ora}
                onChange={handleChange}
                required
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                VENUE *
              </label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                required
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                placeholder="VENUE NAME"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                CITY *
              </label>
              <CityAutocomplete
                value={formData.città}
                onChange={(value, data) => {
                  setFormData({ ...formData, città: value });
                  if (data) {
                    setCityData({ city: data.city, region: data.region, country: data.country });
                  }
                }}
                required
                placeholder="CITY"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
              EVENT LINK
            </label>
            <input
              type="url"
              name="link"
              value={formData.link}
              onChange={handleChange}
              className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
              placeholder="EVENT LINK (OPTIONAL)"
            />
          </div>

          {/* Advanced Options Toggle */}
          <div className="pt-4 border-t border-asphalt-600">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors duration-200"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="font-condensed font-bold uppercase tracking-wide text-sm">
                ADVANCED OPTIONS
              </span>
            </button>
          </div>

          {/* Advanced Options Section */}
          {showAdvanced && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                    SUBGENRE
                  </label>
                  <select
                    name="sottogenere"
                    value={formData.sottogenere}
                    onChange={handleChange}
                    className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                  >
                    <option value="">AUTO-DETECT FROM EVENT NAME</option>
                    {PROG_SUBGENRES.map((subgenre) => (
                      <option key={subgenre} value={subgenre}>
                        {subgenre.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                    TIME INFO
                  </label>
                  <input
                    type="text"
                    name="orario"
                    value={formData.orario}
                    onChange={handleChange}
                    className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                    placeholder="e.g. DOORS 20:00, START 21:00"
                  />
                </div>
              </div>

              {/* Artists Section with Add/Remove functionality */}
              <div>
                <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
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
                          title="REMOVE ARTIST"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addArtist}
                    className="flex items-center space-x-2 bg-industrial-green-800 border-2 border-industrial-green-600 text-white px-3 py-2 hover:bg-industrial-green-700 transition-all duration-200 text-sm font-condensed font-bold uppercase tracking-wide"
                  >
                    <Plus className="h-4 w-4" />
                    <span>ADD ARTIST</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                  DESCRIPTION
                </label>
                <textarea
                  name="descrizione"
                  value={formData.descrizione}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm resize-none"
                  placeholder="EVENT DESCRIPTION..."
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                  IMAGE URL
                </label>
                <input
                  type="url"
                  name="immagine"
                  value={formData.immagine}
                  onChange={handleChange}
                  className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                  placeholder="IMAGE URL (OPTIONAL)"
                />
              </div>
              {formData.immagine && (
                <div className="mt-2">
                  <div className="w-32 h-20 border border-asphalt-500 overflow-hidden">
                    <EventImage
                      src={formData.immagine}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      placeholderClassName="w-full h-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons - Stack on mobile */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full sm:flex-1 bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-500 hover:text-white transition-all duration-200 text-sm"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-industrial-green-600 hover:text-white transition-all duration-200 disabled:opacity-50 text-sm"
            >
              {loading ? 'SUBMITTING...' : 'SUBMIT EVENT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
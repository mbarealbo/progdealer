import React, { useState } from 'react';
import { Plus, X, Check, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { supabase, classifySubgenre } from '../lib/supabase';
import { PROG_SUBGENRES } from '../types/event';

interface AddEventFormProps {
  onEventAdded: () => void;
}

export default function AddEventForm({ onEventAdded }: AddEventFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [artists, setArtists] = useState<string[]>(['']);
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

    try {
      // Auto-classify subgenre if not manually selected
      const finalSubgenre = formData.sottogenere || 
        classifySubgenre(
          formData.nome_evento, 
          formData.descrizione, 
          artists.filter(artist => artist.trim() !== '')
        );

      const eventData = {
        nome_evento: formData.nome_evento,
        data_ora: formData.data_ora,
        venue: formData.venue,
        città: formData.città,
        sottogenere: finalSubgenre,
        descrizione: formData.descrizione || null,
        artisti: artists.filter(artist => artist.trim() !== '').length > 0 
          ? artists.filter(artist => artist.trim() !== '')
          : [],
        orario: formData.orario || null,
        link: formData.link || null,
        immagine: formData.immagine || null,
        fonte: 'manual-submission',
        tipo_inserimento: 'manual' as const
      };

      const { error } = await supabase
        .from('eventi_prog')
        .insert([eventData]);

      if (error) throw error;

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
      alert('ERRORE NELL\'INVIO DELLA SEGNALAZIONE');
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
      <div className="fixed bottom-8 right-8 bg-industrial-green-800 border-2 border-industrial-green-600 text-white p-6 z-50 flex items-center space-x-3">
        <Check className="h-6 w-6" />
        <span className="font-condensed font-bold uppercase tracking-wide">
          EVENT SUBMITTED SUCCESSFULLY
        </span>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-coal-800 hover:bg-coal-700 border-2 border-asphalt-600 hover:border-industrial-green-600 text-white p-4 transition-all duration-200 z-50"
        title="SUBMIT AN EVENT"
      >
        <Plus className="h-8 w-8" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
            SUBMIT AN EVENT
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Fields - Always Visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
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
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
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
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                CITY *
              </label>
              <input
                type="text"
                name="città"
                value={formData.città}
                onChange={handleChange}
                required
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-condensed focus:outline-none focus:border-industrial-green-600 text-sm"
                placeholder="CITY"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
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
                  <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
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
                <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
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
                <label className="block text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
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
            </div>
          )}

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-500 hover:text-white transition-all duration-200 text-sm"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-2 uppercase tracking-wide font-condensed font-bold hover:border-industrial-green-600 hover:text-white transition-all duration-200 disabled:opacity-50 text-sm"
            >
              {loading ? 'SUBMITTING...' : 'SUBMIT EVENT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
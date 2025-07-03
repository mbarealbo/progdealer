import React, { useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddEventFormProps {
  onEventAdded: () => void;
}

export default function AddEventForm({ onEventAdded }: AddEventFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nome_evento: '',
    data_ora: '',
    luogo: '',
    venue: '',
    genere: '',
    link_biglietti: ''
  });

  const genreOptions = [
    'Progressive Rock',
    'Prog Metal',
    'Symphonic Prog',
    'Psychedelic Rock',
    'Zeuhl',
    'Fusion',
    'Avant-Prog',
    'Space Rock',
    'Post-Rock',
    'Krautrock'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('eventi_prog')
        .insert([{
          ...formData,
          fonte: 'segnalazione'
        }]);

      if (error) throw error;

      // Reset form
      setFormData({
        nome_evento: '',
        data_ora: '',
        luogo: '',
        venue: '',
        genere: '',
        link_biglietti: ''
      });
      
      setIsOpen(false);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Success Toast
  if (showSuccess) {
    return (
      <div className="fixed bottom-8 right-8 bg-industrial-green-800 border-2 border-industrial-green-600 text-white p-6 z-50 flex items-center space-x-3">
        <Check className="h-6 w-6" />
        <span className="font-condensed font-bold uppercase tracking-wide">
          SEGNALAZIONE INVIATA CON SUCCESSO
        </span>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-coal-800 hover:bg-coal-700 border-2 border-asphalt-600 hover:border-industrial-green-600 text-white p-4 transition-all duration-200 z-50"
        title="SEGNALA UN EVENTO"
      >
        <Plus className="h-8 w-8" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-industrial text-gray-100 tracking-wide uppercase">
            SEGNALA UN EVENTO
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-condensed font-bold text-gray-100 mb-3 uppercase tracking-wide">
              NOME EVENTO *
            </label>
            <input
              type="text"
              name="nome_evento"
              value={formData.nome_evento}
              onChange={handleChange}
              required
              className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-3 font-condensed focus:outline-none focus:border-industrial-green-600"
              placeholder="INSERISCI IL NOME DELL'EVENTO"
            />
          </div>

          <div>
            <label className="block text-sm font-condensed font-bold text-gray-100 mb-3 uppercase tracking-wide">
              DATA E ORA *
            </label>
            <input
              type="datetime-local"
              name="data_ora"
              value={formData.data_ora}
              onChange={handleChange}
              required
              className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-3 font-condensed focus:outline-none focus:border-industrial-green-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-3 uppercase tracking-wide">
                CITTÀ *
              </label>
              <input
                type="text"
                name="luogo"
                value={formData.luogo}
                onChange={handleChange}
                required
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-3 font-condensed focus:outline-none focus:border-industrial-green-600"
                placeholder="CITTÀ"
              />
            </div>

            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-3 uppercase tracking-wide">
                VENUE *
              </label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                required
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-3 font-condensed focus:outline-none focus:border-industrial-green-600"
                placeholder="NOME DEL LOCALE"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-condensed font-bold text-gray-100 mb-3 uppercase tracking-wide">
              GENERE *
            </label>
            <select
              name="genere"
              value={formData.genere}
              onChange={handleChange}
              required
              className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-3 font-condensed focus:outline-none focus:border-industrial-green-600"
            >
              <option value="">SELEZIONA GENERE</option>
              {genreOptions.map((genre) => (
                <option key={genre} value={genre}>
                  {genre.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-condensed font-bold text-gray-100 mb-3 uppercase tracking-wide">
              LINK BIGLIETTI
            </label>
            <input
              type="url"
              name="link_biglietti"
              value={formData.link_biglietti}
              onChange={handleChange}
              className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-3 font-condensed focus:outline-none focus:border-industrial-green-600"
              placeholder="HTTPS://..."
            />
          </div>

          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-transparent border-2 border-asphalt-500 text-gray-300 px-6 py-3 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-500 hover:text-white transition-all duration-200"
            >
              ANNULLA
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-6 py-3 uppercase tracking-wide font-condensed font-bold hover:border-industrial-green-600 hover:text-white transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'INVIO...' : 'INVIA SEGNALAZIONE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
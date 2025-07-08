import React, { useState } from 'react';
import { Upload, X, Check, AlertTriangle } from 'lucide-react';
import { importEvents, classifySubgenre } from '../lib/supabase';
import { ImportEvent } from '../types/event';

interface ImportEventsProps {
  onEventsImported: () => void;
}

export default function ImportEvents({ onEventsImported }: ImportEventsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [jsonInput, setJsonInput] = useState('');

  const handleImport = async () => {
    if (!jsonInput.trim()) return;

    setLoading(true);
    setResults([]);

    try {
      const rawEvents = JSON.parse(jsonInput);
      const eventsArray = Array.isArray(rawEvents) ? rawEvents : [rawEvents];
      
      // Process and validate events
      const processedEvents: ImportEvent[] = eventsArray.map((event: any) => ({
        nome_evento: event.nome_evento || event.name || event.title || '',
        data_ora: event.data_ora || event.date || event.datetime || '',
        venue: event.venue || event.location || '',
        città: event.città || event.city || event.luogo || '',
        sottogenere: event.sottogenere || event.subgenre || 
          classifySubgenre(
            event.nome_evento || event.name || event.title || '',
            event.descrizione || event.description,
            event.artisti || event.artists
          ),
        descrizione: event.descrizione || event.description || null,
        artisti: event.artisti || event.artists || null,
        orario: event.orario || event.time || null,
        link: event.link || event.url || event.link_biglietti || '',
        immagine: event.immagine || event.image || event.copertina || null,
        fonte: event.fonte || event.source || 'import',
        tipo_inserimento: event.tipo_inserimento || 'scraped',
        event_id: event.event_id || event.id || null
      }));

      const importResults = await importEvents(processedEvents);
      setResults(importResults);
      
      if (importResults.some(r => r.success)) {
        onEventsImported();
      }
    } catch (error) {
      console.error('Import error:', error);
      setResults([{ success: false, event: 'JSON Parse Error', error: String(error) }]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setJsonInput('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-8 bg-coal-800 hover:bg-coal-700 border-2 border-asphalt-600 hover:border-industrial-green-600 text-white p-4 transition-all duration-200 z-50"
        title="IMPORT EVENTS"
      >
        <Upload className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
            IMPORT EVENTS
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* JSON Input */}
          <div>
            <label className="block text-sm font-condensed font-bold text-gray-100 mb-3 uppercase tracking-wide">
              📄 JSON DATA
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={12}
              className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-mono text-sm focus:outline-none focus:border-industrial-green-600 resize-none"
              placeholder={`Paste JSON array of events here:
[
  {
    "nome_evento": "Event Name",
    "data_ora": "2025-01-15T20:00:00",
    "venue": "Venue Name",
    "città": "City",
    "sottogenere": "Prog Metal",
    "link": "https://example.com",
    "fonte": "concertful.com",
    "tipo_inserimento": "scraped"
  }
]`}
            />
          </div>

          {/* Import Button */}
          <div className="flex space-x-4">
            <button
              onClick={handleImport}
              disabled={loading || !jsonInput.trim()}
              className="flex-1 bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:border-industrial-green-600 hover:text-white transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'IMPORTING...' : 'IMPORT EVENTS'}
            </button>
            {results.length > 0 && (
              <button
                onClick={clearResults}
                className="bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-500 hover:text-white transition-all duration-200"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="bg-coal-900 border-2 border-asphalt-600 p-4">
              <h3 className="text-lg font-industrial text-gray-100 mb-4 uppercase tracking-wide">
                IMPORT RESULTS
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-2 border ${
                      result.success
                        ? 'border-industrial-green-600 bg-industrial-green-900'
                        : 'border-burgundy-600 bg-burgundy-900'
                    }`}
                  >
                    {result.success ? (
                      <Check className="h-4 w-4 text-industrial-green-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-burgundy-400" />
                    )}
                    <div className="flex-1">
                      <span className="font-condensed font-bold text-sm uppercase">
                        {result.event}
                      </span>
                      {result.error && (
                        <p className="text-xs text-gray-400 font-condensed">
                          {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm font-condensed text-gray-400">
                <span className="text-industrial-green-400">
                  {results.filter(r => r.success).length} SUCCESS
                </span>
                {' • '}
                <span className="text-burgundy-400">
                  {results.filter(r => !r.success).length} FAILED
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
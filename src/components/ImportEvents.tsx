import React, { useState } from 'react';
import { Upload, X, Check, AlertTriangle, FileText } from 'lucide-react';
import { importEvents, classifySubgenre } from '../lib/supabase';
import { ImportEvent } from '../types/event';
import { shouldUsePlaceholder } from '../utils/imageUtils';

interface ImportEventsProps {
  onEventsImported: () => void;
}

export default function ImportEvents({ onEventsImported }: ImportEventsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      setSelectedFile(file);
      setResults([]);
    } else {
      alert('Please select a JSON file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const processFileWithPython = async (file: File): Promise<ImportEvent[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const jsonContent = e.target?.result as string;
          
          // Create a temporary file-like object for the Python script
          const tempFileName = `temp_${Date.now()}.json`;
          
          // Since we can't actually write files in the browser, we'll pass the JSON content
          // directly to a simulated Python script execution
          
          // For now, we'll simulate the Python script behavior in JavaScript
          // In a real implementation, this would call the Python script via an API endpoint
          const rawEvents = JSON.parse(jsonContent);
          const eventsArray = Array.isArray(rawEvents) ? rawEvents : [rawEvents];
          
          const processedEvents: ImportEvent[] = [];
          
          for (const event of eventsArray) {
            try {
              const nome_evento = (event.name || event.nome_evento || '').trim();
              
              // Handle date normalization
              let data_ora = event.startDate || event.data_ora || '';
              if (!data_ora) continue;
              
              try {
                // Normalize date to ISO format
                const parsedDate = new Date(data_ora);
                if (isNaN(parsedDate.getTime())) continue;
                data_ora = parsedDate.toISOString();
              } catch {
                continue;
              }
              
              // Handle location mapping
              const location = event.location || {};
              let venue = '';
              let città = '';
              
              if (typeof location === 'object' && location !== null) {
                venue = (location.name || '').trim();
                const address = location.address || {};
                città = (address.addressLocality || location.city || '').trim();
              } else {
                venue = String(location || '').trim();
                città = (event.city || '').trim();
              }
              
              const sottogenere = (event.subgenre || event.sottogenere || 'Progressive').trim();
              const link = event.url || event.link || '';
              const fonte = event.fonte || 'import';
              const tipo_inserimento = event.tipo_inserimento || 'scraped';
              const descrizione = event.description || event.descrizione || null;
              const artisti = event.artists || event.artisti || null;
              const orario = event.time || event.orario || null;
              let immagine = event.image || event.immagine || null;
              
              // Clean up image URL - set to null if it should use placeholder
              if (shouldUsePlaceholder(immagine)) {
                immagine = null;
              }
              
              const event_id = event.event_id || event.id || null;
              
              const mappedEvent: ImportEvent = {
                nome_evento,
                data_ora,
                venue,
                città,
                sottogenere,
                descrizione,
                artisti,
                orario,
                link,
                immagine,
                fonte,
                tipo_inserimento: tipo_inserimento as 'scraped' | 'manual',
                event_id
              };
              
              processedEvents.push(mappedEvent);
            } catch (error) {
              console.warn('Skipping invalid event:', error);
              continue;
            }
          }
          
          resolve(processedEvents);
        } catch (error) {
          reject(new Error(`Failed to process JSON: ${error}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setResults([]);

    try {
      // Process file with Python script simulation
      const processedEvents = await processFileWithPython(selectedFile);
      
      if (processedEvents.length === 0) {
        setResults([{ 
          success: false, 
          event: 'No valid events found', 
          error: 'No events could be processed from the uploaded file' 
        }]);
        return;
      }

      // Import processed events
      const importResults = await importEvents(processedEvents);
      setResults(importResults);
      
      if (importResults.some(r => r.success)) {
        onEventsImported();
      }
    } catch (error) {
      console.error('Import error:', error);
      setResults([{ 
        success: false, 
        event: 'Processing Error', 
        error: String(error) 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setSelectedFile(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 sm:bottom-24 right-4 sm:right-8 bg-coal-800 hover:bg-coal-700 border-2 border-asphalt-600 hover:border-industrial-green-600 text-white p-3 sm:p-4 transition-all duration-200 z-50"
        title="IMPORT EVENTS"
      >
        <Upload className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-industrial text-gray-100 tracking-wide uppercase">
            IMPORT EVENTS
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-transparent border-2 border-asphalt-500 text-gray-300 p-2 hover:border-burgundy-500 hover:text-white transition-all duration-200"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 sm:mb-3 uppercase tracking-wide">
              📁 UPLOAD JSON FILE
            </label>
            
            {/* Drag & Drop Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-industrial-green-600 bg-industrial-green-900 bg-opacity-20'
                  : 'border-asphalt-500 hover:border-asphalt-400'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-3">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-industrial-green-600" />
                  <div>
                    <p className="text-gray-100 font-condensed font-bold uppercase tracking-wide text-sm sm:text-base">
                      {selectedFile.name}
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm font-condensed uppercase tracking-wide">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-300 font-condensed font-bold uppercase tracking-wide mb-2 text-sm sm:text-base">
                    DROP JSON FILE HERE
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm font-condensed uppercase tracking-wide mb-4">
                    OR CLICK TO SELECT
                  </p>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-input"
                  />
                  <label
                    htmlFor="file-input"
                    className="industrial-button cursor-pointer inline-block text-xs sm:text-sm px-3 sm:px-4 py-2"
                  >
                    SELECT FILE
                  </label>
                </div>
              )}
            </div>

            {/* File Format Info */}
            <div className="mt-4 p-3 sm:p-4 bg-coal-900 border border-asphalt-600">
              <h4 className="text-xs sm:text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide">
                📋 SUPPORTED FORMAT
              </h4>
              <p className="text-xs text-gray-400 font-condensed mb-2">
                Upload a JSON file containing an array of event objects. The Python script will automatically map fields like:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500 font-condensed">
                <div>• <code>name</code> → <code>nome_evento</code></div>
                <div>• <code>startDate</code> → <code>data_ora</code></div>
                <div>• <code>location.name</code> → <code>venue</code></div>
                <div>• <code>location.address.addressLocality</code> → <code>città</code></div>
                <div>• <code>url</code> → <code>link</code></div>
                <div>• <code>subgenre</code> → <code>sottogenere</code></div>
              </div>
            </div>
          </div>

          {/* Import Button - Stack on mobile */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleImport}
              disabled={loading || !selectedFile}
              className="w-full sm:flex-1 bg-industrial-green-600 border-2 border-industrial-green-600 text-white px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 hover:border-industrial-green-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>PROCESSING...</span>
                </>
              ) : (
                <>
                  <span className="text-base sm:text-lg">🤖</span>
                  <span>IMPORT</span>
                </>
              )}
            </button>
            {(results.length > 0 || selectedFile) && (
              <button
                onClick={clearResults}
                className="w-full sm:w-auto bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-500 hover:text-white transition-all duration-200 text-sm"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="bg-coal-900 border-2 border-asphalt-600 p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-industrial text-gray-100 mb-3 sm:mb-4 uppercase tracking-wide">
                IMPORT RESULTS
              </h3>
              <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 sm:space-x-3 p-2 border text-xs sm:text-sm ${
                      result.success
                        ? 'border-industrial-green-600 bg-industrial-green-900'
                        : 'border-burgundy-600 bg-burgundy-900'
                    }`}
                  >
                    {result.success ? (
                      <Check className="h-3 w-3 sm:h-4 sm:w-4 text-industrial-green-400" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-burgundy-400" />
                    )}
                    <div className="flex-1">
                      <span className="font-condensed font-bold uppercase">
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
              <div className="mt-3 sm:mt-4 text-xs sm:text-sm font-condensed text-gray-400">
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
import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertTriangle, FileText, Calendar, Database } from 'lucide-react';
import { importEvents, classifySubgenre } from '../lib/supabase';
import { ImportEvent } from '../types/event';

interface ImportEventsProps {
  onEventsImported: () => void;
}

interface ImportResult {
  success: boolean;
  event: string;
  error?: string;
  action?: 'imported' | 'updated' | 'skipped';
}

interface ImportSummary {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  reasons: {
    invalidDate: number;
    missingRequired: number;
    duplicate: number;
    other: number;
  };
}

export default function ImportEvents({ onEventsImported }: ImportEventsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize date to ISO 8601 format
  const normalizeDate = (dateInput: any): string | null => {
    if (!dateInput) return null;

    try {
      let date: Date;

      if (typeof dateInput === 'string') {
        // Handle various date formats
        if (dateInput.includes('T') || dateInput.includes('Z')) {
          // Already in ISO format or similar
          date = new Date(dateInput);
        } else if (dateInput.includes('/')) {
          // Handle MM/DD/YYYY or DD/MM/YYYY formats
          date = new Date(dateInput);
        } else if (dateInput.includes('-')) {
          // Handle YYYY-MM-DD format
          date = new Date(dateInput);
        } else {
          // Try parsing as-is
          date = new Date(dateInput);
        }
      } else if (dateInput instanceof Date) {
        date = dateInput;
      } else if (typeof dateInput === 'number') {
        // Unix timestamp
        date = new Date(dateInput);
      } else {
        return null;
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }

      // Convert to ISO string and ensure it has time component
      const isoString = date.toISOString();
      
      // If the original input didn't have time, default to 20:00 (8 PM)
      if (typeof dateInput === 'string' && !dateInput.includes('T') && !dateInput.includes(':')) {
        const dateOnly = isoString.split('T')[0];
        return `${dateOnly}T20:00:00`;
      }

      return isoString;
    } catch (error) {
      return null;
    }
  };

  // Validate and process events
  const processEvents = (rawEvents: any[]): { validEvents: ImportEvent[], summary: ImportSummary } => {
    const summary: ImportSummary = {
      total: rawEvents.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      reasons: {
        invalidDate: 0,
        missingRequired: 0,
        duplicate: 0,
        other: 0
      }
    };

    const validEvents: ImportEvent[] = [];
    const seenEvents = new Set<string>();

    for (const event of rawEvents) {
      try {
        // Normalize date
        const normalizedDate = normalizeDate(event.data_ora || event.date || event.datetime);
        
        if (!normalizedDate) {
          summary.failed++;
          summary.reasons.invalidDate++;
          continue;
        }

        // Extract required fields
        const nome_evento = event.nome_evento || event.name || event.title || '';
        const venue = event.venue || event.location || '';
        const città = event.città || event.city || event.luogo || '';

        // Check required fields
        if (!nome_evento || !venue || !città) {
          summary.failed++;
          summary.reasons.missingRequired++;
          continue;
        }

        // Create deduplication key
        const dedupeKey = `${nome_evento.toLowerCase()}-${normalizedDate}-${venue.toLowerCase()}`;
        
        if (seenEvents.has(dedupeKey)) {
          summary.skipped++;
          summary.reasons.duplicate++;
          continue;
        }

        seenEvents.add(dedupeKey);

        // Process event
        const processedEvent: ImportEvent = {
          nome_evento,
          data_ora: normalizedDate,
          venue,
          città,
          sottogenere: event.sottogenere || event.subgenre || 
            classifySubgenre(
              nome_evento,
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
        };

        validEvents.push(processedEvent);
        summary.imported++;
      } catch (error) {
        summary.failed++;
        summary.reasons.other++;
      }
    }

    return { validEvents, summary };
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('Please select a valid JSON file');
      return;
    }

    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonInput(content);
    };
    reader.readAsText(file);
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) return;

    setLoading(true);
    setResults([]);
    setSummary(null);

    try {
      const rawEvents = JSON.parse(jsonInput);
      const eventsArray = Array.isArray(rawEvents) ? rawEvents : [rawEvents];
      
      // Process and validate events
      const { validEvents, summary: processSummary } = processEvents(eventsArray);
      
      if (validEvents.length === 0) {
        setSummary(processSummary);
        setResults([{
          success: false,
          event: 'No Valid Events',
          error: 'All events were skipped due to validation errors'
        }]);
        return;
      }

      // Import valid events
      const importResults = await importEvents(validEvents);
      
      // Update summary with import results
      const finalSummary = { ...processSummary };
      finalSummary.imported = importResults.filter(r => r.success).length;
      finalSummary.failed += importResults.filter(r => !r.success).length;

      setResults(importResults);
      setSummary(finalSummary);
      
      if (importResults.some(r => r.success)) {
        onEventsImported();
      }
    } catch (error) {
      console.error('Import error:', error);
      setResults([{ 
        success: false, 
        event: 'JSON Parse Error', 
        error: String(error) 
      }]);
      setSummary({
        total: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        reasons: { invalidDate: 0, missingRequired: 0, duplicate: 0, other: 1 }
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setResults([]);
    setSummary(null);
    setJsonInput('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-coal-800 hover:bg-coal-700 border-2 border-asphalt-600 hover:border-industrial-green-600 text-white p-4 transition-all duration-200 z-50"
        title="IMPORT EVENTS"
      >
        <Upload className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - File Upload */}
          <div className="space-y-6">
            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-3 uppercase tracking-wide">
                📁 UPLOAD JSON FILE
              </label>
              
              <div
                className={`relative border-2 border-dashed p-8 text-center transition-all duration-200 ${
                  dragActive
                    ? 'border-industrial-green-600 bg-industrial-green-900 bg-opacity-20'
                    : 'border-asphalt-600 hover:border-asphalt-500'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                <div className="space-y-4">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                  
                  {selectedFile ? (
                    <div className="space-y-2">
                      <p className="text-industrial-green-400 font-condensed font-bold uppercase tracking-wide">
                        FILE SELECTED
                      </p>
                      <p className="text-gray-300 font-condensed text-sm">
                        {selectedFile.name}
                      </p>
                      <p className="text-gray-500 font-condensed text-xs uppercase tracking-wide">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-300 font-condensed font-bold uppercase tracking-wide">
                        DROP JSON FILE HERE
                      </p>
                      <p className="text-gray-500 font-condensed text-sm uppercase tracking-wide">
                        OR CLICK TO BROWSE
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Manual JSON Input */}
            <div>
              <label className="block text-sm font-condensed font-bold text-gray-100 mb-3 uppercase tracking-wide">
                📝 OR PASTE JSON DATA
              </label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={8}
                className="w-full bg-coal-900 border-2 border-asphalt-600 text-gray-100 px-3 py-2 font-mono text-xs focus:outline-none focus:border-industrial-green-600 resize-none"
                placeholder={`Paste JSON array of events here:
[
  {
    "nome_evento": "Event Name",
    "data_ora": "2025-01-15T20:00:00",
    "venue": "Venue Name",
    "città": "City",
    "link": "https://example.com"
  }
]`}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleImport}
                disabled={loading || !jsonInput.trim()}
                className="flex-1 bg-industrial-green-800 border-2 border-industrial-green-600 text-white px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:bg-industrial-green-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Database className="h-4 w-4 animate-pulse" />
                    <span>PROCESSING...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>IMPORT EVENTS</span>
                  </>
                )}
              </button>
              
              {(results.length > 0 || summary) && (
                <button
                  onClick={clearAll}
                  className="bg-transparent border-2 border-asphalt-500 text-gray-300 px-4 py-3 uppercase tracking-wide font-condensed font-bold hover:border-burgundy-500 hover:text-white transition-all duration-200"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Import Summary */}
            {summary && (
              <div className="bg-coal-900 border-2 border-asphalt-600 p-4">
                <h3 className="text-lg font-industrial text-gray-100 mb-4 uppercase tracking-wide flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>IMPORT SUMMARY</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-industrial text-industrial-green-400">
                      {summary.imported}
                    </div>
                    <div className="text-xs font-condensed text-gray-400 uppercase tracking-wide">
                      IMPORTED
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-industrial text-burgundy-400">
                      {summary.failed + summary.skipped}
                    </div>
                    <div className="text-xs font-condensed text-gray-400 uppercase tracking-wide">
                      SKIPPED/FAILED
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm font-condensed">
                  <div className="flex justify-between text-gray-300">
                    <span>TOTAL PROCESSED:</span>
                    <span className="font-bold">{summary.total}</span>
                  </div>
                  
                  {summary.reasons.invalidDate > 0 && (
                    <div className="flex justify-between text-burgundy-400">
                      <span>INVALID DATES:</span>
                      <span className="font-bold">{summary.reasons.invalidDate}</span>
                    </div>
                  )}
                  
                  {summary.reasons.missingRequired > 0 && (
                    <div className="flex justify-between text-burgundy-400">
                      <span>MISSING REQUIRED:</span>
                      <span className="font-bold">{summary.reasons.missingRequired}</span>
                    </div>
                  )}
                  
                  {summary.reasons.duplicate > 0 && (
                    <div className="flex justify-between text-yellow-400">
                      <span>DUPLICATES:</span>
                      <span className="font-bold">{summary.reasons.duplicate}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detailed Results */}
            {results.length > 0 && (
              <div className="bg-coal-900 border-2 border-asphalt-600 p-4">
                <h3 className="text-lg font-industrial text-gray-100 mb-4 uppercase tracking-wide flex items-center space-x-2">
                  <Check className="h-5 w-5" />
                  <span>DETAILED RESULTS</span>
                </h3>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-2 border text-sm ${
                        result.success
                          ? 'border-industrial-green-600 bg-industrial-green-900 bg-opacity-30'
                          : 'border-burgundy-600 bg-burgundy-900 bg-opacity-30'
                      }`}
                    >
                      {result.success ? (
                        <Check className="h-4 w-4 text-industrial-green-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-burgundy-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-condensed font-bold uppercase tracking-wide truncate">
                          {result.event}
                        </div>
                        {result.error && (
                          <div className="text-xs text-gray-400 font-condensed mt-1">
                            {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Help Text */}
            <div className="bg-asphalt-700 border border-asphalt-600 p-4">
              <h4 className="text-sm font-condensed font-bold text-gray-100 mb-2 uppercase tracking-wide flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>DATE FORMAT INFO</span>
              </h4>
              <div className="text-xs font-condensed text-gray-400 space-y-1">
                <p>• Supported formats: ISO 8601, YYYY-MM-DD, MM/DD/YYYY</p>
                <p>• Times are optional (defaults to 8:00 PM)</p>
                <p>• Invalid dates will be automatically skipped</p>
                <p>• Duplicates are detected by name + date + venue</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
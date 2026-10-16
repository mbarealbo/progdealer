import { useState } from 'react';
import { Upload, X, Check, AlertTriangle, FileText } from 'lucide-react';
import { importEvents, type ImportResult } from '../lib/supabase';
import { ImportEvent } from '../types/event';
import { shouldUsePlaceholder } from '../utils/imageUtils';

interface ImportEventsProps {
  onClose: () => void;
  onEventsImported: () => void;
}

export default function ImportEvents({ onClose, onEventsImported }: ImportEventsProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
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
    if (files.length > 0) handleFileSelect(files[0]);
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
    if (files && files.length > 0) handleFileSelect(files[0]);
  };

  // Maps a schema.org-style JSON export onto our event columns.
  const processFile = async (file: File): Promise<ImportEvent[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const jsonContent = e.target?.result as string;
          const rawEvents = JSON.parse(jsonContent);
          const eventsArray = Array.isArray(rawEvents) ? rawEvents : [rawEvents];

          const processedEvents: ImportEvent[] = [];

          for (const event of eventsArray) {
            try {
              const nome_evento = (event.name || event.nome_evento || '').trim();

              let data_ora = event.startDate || event.data_ora || '';
              if (!data_ora) continue;
              const parsedDate = new Date(data_ora);
              if (isNaN(parsedDate.getTime())) continue;
              data_ora = parsedDate.toISOString();

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

              let immagine = event.image || event.immagine || null;
              if (shouldUsePlaceholder(immagine)) immagine = null;

              processedEvents.push({
                nome_evento,
                data_ora,
                venue,
                città,
                sottogenere: (event.subgenre || event.sottogenere || 'Progressive').trim(),
                descrizione: event.description || event.descrizione || null,
                artisti: event.artists || event.artisti || null,
                orario: event.time || event.orario || null,
                link: event.url || event.link || '',
                immagine,
                fonte: event.fonte || 'import',
                tipo_inserimento: (event.tipo_inserimento || 'scraped') as 'scraped' | 'manual',
                event_id: event.event_id || event.id || null,
              });
            } catch (error) {
              console.warn('Skipping invalid event:', error);
            }
          }

          resolve(processedEvents);
        } catch (error) {
          reject(new Error(`Failed to process JSON: ${error}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResults([]);

    try {
      const processedEvents = await processFile(selectedFile);

      if (processedEvents.length === 0) {
        setResults([{ success: false, event: 'No valid events found', error: 'No events could be processed from the uploaded file' }]);
        return;
      }

      const importResults = await importEvents(processedEvents);
      setResults(importResults);
      if (importResults.some((r) => r.success)) onEventsImported();
    } catch (error) {
      console.error('Import error:', error);
      setResults([{ success: false, event: 'Processing error', error: String(error) }]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setSelectedFile(null);
  };

  const ok = results.filter((r) => r.success).length;

  return (
    <div className="pd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className="pd-modal wide" role="dialog" aria-modal="true" aria-labelledby="imp-title">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Backstage</div>
            <h2 id="imp-title" style={{ marginTop: 8 }}>Import shows</h2>
          </div>
          <button className="iconx" onClick={onClose} disabled={loading} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="modal-sub">Upload a JSON file with an array of events. They are added to the catalog straight away.</p>

        <div
          className={`dropzone ${dragActive ? 'on' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {selectedFile ? (
            <div className="file">
              <FileText size={28} />
              <div>
                <strong>{selectedFile.name}</strong>
                <div className="label" style={{ marginTop: 2 }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          ) : (
            <>
              <Upload size={30} />
              <p>Drop a JSON file here, or</p>
              <input type="file" accept=".json,application/json" onChange={handleFileInput} id="imp-file" className="sr-only" />
              <label htmlFor="imp-file" className="btn btn-ghost" style={{ marginTop: 12 }}>Choose a file</label>
            </>
          )}
        </div>

        <div className="fmt">
          <strong>Supported fields</strong>
          <ul>
            <li><code>name</code> to <code>nome_evento</code></li>
            <li><code>startDate</code> to <code>data_ora</code></li>
            <li><code>location.name</code> to <code>venue</code></li>
            <li><code>location.address.addressLocality</code> to <code>città</code></li>
            <li><code>url</code> to <code>link</code></li>
            <li><code>subgenre</code> to <code>sottogenere</code></li>
          </ul>
        </div>

        <div className="modal-actions">
          {(results.length > 0 || selectedFile) && (
            <button className="ghost" onClick={clearResults} disabled={loading}>Clear</button>
          )}
          <button className="submit-btn" onClick={handleImport} disabled={loading || !selectedFile}>
            {loading ? <><span className="spin" /> Importing…</> : <><Upload size={16} /> Import</>}
          </button>
        </div>

        {results.length > 0 && (
          <div className="results">
            <div className="liner-head eyebrow" style={{ padding: '12px 0 6px' }}>Results</div>
            <ul>
              {results.map((result, index) => (
                <li key={index}>
                  {result.success ? <Check size={16} className="ok" /> : <AlertTriangle size={16} className="ko" />}
                  <div>
                    {result.event}
                    {result.error && <small>{result.error}</small>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="results-sum">{ok} imported · {results.length - ok} failed</div>
          </div>
        )}
      </div>
    </div>
  );
}

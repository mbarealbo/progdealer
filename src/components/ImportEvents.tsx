import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertTriangle, FileText, Calendar, Database, Code, Play } from 'lucide-react';
import { importEvents } from '../lib/supabase';
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
  scriptProcessed: number;
  reasons: {
    invalidDate: number;
    missingRequired: number;
    duplicate: number;
    scriptError: number;
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
  const [scriptOutput, setScriptOutput] = useState<string>('');
  const [processingStep, setProcessingStep] = useState<'idle' | 'script' | 'validation' | 'import'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Execute Python mapping script
  const executePythonScript = async (rawJsonData: string): Promise<ImportEvent[]> => {
    setProcessingStep('script');
    setScriptOutput('🐍 Executing map_event_json_for_import.py...\n');

    try {
      // Create temporary input file
      const inputFileName = `input_${Date.now()}.json`;
      const outputFileName = `output_${Date.now()}.json`;

      // Write input file
      const fs = await import('fs');
      await fs.promises.writeFile(inputFileName, rawJsonData, 'utf8');
      
      setScriptOutput(prev => prev + `📝 Created temporary input file: ${inputFileName}\n`);

      // Execute Python script
      const { spawn } = await import('child_process');
      
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', ['map_event_json_for_import.py', inputFileName, outputFileName], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
          setScriptOutput(prev => prev + `📤 ${data.toString()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
          setScriptOutput(prev => prev + `⚠️ ${data.toString()}`);
        });

        pythonProcess.on('close', async (code) => {
          try {
            // Clean up input file
            await fs.promises.unlink(inputFileName);
            setScriptOutput(prev => prev + `🗑️ Cleaned up input file\n`);

            if (code !== 0) {
              // Clean up output file if it exists
              try {
                await fs.promises.unlink(outputFileName);
              } catch (e) {
                // File might not exist, ignore
              }
              
              setScriptOutput(prev => prev + `❌ Script failed with exit code ${code}\n${stderr}\n`);
              reject(new Error(`Python script failed with exit code ${code}: ${stderr}`));
              return;
            }

            // Read processed output
            try {
              const processedData = await fs.promises.readFile(outputFileName, 'utf8');
              const processedEvents = JSON.parse(processedData);
              
              setScriptOutput(prev => prev + `✅ Script completed successfully\n`);
              setScriptOutput(prev => prev + `📊 Processed ${processedEvents.length} events\n`);

              // Clean up output file
              await fs.promises.unlink(outputFileName);
              setScriptOutput(prev => prev + `🗑️ Cleaned up output file\n`);

              resolve(processedEvents);
            } catch (readError) {
              setScriptOutput(prev => prev + `❌ Failed to read script output: ${readError}\n`);
              reject(new Error(`Failed to read script output: ${readError}`));
            }
          } catch (cleanupError) {
            setScriptOutput(prev => prev + `⚠️ Cleanup error: ${cleanupError}\n`);
            reject(new Error(`Cleanup error: ${cleanupError}`));
          }
        });

        pythonProcess.on('error', (error) => {
          setScriptOutput(prev => prev + `❌ Failed to start Python process: ${error}\n`);
          reject(new Error(`Failed to start Python process: ${error}`));
        });
      });

    } catch (error) {
      setScriptOutput(prev => prev + `❌ Script execution error: ${error}\n`);
      throw new Error(`Script execution failed: ${error}`);
    }
  };

  // Validate processed events
  const validateProcessedEvents = (processedEvents: ImportEvent[]): { validEvents: ImportEvent[], summary: ImportSummary } => {
    setProcessingStep('validation');
    
    const summary: ImportSummary = {
      total: processedEvents.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      scriptProcessed: processedEvents.length,
      reasons: {
        invalidDate: 0,
        missingRequired: 0,
        duplicate: 0,
        scriptError: 0,
        other: 0
      }
    };

    const validEvents: ImportEvent[] = [];
    const seenEvents = new Set<string>();

    for (const event of processedEvents) {
      try {
        // Check required fields (script should have handled this, but double-check)
        if (!event.nome_evento || !event.venue || !event.città || !event.data_ora) {
          summary.failed++;
          summary.reasons.missingRequired++;
          continue;
        }

        // Check date format (script should have normalized this)
        if (!event.data_ora.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          summary.failed++;
          summary.reasons.invalidDate++;
          continue;
        }

        // Create deduplication key
        const dedupeKey = `${event.nome_evento.toLowerCase()}-${event.data_ora}-${event.venue.toLowerCase()}`;
        
        if (seenEvents.has(dedupeKey)) {
          summary.skipped++;
          summary.reasons.duplicate++;
          continue;
        }

        seenEvents.add(dedupeKey);
        validEvents.push(event);
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
    setScriptOutput('');
    setProcessingStep('idle');

    try {
      // Step 1: Execute Python mapping script
      setScriptOutput('🚀 Starting import process...\n');
      const processedEvents = await executePythonScript(jsonInput);

      if (!processedEvents || processedEvents.length === 0) {
        throw new Error('Python script returned no valid events');
      }

      // Step 2: Validate processed events
      setProcessingStep('validation');
      setScriptOutput(prev => prev + '🔍 Validating processed events...\n');
      const { validEvents, summary: validationSummary } = validateProcessedEvents(processedEvents);
      
      if (validEvents.length === 0) {
        setSummary(validationSummary);
        setResults([{
          success: false,
          event: 'No Valid Events',
          error: 'All events were skipped during validation'
        }]);
        return;
      }

      // Step 3: Import to database
      setProcessingStep('import');
      setScriptOutput(prev => prev + `💾 Importing ${validEvents.length} valid events to database...\n`);
      const importResults = await importEvents(validEvents);
      
      // Update summary with import results
      const finalSummary = { ...validationSummary };
      finalSummary.imported = importResults.filter(r => r.success).length;
      finalSummary.failed += importResults.filter(r => !r.success).length;

      setResults(importResults);
      setSummary(finalSummary);
      setScriptOutput(prev => prev + `✅ Import process completed!\n`);
      
      if (importResults.some(r => r.success)) {
        onEventsImported();
      }
    } catch (error) {
      console.error('Import error:', error);
      setScriptOutput(prev => prev + `❌ Import failed: ${error}\n`);
      setResults([{ 
        success: false, 
        event: 'Script Execution Error', 
        error: String(error) 
      }]);
      setSummary({
        total: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        scriptProcessed: 0,
        reasons: { invalidDate: 0, missingRequired: 0, duplicate: 0, scriptError: 1, other: 0 }
      });
    } finally {
      setLoading(false);
      setProcessingStep('idle');
    }
  };

  const clearAll = () => {
    setResults([]);
    setSummary(null);
    setJsonInput('');
    setSelectedFile(null);
    setScriptOutput('');
    setProcessingStep('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getProcessingStepIcon = () => {
    switch (processingStep) {
      case 'script': return <Code className="h-4 w-4 animate-pulse text-yellow-400" />;
      case 'validation': return <Check className="h-4 w-4 animate-pulse text-blue-400" />;
      case 'import': return <Database className="h-4 w-4 animate-pulse text-green-400" />;
      default: return <Upload className="h-4 w-4" />;
    }
  };

  const getProcessingStepText = () => {
    switch (processingStep) {
      case 'script': return 'EXECUTING PYTHON SCRIPT...';
      case 'validation': return 'VALIDATING EVENTS...';
      case 'import': return 'IMPORTING TO DATABASE...';
      default: return 'IMPORT EVENTS';
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
      <div className="bg-coal-800 border-2 border-asphalt-600 p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Code className="h-6 w-6 text-industrial-green-600" />
            <h2 className="text-2xl font-industrial text-gray-100 tracking-wide uppercase">
              IMPORT EVENTS
            </h2>
            <span className="bg-yellow-900 border border-yellow-600 text-yellow-300 px-2 py-1 text-xs font-condensed font-bold uppercase tracking-wide">
              PYTHON SCRIPT REQUIRED
            </span>
          </div>
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
            {/* Python Script Info */}
            <div className="bg-yellow-900 border-2 border-yellow-600 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Play className="h-4 w-4 text-yellow-300" />
                <h3 className="text-sm font-condensed font-bold text-yellow-300 uppercase tracking-wide">
                  PYTHON SCRIPT EXECUTION
                </h3>
              </div>
              <p className="text-xs font-condensed text-yellow-200 leading-relaxed">
                All imports execute <code className="bg-yellow-800 px-1">map_event_json_for_import.py</code> first.
                The script maps and normalizes all fields before validation and database insert.
              </p>
            </div>

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
                placeholder={`Raw JSON data (will be processed by Python script):
[
  {
    "name": "Event Name",
    "startDate": "2025-01-15T20:00:00",
    "location": {
      "name": "Venue Name",
      "address": {
        "addressLocality": "City"
      }
    },
    "url": "https://example.com"
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
                {getProcessingStepIcon()}
                <span>{getProcessingStepText()}</span>
              </button>
              
              {(results.length > 0 || summary || scriptOutput) && (
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
            {/* Script Output */}
            {scriptOutput && (
              <div className="bg-coal-900 border-2 border-asphalt-600 p-4">
                <h3 className="text-lg font-industrial text-gray-100 mb-4 uppercase tracking-wide flex items-center space-x-2">
                  <Code className="h-5 w-5" />
                  <span>SCRIPT OUTPUT</span>
                </h3>
                <div className="bg-black border border-asphalt-500 p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                    {scriptOutput}
                  </pre>
                </div>
              </div>
            )}

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
                    <span>SCRIPT PROCESSED:</span>
                    <span className="font-bold">{summary.scriptProcessed}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>TOTAL INPUT:</span>
                    <span className="font-bold">{summary.total}</span>
                  </div>
                  
                  {summary.reasons.scriptError > 0 && (
                    <div className="flex justify-between text-burgundy-400">
                      <span>SCRIPT ERRORS:</span>
                      <span className="font-bold">{summary.reasons.scriptError}</span>
                    </div>
                  )}
                  
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
                <span>PYTHON SCRIPT INFO</span>
              </h4>
              <div className="text-xs font-condensed text-gray-400 space-y-1">
                <p>• <code>map_event_json_for_import.py</code> executes first</p>
                <p>• Script maps all field names and normalizes dates</p>
                <p>• Only processed events proceed to validation</p>
                <p>• Script failure stops the entire import process</p>
                <p>• No fallback mapping - script is mandatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
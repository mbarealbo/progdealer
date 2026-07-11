import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface Suggestion {
  placeId: string;
  main: string;
  secondary: string;
  text: string;
}

interface Props {
  value: string;
  onChange: (val: string, placeId?: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Bias suggestions to cities only. */
  cities?: boolean;
  /** Receive the picked place's coordinates (null while the field is edited by hand). */
  onCoords?: (coords: { lat: number; lng: number } | null) => void;
}

// Venue/city autocomplete backed by Google Places API (New).
// Degrades to a plain text input when no API key is configured, and never
// blocks typing if the API errors out.
export default function PlacesAutocomplete({ value, onChange, placeholder, required, cities, onCoords }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const tokenRef = useRef('');
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const fetchSuggestions = (input: string) => {
    if (!API_KEY || input.trim().length < 2) { setSuggestions([]); setOpen(false); return; }
    if (!tokenRef.current) tokenRef.current = crypto.randomUUID?.() ?? String(Math.random());
    fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY },
      body: JSON.stringify({
        input,
        sessionToken: tokenRef.current,
        languageCode: 'en',
        ...(cities ? { includedPrimaryTypes: ['(cities)'] } : {}),
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const list: Suggestion[] = (data.suggestions || [])
          .map((s: any) => s.placePrediction)
          .filter(Boolean)
          .map((p: any) => ({
            placeId: p.placeId,
            text: p.text?.text ?? '',
            main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
            secondary: p.structuredFormat?.secondaryText?.text ?? '',
          }));
        setSuggestions(list);
        setOpen(list.length > 0);
        setActive(-1);
      })
      .catch(() => { setSuggestions([]); setOpen(false); });
  };

  const handleInput = (v: string) => {
    onChange(v);
    onCoords?.(null); // typing by hand invalidates any previously picked coords
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 250);
  };

  const pick = (s: Suggestion) => {
    onChange(s.main || s.text, s.placeId);
    setSuggestions([]);
    setOpen(false);
    const token = tokenRef.current;
    tokenRef.current = ''; // end the autocomplete session

    // Fetch the place's coordinates (Place Details, same session for billing).
    if (onCoords && API_KEY) {
      const q = token ? `?sessionToken=${encodeURIComponent(token)}` : '';
      fetch(`https://places.googleapis.com/v1/places/${s.placeId}${q}`, {
        headers: { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'location' },
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => {
          const l = d.location;
          if (l && typeof l.latitude === 'number') onCoords({ lat: l.latitude, lng: l.longitude });
        })
        .catch(() => {});
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(suggestions[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="ac" ref={boxRef}>
      <input
        className="ainput"
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
      />
      {open && (
        <div className="ac-menu">
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={s.placeId}
              className={`ac-item ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(s)}
            >
              <span className="main">{s.main}</span>
              {s.secondary && <span className="sec"> · {s.secondary}</span>}
            </button>
          ))}
          <div className="ac-powered">Powered by Google</div>
        </div>
      )}
    </div>
  );
}

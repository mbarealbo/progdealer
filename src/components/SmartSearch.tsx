import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Search as SearchIcon, MapPin, Music } from 'lucide-react';
import { Event } from '../types/event';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface City { placeId: string; main: string; secondary: string; }

interface Props {
  value: string;
  onChange: (v: string) => void;
  events: Event[];
  variant?: 'bar' | 'hero';
  placeholder?: string;
}

// Public "smart" search: suggests matching shows from the catalog (instant,
// local) and real cities via Google Places. Available to everyone — no login.
export default function SmartSearch({ value, onChange, events, variant = 'bar', placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const q = value.trim().toLowerCase();
  const suggest = q.length >= 2 && !q.includes(':');
  const eventMatches = suggest
    ? events
        .filter((e) => [e.nome_evento, e.venue, e.città, ...(e.artisti || [])].join(' ').toLowerCase().includes(q))
        .slice(0, 5)
    : [];

  // flat list for keyboard nav
  const items: Array<{ type: 'event'; e: Event } | { type: 'city'; c: City }> = [
    ...eventMatches.map((e) => ({ type: 'event' as const, e })),
    ...cities.map((c) => ({ type: 'city' as const, c })),
  ];

  useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const fetchCities = (input: string) => {
    if (!API_KEY || input.trim().length < 2 || input.includes(':')) { setCities([]); return; }
    if (!tokenRef.current) tokenRef.current = crypto.randomUUID?.() ?? String(Math.random());
    fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': API_KEY },
      body: JSON.stringify({ input, sessionToken: tokenRef.current, languageCode: 'en', includedPrimaryTypes: ['(cities)'] }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setCities(
          (data.suggestions || [])
            .map((s: any) => s.placePrediction)
            .filter(Boolean)
            .slice(0, 3)
            .map((p: any) => ({
              placeId: p.placeId,
              main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
              secondary: p.structuredFormat?.secondaryText?.text ?? '',
            }))
        );
      })
      .catch(() => setCities([]));
  };

  const handleInput = (v: string) => {
    onChange(v);
    setActive(-1);
    setOpen(v.trim().length >= 2 && !v.includes(':'));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCities(v), 250);
  };

  const pickEvent = (e: Event) => { window.location.href = `/event/${e.id}`; };
  const pickCity = (name: string) => {
    onChange(name);
    setOpen(false); setCities([]); tokenRef.current = '';
    document.getElementById('shows')?.scrollIntoView({ behavior: 'smooth' });
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (ev.key === 'Enter' && active >= 0) {
      ev.preventDefault();
      const it = items[active];
      if (it.type === 'event') pickEvent(it.e); else pickCity(it.c.main);
    } else if (ev.key === 'Escape') { setOpen(false); }
  };

  const containerClass = variant === 'hero' ? 'field' : 'topsearch';

  return (
    <div className={`ac ${variant === 'hero' ? 'ac-hero' : 'ac-bar'}`} ref={boxRef}>
      <div className={containerClass}>
        <SearchIcon size={variant === 'hero' ? 18 : 16} strokeWidth={2} color="#9A9DA4" />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Search shows and cities"
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (items.length) setOpen(true); }}
        />
      </div>

      {open && items.length > 0 && (
        <div className="ac-menu">
          {eventMatches.length > 0 && <div className="ac-group">Shows</div>}
          {eventMatches.map((e, i) => (
            <button type="button" key={e.id} className={`ac-item ${active === i ? 'active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => pickEvent(e)}>
              <Music size={12} /><span className="main">{e.nome_evento}</span><span className="sec"> · {e.città}</span>
            </button>
          ))}
          {cities.length > 0 && <div className="ac-group">Cities</div>}
          {cities.map((c, i) => {
            const idx = eventMatches.length + i;
            return (
              <button type="button" key={c.placeId} className={`ac-item ${active === idx ? 'active' : ''}`} onMouseEnter={() => setActive(idx)} onClick={() => pickCity(c.main)}>
                <MapPin size={12} /><span className="main">{c.main}</span>{c.secondary && <span className="sec"> · {c.secondary}</span>}
              </button>
            );
          })}
          {API_KEY && <div className="ac-powered">Powered by Google</div>}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import {
  RefreshCw, User as UserIcon, LogOut, Plus, Home as HomeIcon, Search as SearchIcon,
  Shield, LayoutGrid, List, AlignJustify, X, MapPin, ChevronDown, SlidersHorizontal,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/auth-js';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import { useUserRole } from '../hooks/useUserRole';
import { getEventCountry, getContinent, CONTINENT_LIST, countryFlag } from '../utils/geo';
import { openCookieSettings } from '../lib/consent';
import Logo from './brand/Logo';
import SmartSearch from './SmartSearch';
import PlacesAutocomplete from './PlacesAutocomplete';
import NearYou from './home/NearYou';
import EventCard, { CardView } from './home/EventCard';

const EventsMap = lazy(() => import('./home/EventsMap'));
import AddEventForm from './AddEventForm';
import AuthRequiredModal from './AuthRequiredModal';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isAdmin } = useUserRole(currentUser);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [continent, setContinent] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [genre, setGenre] = useState('');
  const [view, setView] = useState<CardView>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locMenu, setLocMenu] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase.from('eventi_prog').select('*').order('data_ora', { ascending: true });
      if (error) throw error;
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      setEvents((data || []).filter((e: Event) => (e.status || 'approved') === 'approved' && new Date(e.data_ora) >= startOfToday));
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setCurrentUser(session?.user ?? null);
  };

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#F5F4F2';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  useEffect(() => {
    if (!locMenu) return;
    const onDoc = (ev: MouseEvent) => { if (locRef.current && !locRef.current.contains(ev.target as Node)) setLocMenu(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [locMenu]);

  useEffect(() => {
    fetchEvents();
    checkAuthStatus();
    const onApproved = () => fetchEvents();
    window.addEventListener('eventApproved', onApproved);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthenticated(!!session);
      setCurrentUser(session?.user ?? null);
    });
    return () => { window.removeEventListener('eventApproved', onApproved); subscription.unsubscribe(); };
  }, []);

  // Countries present (optionally scoped to the selected continent), with counts.
  const countries = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      const co = getEventCountry(e.città);
      if (co === 'Other') continue;
      if (continent && getContinent(co) !== continent) continue;
      m.set(co, (m.get(co) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [events, continent]);

  const genres = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) { const g = e.sottogenere?.trim(); if (g) m.set(g, (m.get(g) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  const filtered = useMemo(() => {
    let out = events;
    if (continent) out = out.filter((e) => getContinent(getEventCountry(e.città)) === continent);
    if (country) out = out.filter((e) => getEventCountry(e.città) === country);
    if (city.trim()) { const v = city.toLowerCase().trim(); out = out.filter((e) => e.città.toLowerCase().includes(v)); }
    if (dateFrom) out = out.filter((e) => e.data_ora.slice(0, 10) >= dateFrom);
    if (dateTo) out = out.filter((e) => e.data_ora.slice(0, 10) <= dateTo);
    if (genre) out = out.filter((e) => e.sottogenere === genre);
    const q = searchQuery.toLowerCase().trim();
    if (q) out = out.filter((e) =>
      [e.nome_evento, e.venue, e.città, e.sottogenere, ...(e.artisti || [])].some((f) => (f || '').toLowerCase().includes(q)));
    return out;
  }, [events, continent, country, city, dateFrom, dateTo, genre, searchQuery]);

  const scope = country || continent || 'Worldwide';
  const hasFilters = !!(continent || country || city || dateFrom || dateTo || genre || searchQuery);
  const activeCount = [continent, country, city, dateFrom, dateTo, genre].filter(Boolean).length;
  const clearAll = () => {
    setContinent(null); setCountry(null); setCity(''); setDateFrom(''); setDateTo(''); setGenre(''); setSearchQuery('');
  };

  const handleSelectEvent = (e: Event) => { window.location.href = `/event/${e.id}`; };
  const handleRefresh = () => { setLoading(true); fetchEvents(); };
  const handleLogout = async () => { await supabase.auth.signOut(); setIsAuthenticated(false); setCurrentUser(null); };
  const requestAddEvent = () => { if (!isAuthenticated) setShowAuthRequired(true); else setShowAddEvent(true); };
  const gotoShows = () => document.getElementById('shows')?.scrollIntoView({ behavior: 'smooth' });

  const gridClass = view === 'grid' ? 'grid' : view === 'list' ? 'list' : 'compact';

  return (
    <div className="pd">
      {/* ---------- Top bar ---------- */}
      <header className="topbar">
        <div className="wrap topbar-inner">
          <button className="brand" onClick={() => (window.location.href = '/')} aria-label="ProgDealer home">
            <Logo height={28} />
          </button>
          <SmartSearch variant="bar" value={searchQuery} onChange={setSearchQuery} events={events} placeholder="Search a band, venue or city…" />
          <nav className="topnav">
            <div className="loc-wrap" ref={locRef}>
              <button className={`loc-pill ${locMenu ? 'open' : ''}`} type="button" onClick={() => setLocMenu((v) => !v)} aria-haspopup="listbox" aria-expanded={locMenu} title="Filter by location">
                <MapPin size={15} stroke="#E1341E" />
                <span><b>{scope}</b></span>
                <ChevronDown size={13} className="loc-chev" />
              </button>
              {locMenu && (
                <div className="loc-menu" role="listbox">
                  <button className={!continent && !country ? 'on' : ''} onClick={() => { setContinent(null); setCountry(null); setLocMenu(false); }}>🌍 Worldwide</button>
                  <div className="loc-menu-sep">Continents</div>
                  {CONTINENT_LIST.map((c) => (
                    <button key={c} className={continent === c && !country ? 'on' : ''} onClick={() => { setContinent(c); setCountry(null); setLocMenu(false); }}>{c}</button>
                  ))}
                  {countries.length > 0 && <div className="loc-menu-sep">Countries</div>}
                  {countries.map(([co, n]) => (
                    <button key={co} className={country === co ? 'on' : ''} onClick={() => { setCountry(co); setLocMenu(false); }}>
                      <span>{countryFlag(co)} {co}</span><i>{n}</i>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="icon-btn hide-mob" onClick={handleRefresh} title="Refresh events" aria-label="Refresh"><RefreshCw size={16} /></button>
            {isAuthenticated ? (
              <>
                <a className="icon-btn hide-mob" href="/userarea" title="Your area" aria-label="Your area"><UserIcon size={16} /></a>
                <button className="icon-btn hide-mob" onClick={handleLogout} title="Log out" aria-label="Log out"><LogOut size={16} /></button>
              </>
            ) : (
              <a className="btn btn-ghost hide-mob" href="/login">Sign in</a>
            )}
            <button className="btn btn-accent" onClick={requestAddEvent}><Plus size={16} /> Add a show</button>
          </nav>
        </div>
      </header>

      {/* ---------- HERO: the map ---------- */}
      <section className="hero-map" id="map">
        <div className="wrap">
          <div className="hm-head">
            <div>
              <div className="eyebrow">Live progressive music · worldwide</div>
              <h1>Every prog show, on the map.</h1>
            </div>
            <div className="hm-meta">
              <span className="live">● {filtered.length} {filtered.length === 1 ? 'show' : 'shows'}</span>
              <span className="dot" />
              <span>in <b>{scope}</b></span>
            </div>
          </div>

          {/* Location filter — drives both the map and the list */}
          <div className="locbar">
            <button className={`lc ${!continent && !country ? 'on' : ''}`} onClick={() => { setContinent(null); setCountry(null); }}>🌍 Worldwide</button>
            {CONTINENT_LIST.map((c) => (
              <button key={c} className={`lc ${continent === c ? 'on' : ''}`} onClick={() => { setContinent(continent === c ? null : c); setCountry(null); }}>{c}</button>
            ))}
          </div>
          {countries.length > 0 && (
            <div className="ctybar">
              {countries.map(([co, n]) => (
                <button key={co} className={`cty ${country === co ? 'on' : ''}`} onClick={() => setCountry(country === co ? null : co)}>
                  {countryFlag(co)} {co} <i>{n}</i>
                </button>
              ))}
            </div>
          )}

          <Suspense fallback={<div className="pd-map pd-map-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="label">Loading map…</span></div>}>
            {!loading && events.length > 0
              ? <EventsMap events={filtered} onCity={(c) => { setCity(c); gotoShows(); }} />
              : <div className="pd-map pd-map-hero" />}
          </Suspense>
        </div>
      </section>

      {/* ---------- Shows ---------- */}
      <section className="block" id="shows">
        <div className="wrap">
          <div className="shows-bar">
            <div className="sb-title"><h2>Upcoming shows</h2><span className="num">{filtered.length}</span></div>
            <div className="sb-controls">
              <button className="filters-btn" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={15} /> Filters{activeCount > 0 && <i>{activeCount}</i>}</button>
              <div className="ctl-city"><PlacesAutocomplete value={city} onChange={(v) => setCity(v)} cities placeholder="City…" /></div>
              <label className="ctl"><span>From</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
              <label className="ctl"><span>To</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
              <select className="ctl-sel" value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">All genres</option>
                {genres.map(([g, n]) => <option key={g} value={g}>{g} ({n})</option>)}
              </select>
              {hasFilters && <button className="ctl-clear" onClick={clearAll}><X size={14} /> Clear</button>}
              <div className="viewtoggle" role="group" aria-label="View">
                <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} title="Grid" aria-label="Grid view"><LayoutGrid size={16} /></button>
                <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} title="List" aria-label="List view"><List size={16} /></button>
                <button className={view === 'compact' ? 'on' : ''} onClick={() => setView('compact')} title="Compact" aria-label="Compact view"><AlignJustify size={16} /></button>
              </div>
            </div>
          </div>

          {/* Mobile-only quick nation filter */}
          {countries.length > 0 && (
            <div className="nation-quick" role="group" aria-label="Filter shows by country">
              <button className={`nq ${!country ? 'on' : ''}`} onClick={() => { setContinent(null); setCountry(null); }}>
                <span className="nq-flag">🌍</span> All
              </button>
              {countries.map(([co, n]) => (
                <button key={co} className={`nq ${country === co ? 'on' : ''}`} onClick={() => setCountry(country === co ? null : co)}>
                  <span className="nq-flag">{countryFlag(co)}</span> {co} <i>{n}</i>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="skgrid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="sk" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <h3>No shows match your filters</h3>
              <p>Try a wider location, a different date range or genre — or clear the filters.</p>
              {hasFilters && <button className="btn btn-ghost" onClick={clearAll} style={{ marginTop: 12 }}>Clear filters</button>}
            </div>
          ) : (
            <div className={gridClass}>
              {filtered.map((e) => <EventCard key={e.id} event={e} onSelect={handleSelectEvent} view={view} />)}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Near you ---------- */}
      {!loading && events.length > 0 && <NearYou events={events} onSelect={handleSelectEvent} />}

      {/* ---------- Footer ---------- */}
      <footer className="foot">
        <div className="wrap foot-top">
          <div className="foot-brand">
            <Logo height={28} />
            <span className="foot-fresh"><span className="pulse" /> Catalog refreshed automatically every 15 days</span>
          </div>
          <div className="foot-cols">
            <div>
              <span className="label">Discover</span>
              <button onClick={gotoShows}>All shows</button>
              <button onClick={() => document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' })}>Map</button>
            </div>
            <div>
              <span className="label">Contribute</span>
              <button onClick={requestAddEvent}>Add a show</button>
            </div>
            <div>
              <span className="label">Project</span>
              <a href="/privacy">Privacy</a>
              <button onClick={openCookieSettings}>Cookie settings</button>
              {isAuthenticated && <a href="/userarea">Your area</a>}
              {isAdmin && <a href="/adminarea"><Shield size={13} /> Admin</a>}
            </div>
          </div>
        </div>
        <div className="wrap">
          <p className="foot-note">
            ProgDealer — for fans who still believe a fifteen-minute track with a flute solo deserves to be heard live.
            Worldwide catalog aggregated automatically and curated by hand.
          </p>
        </div>
      </footer>

      {/* ---------- Mobile bottom nav ---------- */}
      <nav className="bnav">
        <a href="/"><HomeIcon size={19} /><span>Home</span></a>
        <button onClick={gotoShows}><SearchIcon size={19} /><span>Browse</span></button>
        <button className="fab" onClick={requestAddEvent} aria-label="Add a show"><Plus size={22} /></button>
        <a href={isAuthenticated ? '/userarea' : '/login'}><UserIcon size={19} /><span>Profile</span></a>
      </nav>

      {/* ---------- Filters sheet (mobile) ---------- */}
      {filtersOpen && (
        <div className="fsheet-backdrop" onClick={() => setFiltersOpen(false)}>
          <div className="fsheet" onClick={(e) => e.stopPropagation()}>
            <div className="fsheet-grip" />
            <div className="fsheet-head">
              <h3>Filters</h3>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="fs-group">
              <label>Location</label>
              <div className="fs-chips">
                <button className={`lc ${!continent && !country ? 'on' : ''}`} onClick={() => { setContinent(null); setCountry(null); }}>🌍 Worldwide</button>
                {CONTINENT_LIST.map((c) => (
                  <button key={c} className={`lc ${continent === c && !country ? 'on' : ''}`} onClick={() => { setContinent(c); setCountry(null); }}>{c}</button>
                ))}
              </div>
              {countries.length > 0 && (
                <div className="fs-chips" style={{ marginTop: 8 }}>
                  {countries.map(([co, n]) => (
                    <button key={co} className={`cty ${country === co ? 'on' : ''}`} onClick={() => setCountry(country === co ? null : co)}>{countryFlag(co)} {co} <i>{n}</i></button>
                  ))}
                </div>
              )}
            </div>
            <div className="fs-group">
              <label>City</label>
              <PlacesAutocomplete value={city} onChange={(v) => setCity(v)} cities placeholder="Any city…" />
            </div>
            <div className="fs-group">
              <label>Period</label>
              <div className="fs-dates">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To" />
              </div>
            </div>
            <div className="fs-group">
              <label>Genre</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">All genres</option>
                {genres.map(([g, n]) => <option key={g} value={g}>{g} ({n})</option>)}
              </select>
            </div>
            <div className="fsheet-foot">
              {hasFilters && <button className="btn btn-ghost" onClick={clearAll}>Clear all</button>}
              <button className="btn btn-solid" onClick={() => setFiltersOpen(false)}>Show {filtered.length} {filtered.length === 1 ? 'show' : 'shows'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Modals ---------- */}
      <AddEventForm isOpen={showAddEvent} onClose={() => setShowAddEvent(false)} onEventAdded={fetchEvents} onAuthRequired={() => setShowAuthRequired(true)} isAuthenticated={isAuthenticated} />
      <AuthRequiredModal isOpen={showAuthRequired} onClose={() => setShowAuthRequired(false)} />
    </div>
  );
}

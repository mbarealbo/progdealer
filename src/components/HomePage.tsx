import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { RefreshCw, User as UserIcon, LogOut, Plus, Home as HomeIcon, Search as SearchIcon, Shield } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/auth-js';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import { useUserRole } from '../hooks/useUserRole';
import { getEventCountry, countryFlag } from '../utils/geo';
import Logo from './brand/Logo';
import Waveform from './home/Waveform';
import SmartSearch from './SmartSearch';
import NearYou from './home/NearYou';
import EventCard, { isSoon } from './home/EventCard';

// Lazy-loaded so MapLibre (~320 kB gzip) stays out of the initial bundle.
const EventsMap = lazy(() => import('./home/EventsMap'));
import AddEventForm from './AddEventForm';
import AuthRequiredModal from './AuthRequiredModal';

type Filter = 'all' | 'week' | string;

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isAdmin } = useUserRole(currentUser);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('eventi_prog')
        .select('*')
        .order('data_ora', { ascending: true });
      if (error) throw error;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const upcoming = (data || []).filter(
        (e: Event) => (e.status || 'approved') === 'approved' && new Date(e.data_ora) >= startOfToday
      );
      setEvents(upcoming);
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

  // The shared <body> is dark (legacy theme). Paint it paper while the light
  // home is mounted so overscroll doesn't flash dark; restore on unmount.
  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#F5F4F2';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  useEffect(() => {
    fetchEvents();
    checkAuthStatus();
    const onApproved = () => fetchEvents();
    window.addEventListener('eventApproved', onApproved);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthenticated(!!session);
      setCurrentUser(session?.user ?? null);
    });
    return () => {
      window.removeEventListener('eventApproved', onApproved);
      subscription.unsubscribe();
    };
  }, []);

  const topSubgenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      const s = e.sottogenere?.trim();
      if (s) counts.set(s, (counts.get(s) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s]) => s);
  }, [events]);

  const filteredEvents = useMemo(() => {
    let out = events;
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      if (q.startsWith('venue:')) {
        const v = q.slice(6).trim();
        out = out.filter((e) => e.venue.toLowerCase().includes(v));
      } else if (q.startsWith('city:')) {
        const v = q.slice(5).trim();
        out = out.filter((e) => e.città.toLowerCase().includes(v));
      } else if (q.startsWith('artist:')) {
        const v = q.slice(7).trim();
        out = out.filter((e) => e.artisti?.some((a) => a.toLowerCase().includes(v)));
      } else {
        out = out.filter((e) =>
          [e.nome_evento, e.venue, e.città, e.descrizione || '', e.sottogenere, ...(e.artisti || [])]
            .some((f) => f.toLowerCase().includes(q))
        );
      }
    }
    if (activeFilter === 'week') out = out.filter((e) => isSoon(e.data_ora));
    else if (activeFilter !== 'all') out = out.filter((e) => e.sottogenere === activeFilter);
    return out;
  }, [events, searchQuery, activeFilter]);

  const countryStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events) {
      const c = getEventCountry(e.città);
      if (c !== 'Other') counts.set(c, (counts.get(c) || 0) + 1);
    }
    const arr = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const max = arr.length ? arr[0][1] : 1;
    return { arr, max };
  }, [events]);

  const handleSelectEvent = (e: Event) => { window.location.href = `/event/${e.id}`; };
  const handleRefresh = () => { setLoading(true); fetchEvents(); };
  const handleLogout = async () => { await supabase.auth.signOut(); setIsAuthenticated(false); setCurrentUser(null); };
  const requestAddEvent = () => {
    if (!isAuthenticated) setShowAuthRequired(true);
    else setShowAddEvent(true);
  };

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
            <button className="loc-pill" type="button" title="Location detection arrives with the geo update">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E1341E" strokeWidth="2.2">
                <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
              <span><b>Worldwide</b></span>
            </button>
            <button className="icon-btn hide-mob" onClick={handleRefresh} title="Refresh events" aria-label="Refresh">
              <RefreshCw size={16} />
            </button>
            {isAuthenticated ? (
              <>
                <a className="icon-btn hide-mob" href="/userarea" title="Your area" aria-label="Your area"><UserIcon size={16} /></a>
                <button className="icon-btn hide-mob" onClick={handleLogout} title="Log out" aria-label="Log out"><LogOut size={16} /></button>
              </>
            ) : (
              <a className="btn btn-ghost hide-mob" href="/login">Sign in</a>
            )}
            <button className="btn btn-accent" onClick={requestAddEvent}>
              <Plus size={16} /> Add a show
            </button>
          </nav>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="wrap">
          <div className="eyebrow">Live progressive music · worldwide</div>
          <h1>For the songs too long <em>for the radio.</em></h1>
          <p className="hero-sub">
            ProgDealer tracks progressive rock, metal and post-rock shows across the globe —
            then surfaces the ones happening near you, before they sell out.
          </p>

          <div className="hero-search">
            <SmartSearch variant="hero" value={searchQuery} onChange={setSearchQuery} events={events} placeholder="Try &ldquo;Steven Wilson&rdquo;, &ldquo;Alcatraz&rdquo;, or a city…" />
            <button className="btn btn-solid" onClick={() => document.getElementById('shows')?.scrollIntoView({ behavior: 'smooth' })}>
              Find shows
            </button>
          </div>

          <div className="hero-meta">
            <span className="live">● {events.length} upcoming</span>
            <span className="dot" />
            <span>across <b className="num">{countryStats.arr.length}</b> countries</span>
            <span className="dot" />
            <span>Catalog refreshed every <b>15 days</b></span>
          </div>
        </div>
        <Waveform className="hero-wave" />
      </section>

      {/* ---------- Near you ---------- */}
      {!loading && events.length > 0 && (
        <NearYou events={events} onSelect={handleSelectEvent} />
      )}

      {/* ---------- Map ---------- */}
      {!loading && events.length > 0 && (
        <section className="block" id="map">
          <div className="wrap">
            <div className="head">
              <div>
                <div className="eyebrow">Every show on the map</div>
                <h2>Shows worldwide</h2>
                <p>Hit the locate button to center on you. Numbered markers show how many shows are in each city.</p>
              </div>
            </div>
            <Suspense fallback={<div className="pd-map" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="label">Loading map…</span></div>}>
              <EventsMap events={events} />
            </Suspense>
          </div>
        </section>
      )}

      {/* ---------- Shows ---------- */}
      <section className="block" id="shows">
        <div className="wrap">
          <div className="head">
            <div>
              <div className="eyebrow">{filteredEvents.length} shows</div>
              <h2>Upcoming shows</h2>
            </div>
          </div>

          <div className="filters">
            <button className={`chip ${activeFilter === 'all' ? 'on' : ''}`} onClick={() => setActiveFilter('all')}>All shows</button>
            <button className={`chip ${activeFilter === 'week' ? 'on' : ''}`} onClick={() => setActiveFilter('week')}>This week</button>
            {topSubgenres.map((s) => (
              <button key={s} className={`chip ${activeFilter === s ? 'on' : ''}`} onClick={() => setActiveFilter(s)}>{s}</button>
            ))}
          </div>

          {loading ? (
            <div className="skgrid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="sk" />)}</div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty">
              <h3>No shows match your search</h3>
              <p>Try a different band, city or subgenre — or clear the filters.</p>
            </div>
          ) : (
            <div className="grid">
              {filteredEvents.map((e) => <EventCard key={e.id} event={e} onSelect={handleSelectEvent} />)}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Country browse ---------- */}
      {countryStats.arr.length > 0 && (
        <section className="block">
          <div className="wrap">
            <div className="head">
              <div>
                <div className="eyebrow">One catalog · going worldwide</div>
                <h2>Browse by country</h2>
              </div>
            </div>
            <div className="regions">
              {countryStats.arr.map(([country, count]) => (
                <button key={country} className="region" onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}>
                  <span className="rn">{countryFlag(country)} {country}</span>
                  <span className="rc num">{count} {count === 1 ? 'show' : 'shows'}</span>
                  <span className="bar"><i style={{ width: `${Math.max(8, (count / countryStats.max) * 100)}%` }} /></span>
                </button>
              ))}
            </div>
            <div className="beta">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B4260F" strokeWidth="2" style={{ flex: '0 0 auto', marginTop: 1 }}>
                <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" /><circle cx="12" cy="10" r="2.4" />
              </svg>
              <span>Location-aware “near you” with distances and an interactive map arrive with the geo update — every venue gets real coordinates.</span>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Footer ---------- */}
      <footer className="foot">
        <div className="wrap foot-top">
          <div className="foot-brand">
            <Logo height={28} />
            <span className="foot-fresh"><span className="pulse" /> Catalog refreshed 4 days ago · next in 11 days</span>
          </div>
          <div className="foot-cols">
            <div>
              <span className="label">Discover</span>
              <button onClick={() => setActiveFilter('week')}>This week</button>
              <button onClick={() => document.getElementById('shows')?.scrollIntoView({ behavior: 'smooth' })}>All shows</button>
            </div>
            <div>
              <span className="label">Contribute</span>
              <button onClick={requestAddEvent}>Add a show</button>
            </div>
            <div>
              <span className="label">Project</span>
              <a href="/privacy">Privacy</a>
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
        <button onClick={() => document.getElementById('shows')?.scrollIntoView({ behavior: 'smooth' })}><SearchIcon size={19} /><span>Browse</span></button>
        <button className="fab" onClick={requestAddEvent} aria-label="Add a show"><Plus size={22} /></button>
        <a href={isAuthenticated ? '/userarea' : '/login'}><UserIcon size={19} /><span>Profile</span></a>
      </nav>

      {/* ---------- Modals ---------- */}
      <AddEventForm
        isOpen={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        onEventAdded={fetchEvents}
        onAuthRequired={() => setShowAuthRequired(true)}
        isAuthenticated={isAuthenticated}
      />
      <AuthRequiredModal isOpen={showAuthRequired} onClose={() => setShowAuthRequired(false)} />
    </div>
  );
}

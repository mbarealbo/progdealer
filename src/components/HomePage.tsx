import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import {
  RefreshCw, User as UserIcon, LogOut, Plus, Home as HomeIcon, Search as SearchIcon,
  Shield, LayoutGrid, List, AlignJustify, X, MapPin, ChevronDown, SlidersHorizontal,
} from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/auth-js';
import { Link } from 'react-router-dom';
import { supabase, fetchAllRows } from '../lib/supabase';
import { EventSummary, EVENT_SUMMARY_COLUMNS } from '../types/event';
import { useUserRole } from '../hooks/useUserRole';
import { useUrlMirror } from '../hooks/useUrlMirror';
import { useScrollRestore } from '../hooks/useScrollRestore';
import { CONTINENT_LIST } from '../utils/geo';
import { coordsForEvent, eventCountry, eventContinent } from '../utils/coords';
import { isTonight, isThisWeek } from '../utils/eventText';
import { openCookieSettings } from '../lib/consent';
import { buildCatalog } from '../lib/catalog';
import { browseLinks } from '../lib/seoHubs';
import Logo from './brand/Logo';
import SmartSearch from './SmartSearch';
import PlacesAutocomplete from './PlacesAutocomplete';
import NearYou from './home/NearYou';
import EventCard, { CardView } from './home/EventCard';
import BackToTop from './home/BackToTop';

const EventsMap = lazy(() => import('./home/EventsMap'));
import AddEventForm from './AddEventForm';
import AuthRequiredModal from './AuthRequiredModal';

const nf = new Intl.NumberFormat('en-US');
// Catalog dates are shown in UTC, like event dates: 1 Nov 2026
const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// Cards rendered per step. The full catalog stays in memory (map, counts,
// search), but only this many cards reach the DOM until "Show more".
// 48 fills complete rows at 2, 3, 4 and 6 columns.
const PAGE_SIZE = 48;

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isAdmin } = useUserRole(currentUser);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Filters, view and cards shown start from the URL (see useUrlMirror below).
  const [initial] = useState(() => new URLSearchParams(window.location.search));
  const [searchQuery, setSearchQuery] = useState(initial.get('q') ?? '');
  const [continent, setContinent] = useState<string | null>(initial.get('region'));
  const [country, setCountry] = useState<string | null>(initial.get('country'));
  const [city, setCity] = useState(initial.get('city') ?? '');
  const [dateFrom, setDateFrom] = useState(initial.get('from') ?? '');
  const [dateTo, setDateTo] = useState(initial.get('to') ?? '');
  const [genre, setGenre] = useState(initial.get('genre') ?? '');
  // Compact is the default: one light row per show, no artwork to draw.
  const [view, setView] = useState<CardView>(() => {
    const v = initial.get('view');
    return v === 'grid' || v === 'list' ? v : 'compact';
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locMenu, setLocMenu] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAuthRequired, setShowAuthRequired] = useState(false);

  const fetchEvents = async () => {
    try {
      // Filter server-side and page through: an unpaged select caps at 1000
      // rows, so past events were crowding today's out of the response.
      // Only the columns the list, map and search use (see EventSummary).
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const data = await fetchAllRows<EventSummary>((from, to) =>
        supabase
          .from('eventi_prog')
          .select(EVENT_SUMMARY_COLUMNS)
          .gte('data_ora', startOfToday.toISOString())
          .or('status.eq.approved,status.is.null')
          .order('data_ora', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to)
          .overrideTypes<EventSummary[], { merge: false }>(),
      );
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  // Last change to the catalog (a scraper import, an approved or edited show):
  // the real date, not the refresh schedule, so a missed run is visible.
  const fetchLastUpdate = async () => {
    const { data } = await supabase
      .from('eventi_prog')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.updated_at) setLastUpdate(data.updated_at);
  };

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    setCurrentUser(session?.user ?? null);
  };

  useEffect(() => {
    if (!locMenu) return;
    const onDoc = (ev: MouseEvent) => { if (locRef.current && !locRef.current.contains(ev.target as Node)) setLocMenu(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [locMenu]);

  useEffect(() => {
    fetchEvents();
    fetchLastUpdate();
    checkAuthStatus();
    const onApproved = () => fetchEvents();
    window.addEventListener('eventApproved', onApproved);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthenticated(!!session);
      setCurrentUser(session?.user ?? null);
    });
    return () => { window.removeEventListener('eventApproved', onApproved); subscription.unsubscribe(); };
  }, []);

  // Shows per continent, for the counts on the location chips.
  const continentCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      const c = eventContinent(e);
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }, [events]);

  // Continents to offer: only those with shows (all of them while loading).
  const continents = useMemo(
    () => (events.length ? CONTINENT_LIST.filter((c) => continentCounts.get(c) || c === continent) : CONTINENT_LIST),
    [events.length, continentCounts, continent],
  );

  // Countries present (optionally scoped to the selected continent), with counts.
  const countries = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      const co = eventCountry(e);
      if (co === 'Other') continue;
      if (continent && eventContinent(e) !== continent) continue;
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
    if (continent) out = out.filter((e) => eventContinent(e) === continent);
    if (country) out = out.filter((e) => eventCountry(e) === country);
    if (city.trim()) { const v = city.toLowerCase().trim(); out = out.filter((e) => e.città.toLowerCase().includes(v)); }
    if (dateFrom) out = out.filter((e) => e.data_ora.slice(0, 10) >= dateFrom);
    if (dateTo) out = out.filter((e) => e.data_ora.slice(0, 10) <= dateTo);
    if (genre) out = out.filter((e) => e.sottogenere === genre);
    const q = searchQuery.toLowerCase().trim();
    if (q) out = out.filter((e) =>
      [e.nome_evento, e.venue, e.città, e.sottogenere, ...(e.artisti || [])].some((f) => (f || '').toLowerCase().includes(q)));
    return out;
  }, [events, continent, country, city, dateFrom, dateTo, genre, searchQuery]);

  // How many cards to render. Tied to the filter set: any change in filters
  // starts again from the first page, without an extra render via useEffect.
  const filterKey = [continent, country, city, dateFrom, dateTo, genre, searchQuery].join('\u0001');
  const [paging, setPaging] = useState(() => ({
    key: filterKey,
    count: Math.max(PAGE_SIZE, Math.floor(Number(initial.get('n'))) || PAGE_SIZE),
  }));
  const visibleCount = paging.key === filterKey ? paging.count : PAGE_SIZE;
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const remaining = filtered.length - visible.length;
  const showMore = () => setPaging({ key: filterKey, count: visibleCount + PAGE_SIZE });

  // The list state lives in the URL (/?country=Italy&genre=Zeuhl&n=96) and the
  // scroll offset in the history entry: Back from an event page, a reload or a
  // shared link reopen the list as it was, even when the browser rebuilds the
  // page instead of restoring it from its back/forward cache.
  useUrlMirror({
    q: searchQuery.trim() ? searchQuery : null,
    region: continent,
    country,
    city: city.trim() ? city : null,
    from: dateFrom,
    to: dateTo,
    genre,
    view: view === 'compact' ? null : view,
    n: visibleCount > PAGE_SIZE ? String(visibleCount) : null,
  });
  useScrollRestore(!loading);

  // Links into the hub pages, from the upcoming shows already loaded.
  const browse = useMemo(() => (events.length ? browseLinks(buildCatalog(events)) : null), [events]);

  const stats = useMemo(() => ({
    week: filtered.filter((e) => isThisWeek(e.data_ora)).length,
    tonight: filtered.filter((e) => isTonight(e.data_ora)).length,
    located: filtered.filter((e) => coordsForEvent(e)).length,
  }), [filtered]);

  const scope = country || continent || 'Worldwide';
  const hasFilters = !!(continent || country || city || dateFrom || dateTo || genre || searchQuery);
  const activeCount = [continent, country, city, dateFrom, dateTo, genre].filter(Boolean).length;
  const clearAll = () => {
    setContinent(null); setCountry(null); setCity(''); setDateFrom(''); setDateTo(''); setGenre(''); setSearchQuery('');
  };

  const handleRefresh = () => { setLoading(true); fetchEvents(); };
  const handleLogout = async () => { await supabase.auth.signOut(); setIsAuthenticated(false); setCurrentUser(null); };
  const requestAddEvent = () => { if (!isAuthenticated) setShowAuthRequired(true); else setShowAddEvent(true); };
  const gotoShows = () => document.getElementById('shows')?.scrollIntoView({ behavior: 'smooth' });

  const gridClass = view === 'grid' ? 'grid' : view === 'list' ? 'list' : 'compact';
  const showWord = (n: number) => (n === 1 ? 'show' : 'shows');

  return (
    <div className="pd">
      {/* ---------- Top bar ---------- */}
      <header className="topbar">
        <div className="wrap topbar-inner">
          <a className="brand" href="/" aria-label="ProgDealer home">
            <Logo height={34} />
          </a>
          <SmartSearch variant="bar" value={searchQuery} onChange={setSearchQuery} events={events} placeholder="A band, a city, a venue" />
          <nav className="topnav" aria-label="Main">
            <div className="loc-wrap" ref={locRef}>
              <button className={`loc-pill ${locMenu ? 'open' : ''}`} type="button" onClick={() => setLocMenu((v) => !v)} aria-haspopup="listbox" aria-expanded={locMenu} title="Filter by location">
                <MapPin size={15} />
                <span>{scope}</span>
                <ChevronDown size={14} className="loc-chev" />
              </button>
              {locMenu && (
                <div className="loc-menu" role="listbox">
                  <button className={!continent && !country ? 'on' : ''} onClick={() => { setContinent(null); setCountry(null); setLocMenu(false); }}>Worldwide <i>{nf.format(events.length)}</i></button>
                  <div className="loc-menu-sep">Continents</div>
                  {continents.map((c) => (
                    <button key={c} className={continent === c && !country ? 'on' : ''} onClick={() => { setContinent(c); setCountry(null); setLocMenu(false); }}>
                      {c} <i>{continentCounts.get(c) || 0}</i>
                    </button>
                  ))}
                  {countries.length > 0 && <div className="loc-menu-sep">Countries</div>}
                  {countries.map(([co, n]) => (
                    <button key={co} className={country === co ? 'on' : ''} onClick={() => { setCountry(co); setLocMenu(false); }}>
                      <span>{co}</span><i>{n}</i>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="icon-btn hide-mob" onClick={handleRefresh} title="Refresh shows" aria-label="Refresh shows"><RefreshCw size={16} /></button>
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

      {/* ---------- Side A: the map ---------- */}
      <section className="hero-map" id="map">
        <div className="wrap">
          <div className="hm-head">
            <div className="hm-title">
              <div className="eyebrow">Side A · The map</div>
              <h1>Every prog show, on the map.</h1>
            </div>
            <div className="hm-side">
              <p className="hm-intro">A hand-kept catalog of progressive concerts and festivals, from Canterbury to Zeuhl. Refreshed every 15 days.</p>
              {lastUpdate && (
                <p className="hm-updated">Last update <time dateTime={lastUpdate}>{dayFmt.format(new Date(lastUpdate))}</time></p>
              )}
              <div className="hm-stats" aria-live="polite">
                <div><b>{loading ? '…' : nf.format(filtered.length)}</b><span>{scope === 'Worldwide' ? 'Upcoming' : `In ${scope}`}</span></div>
                <div><b>{loading ? '…' : nf.format(stats.week)}</b><span>This week</span></div>
                <div><b>{loading ? '…' : nf.format(stats.tonight)}</b><span>Tonight</span></div>
              </div>
            </div>
          </div>

          {/* Location filter: drives both the map and the list */}
          <div className="locbar" role="group" aria-label="Region">
            <button className={`lc ${!continent && !country ? 'on' : ''}`} aria-pressed={!continent && !country} onClick={() => { setContinent(null); setCountry(null); }}>Worldwide</button>
            {continents.map((c) => (
              <button key={c} className={`lc ${continent === c ? 'on' : ''}`} aria-pressed={continent === c} onClick={() => { setContinent(continent === c ? null : c); setCountry(null); }}>
                {c} <i>{continentCounts.get(c) || 0}</i>
              </button>
            ))}
          </div>
          {countries.length > 0 && (
            <div className="ctybar" role="group" aria-label="Country">
              {countries.map(([co, n]) => (
                <button key={co} className={`cty ${country === co ? 'on' : ''}`} aria-pressed={country === co} onClick={() => setCountry(country === co ? null : co)}>
                  {co} <i>{n}</i>
                </button>
              ))}
            </div>
          )}

          <div className="map-sleeve">
            <div className="map-sleeve-head">
              <span>PD-MAP · {loading ? '…' : nf.format(stats.located)} {showWord(stats.located)} with a venue on the map</span>
              <span>Tap a pin to see the shows in that city</span>
            </div>
            <Suspense fallback={<div className="pd-map pd-map-hero pd-map-empty"><span className="label">Loading map…</span></div>}>
              {!loading && events.length > 0
                ? <EventsMap events={filtered} onCity={(c) => { setCity(c); gotoShows(); }} />
                : <div className="pd-map pd-map-hero pd-map-empty"><span className="label">{loading ? 'Loading map…' : 'No shows to map'}</span></div>}
            </Suspense>
          </div>
        </div>
      </section>

      {/* ---------- Side B: the shows ---------- */}
      <section className="block" id="shows">
        <div className="wrap">
          <div className="shows-bar">
            <div className="sb-title">
              <div className="eyebrow">Side B</div>
              <h2>Upcoming shows<span className="num">{nf.format(filtered.length)}</span></h2>
            </div>
            <div className="sb-controls">
              <button className="filters-btn" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={15} /> Filters{activeCount > 0 && <i>{activeCount}</i>}</button>
              <div className="ctl-city"><PlacesAutocomplete value={city} onChange={(v) => setCity(v)} cities placeholder="Any city" ariaLabel="City" /></div>
              <label className="ctl"><span>From</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
              <label className="ctl"><span>To</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
              <select className="ctl-sel" value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Subgenre">
                <option value="">All subgenres</option>
                {genres.map(([g, n]) => <option key={g} value={g}>{g} ({n})</option>)}
              </select>
              {hasFilters && <button className="ctl-clear" onClick={clearAll}><X size={14} /> Clear</button>}
              <div className="viewtoggle" role="group" aria-label="View">
                <button className={view === 'compact' ? 'on' : ''} aria-pressed={view === 'compact'} onClick={() => setView('compact')} aria-label="Compact view"><AlignJustify size={16} /><span className="vt-label">Compact</span></button>
                <button className={view === 'grid' ? 'on' : ''} aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label="Sleeves view"><LayoutGrid size={16} /><span className="vt-label">Sleeves</span></button>
                <button className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="Tracklist view"><List size={16} /><span className="vt-label">Tracklist</span></button>
              </div>
            </div>
          </div>

          {loading ? (
            view === 'grid'
              ? <div className="skgrid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="sk" />)}</div>
              : <div className={view === 'list' ? 'skrows tall' : 'skrows'}>{Array.from({ length: 10 }).map((_, i) => <div key={i} className="sk" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <h3>No shows match your filters</h3>
              <p>Try a wider location, a different date range or subgenre, or clear the filters.</p>
              {hasFilters && <button className="btn btn-ghost" onClick={clearAll} style={{ marginTop: 16 }}>Clear filters</button>}
            </div>
          ) : (
            <>
              <div className={gridClass}>
                {visible.map((e, i) => <EventCard key={e.id} event={e} view={view} index={i} />)}
              </div>
              {remaining > 0 && (
                <div className="more">
                  <span className="more-count">{nf.format(visible.length)} of {nf.format(filtered.length)} {showWord(filtered.length)}</span>
                  <button className="btn btn-ghost" onClick={showMore}>
                    Show {nf.format(Math.min(PAGE_SIZE, remaining))} more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ---------- Bonus track: near you ---------- */}
      {!loading && events.length > 0 && <NearYou events={events} />}

      {/* ---------- Browse: festivals, artists, places, subgenres ---------- */}
      {!loading && browse && (
        <section className="block browse" id="browse">
          <div className="wrap">
            <div className="shows-bar">
              <div className="sb-title">
                <div className="eyebrow">Liner notes</div>
                <h2>Browse the catalog</h2>
              </div>
            </div>
            <div className="browse-grid">
              {browse.festivals.length > 0 && (
                <div className="browse-col wide">
                  <h3>Prog festivals</h3>
                  <ul className="hub-rows">
                    {browse.festivals.map((l) => (
                      <li key={l.path}><Link to={l.path}><span className="hr-name">{l.name}</span>{l.note && <span className="hr-note">{l.note}</span>}</Link></li>
                    ))}
                  </ul>
                  <Link className="browse-all" to="/festivals">All prog festivals</Link>
                </div>
              )}
              {([
                ['Artists on tour', browse.artists, { to: '/artists', label: 'All artists' }],
                ['Cities', browse.cities, { to: '/cities', label: 'All cities and countries' }],
                ['Countries', browse.countries, null],
                ['Subgenres', browse.genres, null],
              ] as const).map(([title, links, all]) => links.length > 0 && (
                <div className="browse-col" key={title}>
                  <h3>{title}</h3>
                  <div className="hub-chips">
                    {links.map((l) => <Link key={l.path} className="cty" to={l.path}>{l.name}<i>{l.note?.match(/^\d+/)?.[0]}</i></Link>)}
                  </div>
                  {all && <Link className="browse-all" to={all.to}>{all.label}</Link>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Footer ---------- */}
      <footer className="foot">
        <div className="wrap foot-top">
          <div className="foot-brand">
            <Logo height={34} />
            <span className="foot-fresh">
              <span className="pulse" />
              {lastUpdate
                ? <>Catalog updated <time dateTime={lastUpdate}>{dayFmt.format(new Date(lastUpdate))}</time></>
                : 'Catalog refreshed every 15 days'}
            </span>
          </div>
          <div className="foot-cols">
            <div>
              <span className="label">Discover</span>
              <button onClick={gotoShows}>All shows</button>
              <button onClick={() => document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' })}>Map</button>
              <Link to="/festivals">Prog festivals</Link>
              <Link to="/artists">Artists on tour</Link>
              <Link to="/cities">Cities and countries</Link>
            </div>
            <div>
              <span className="label">Contribute</span>
              <button onClick={requestAddEvent}>Add a show</button>
              <Link to="/widget">Widget for your site</Link>
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
            ProgDealer is for fans who still believe a fifteen-minute track with a flute solo deserves to be heard live.
            Worldwide catalog, aggregated automatically and curated by hand.
          </p>
        </div>
      </footer>

      <BackToTop after="map" />

      {/* ---------- Mobile bottom nav ---------- */}
      <nav className="bnav" aria-label="Quick">
        <a href="/"><HomeIcon size={19} /><span>Home</span></a>
        <button onClick={gotoShows}><SearchIcon size={19} /><span>Browse</span></button>
        <button className="fab" onClick={requestAddEvent} aria-label="Add a show"><Plus size={22} /></button>
        <a href={isAuthenticated ? '/userarea' : '/login'}><UserIcon size={19} /><span>Profile</span></a>
      </nav>

      {/* ---------- Filters sheet (mobile) ---------- */}
      {filtersOpen && (
        <div className="fsheet-backdrop" onClick={() => setFiltersOpen(false)}>
          <div className="fsheet" role="dialog" aria-modal="true" aria-label="Filters" onClick={(e) => e.stopPropagation()}>
            <div className="fsheet-grip" />
            <div className="fsheet-head">
              <h3>Filters</h3>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="fs-group">
              <label>Location</label>
              <div className="fs-chips">
                <button className={`lc ${!continent && !country ? 'on' : ''}`} onClick={() => { setContinent(null); setCountry(null); }}>Worldwide</button>
                {continents.map((c) => (
                  <button key={c} className={`lc ${continent === c && !country ? 'on' : ''}`} onClick={() => { setContinent(c); setCountry(null); }}>{c} <i>{continentCounts.get(c) || 0}</i></button>
                ))}
              </div>
              {countries.length > 0 && (
                <div className="fs-chips" style={{ marginTop: 8 }}>
                  {countries.map(([co, n]) => (
                    <button key={co} className={`cty ${country === co ? 'on' : ''}`} onClick={() => setCountry(country === co ? null : co)}>{co} <i>{n}</i></button>
                  ))}
                </div>
              )}
            </div>
            <div className="fs-group">
              <label>City</label>
              <PlacesAutocomplete value={city} onChange={(v) => setCity(v)} cities placeholder="Any city" ariaLabel="City" />
            </div>
            <div className="fs-group">
              <label>Period</label>
              <div className="fs-dates">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To" />
              </div>
            </div>
            <div className="fs-group">
              <label htmlFor="fs-genre">Subgenre</label>
              <select id="fs-genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">All subgenres</option>
                {genres.map(([g, n]) => <option key={g} value={g}>{g} ({n})</option>)}
              </select>
            </div>
            <div className="fsheet-foot">
              {hasFilters && <button className="btn btn-ghost" onClick={clearAll}>Clear all</button>}
              <button className="btn btn-solid" onClick={() => setFiltersOpen(false)}>Show {nf.format(filtered.length)} {showWord(filtered.length)}</button>
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

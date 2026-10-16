import { useState, useEffect, useRef } from 'react';
import { Shield, Check, X, Clock, CheckCircle, XCircle, Trash2, Upload, Download, ExternalLink, Users, Settings, LogOut } from 'lucide-react';
import type { User } from '@supabase/auth-js';
import { supabase, fetchAllRows } from '../lib/supabase';
import { Event } from '../types/event';
import { UserProfile } from '../hooks/useUserRole';
import { Sleeve } from './home/EventCard';
import ImportEvents from './ImportEvents';
import UserManagement from './UserManagement';
import PanelHeader from './PanelHeader';

interface AdminPanelProps {
  isAuthenticated: boolean;
  currentUser: User | null;
  userProfile: UserProfile | null;
  onAuthRequired: () => void;
  onLogout: () => void;
  onBackToMain: () => void;
}

// Show times are stored as the venue's wall clock (see utils/eventText), so print them in UTC.
const dateFmt = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

function StatusBadge({ status }: { status?: string }) {
  const s = status || 'approved';
  const icon = s === 'approved' ? <CheckCircle size={13} /> : s === 'rejected' ? <XCircle size={13} /> : <Clock size={13} />;
  const label = s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : 'Pending';
  return <span className={`status ${s}`}>{icon} {label}</span>;
}

export default function AdminPanel({ isAuthenticated, currentUser, userProfile, onAuthRequired, onLogout, onBackToMain }: AdminPanelProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const onAuthRequiredRef = useRef(onAuthRequired);
  onAuthRequiredRef.current = onAuthRequired;

  useEffect(() => {
    if (!isAuthenticated || !userProfile || userProfile.user_role !== 'admin') { onAuthRequiredRef.current(); return; }
    fetchEvents();
  }, [isAuthenticated, userProfile]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchAllRows<Event>((from, to) =>
        supabase
          .from('eventi_prog')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to),
      );
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (eventId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase.from('eventi_prog').update({ status, updated_at: new Date().toISOString() }).eq('id', eventId);
      if (error) throw error;
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, status } : e)));
      window.dispatchEvent(new CustomEvent('eventApproved'));
    } catch (err) {
      console.error('Error updating event status:', err);
    }
  };

  const approveAllPending = async () => {
    const pending = events.filter((e) => (e.status || 'approved') === 'pending');
    if (!pending.length) return;
    if (!confirm(`Approve all ${pending.length} pending show${pending.length === 1 ? '' : 's'}? They'll go live immediately.`)) return;
    try {
      const { error } = await supabase
        .from('eventi_prog')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('status', 'pending');
      if (error) throw error;
      setEvents((prev) => prev.map((e) => ((e.status || 'approved') === 'pending' ? { ...e, status: 'approved' } : e)));
      window.dispatchEvent(new CustomEvent('eventApproved'));
    } catch (err) {
      console.error('Error approving all pending events:', err);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Delete this show? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('eventi_prog').delete().eq('id', eventId);
      if (error) throw error;
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const exportEvents = () => {
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `progdealer-events-${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  };

  const count = (s: string) => events.filter((e) => (e.status || 'approved') === s).length;
  const filteredEvents = filter === 'all' ? events : events.filter((e) => (e.status || 'approved') === filter);

  if (!isAuthenticated) return null;

  // ---------- Settings ----------
  if (showSettings) {
    return (
      <div className="pd">
        <PanelHeader
          onBack={() => setShowSettings(false)}
          backLabel="Back to admin"
          right={<button className="icon-btn" onClick={onLogout} title="Log out" aria-label="Log out"><LogOut size={16} /></button>}
        />
        <main className="panel-main panel-narrow">
          <div className="panel-title"><Settings size={26} /><h1>Settings</h1></div>
          <p className="panel-greet">Account configuration</p>
          <div className="stack" style={{ marginTop: 22 }}>
            <div className="panel-card pad">
              <h2 className="card-title">Account</h2>
              <div className="info-row"><span className="k">Email</span><span className="val">{userProfile?.email || currentUser?.email || 'Admin'}</span></div>
              <div className="info-row" style={{ marginBottom: 0 }}><span className="k">Role</span><span><span className="role-tag admin" style={{ marginTop: 0 }}>admin</span></span></div>
            </div>
            <div className="panel-card pad">
              <h2 className="card-title">Preferences</h2>
              <p className="muted">Notifications and favourite bands are coming soon.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---------- Main ----------
  return (
    <div className="pd">
      <PanelHeader
        onBack={onBackToMain}
        backLabel="Back to shows"
        right={
          <>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings" aria-label="Settings"><Settings size={16} /></button>
            <button className="icon-btn" onClick={onLogout} title="Log out" aria-label="Log out"><LogOut size={16} /></button>
          </>
        }
      />

      <main className="panel-main">
        <div className="eyebrow">Backstage</div>
        <div className="panel-title" style={{ marginTop: 10 }}><Shield size={26} /><h1>Admin panel</h1></div>
        <div><span className="role-tag admin">admin</span></div>

        <div className="stats">
          <div className="stat"><div className="n">{events.length}</div><div className="l">Total shows</div></div>
          <div className="stat"><div className="n">{count('pending')}</div><div className="l"><i style={{ background: 'var(--mustard)' }} />Pending review</div></div>
          <div className="stat"><div className="n">{count('approved')}</div><div className="l"><i style={{ background: 'var(--teal)' }} />Approved</div></div>
          <div className="stat"><div className="n">{count('rejected')}</div><div className="l"><i style={{ background: 'var(--rust)' }} />Rejected</div></div>
        </div>

        <div className="toolbar">
          <div className="filters" style={{ margin: 0 }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)}{f !== 'all' ? ` · ${count(f)}` : ''}
              </button>
            ))}
          </div>
          <div className="filters">
            {count('pending') > 0 && (
              <button className="btn-ok" onClick={approveAllPending}><Check size={15} /> Approve all · {count('pending')}</button>
            )}
            <button className={`btn-mini ${showUserManagement ? 'active' : ''}`} onClick={() => setShowUserManagement((v) => !v)}><Users size={15} /> Users</button>
            <button className="btn-mini" onClick={() => setShowImportModal(true)}><Upload size={15} /> Import</button>
            <button className="btn-mini" onClick={exportEvents}><Download size={15} /> Export</button>
          </div>
        </div>

        {showUserManagement && (
          <div style={{ marginBottom: 18 }}><UserManagement isVisible={showUserManagement} /></div>
        )}

        <div className="panel-card">
          <div className="ph"><span>Shows</span><span>{filteredEvents.length}</span></div>
          {loading ? (
            <div className="empty" style={{ padding: '48px 0' }}><span className="label">Loading shows…</span></div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty" style={{ padding: '48px 20px' }}><h3>No shows found</h3></div>
          ) : (
            filteredEvents.map((event) => {
              const status = event.status || 'approved';
              return (
                <div key={event.id} className="erow">
                  <div className="thumb"><Sleeve event={event} showCatNo={false} /></div>
                  <div className="info">
                    <div className="info-top">
                      <h3>{event.nome_evento}</h3>
                      <StatusBadge status={event.status} />
                    </div>
                    <div className="meta">
                      <span>{dateFmt.format(new Date(event.data_ora))}</span>
                      <span>{event.venue}, {event.città}</span>
                      <span>{event.sottogenere}</span>
                      <span className="src">{event.fonte} · {event.tipo_inserimento}</span>
                    </div>
                  </div>
                  <div className="acts">
                    {status !== 'approved' && (
                      <button className="btn-ok" onClick={() => updateEventStatus(event.id, 'approved')}><Check size={14} /> Approve</button>
                    )}
                    {status !== 'rejected' && (
                      <button className="btn-mini" onClick={() => updateEventStatus(event.id, 'rejected')}><X size={14} /> Reject</button>
                    )}
                    {event.link && (
                      <a className="btn-mini" href={event.link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> View</a>
                    )}
                    <button className="btn-danger" onClick={() => deleteEvent(event.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {showImportModal && (
        <ImportEvents onClose={() => setShowImportModal(false)} onEventsImported={fetchEvents} />
      )}
    </div>
  );
}

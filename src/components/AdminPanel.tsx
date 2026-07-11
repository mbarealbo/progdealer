import { useState, useEffect } from 'react';
import { Shield, Check, X, Clock, CheckCircle, XCircle, Trash2, Upload, Download, ExternalLink, Users, Settings, LogOut } from 'lucide-react';
import type { User } from '@supabase/auth-js';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import { UserProfile } from '../hooks/useUserRole';
import { shouldUsePlaceholder } from '../utils/imageUtils';
import { getEventCountry, countryFlag } from '../utils/geo';
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

const dateFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

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

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#F5F4F2';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userProfile || userProfile.user_role !== 'admin') { onAuthRequired(); return; }
    fetchEvents();
  }, [isAuthenticated, userProfile]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('eventi_prog').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
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
          <div className="panel-title"><Settings size={22} /><h1>Settings</h1></div>
          <p className="panel-greet">Account configuration</p>
          <div className="stack" style={{ marginTop: 22 }}>
            <div className="panel-card" style={{ padding: 20 }}>
              <h2 style={{ fontFamily: 'inherit', fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>Account</h2>
              <div className="info-row"><span className="k">Email</span><span className="val">{userProfile?.email || currentUser?.email || 'Admin'}</span></div>
              <div className="info-row" style={{ marginBottom: 0 }}><span className="k">Role</span><span><span className="role-tag admin" style={{ marginTop: 0 }}>admin</span></span></div>
            </div>
            <div className="panel-card" style={{ padding: 20 }}>
              <h2 style={{ fontFamily: 'inherit', fontSize: '1.05rem', fontWeight: 600, marginBottom: 6 }}>Preferences</h2>
              <p style={{ color: 'var(--ink-3)', fontSize: '.86rem', margin: 0 }}>Notifications and favourite bands are coming soon.</p>
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
        <div className="panel-title"><Shield size={22} /><h1>Admin panel</h1></div>
        <div><span className="role-tag admin">admin</span></div>

        <div className="stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="stat"><Shield size={22} style={{ color: 'var(--accent)' }} /><div><div className="n">{events.length}</div><div className="l">Total shows</div></div></div>
          <div className="stat"><Clock size={22} style={{ color: '#9a6a12' }} /><div><div className="n">{count('pending')}</div><div className="l">Pending review</div></div></div>
          <div className="stat"><CheckCircle size={22} style={{ color: '#1f7a37' }} /><div><div className="n">{count('approved')}</div><div className="l">Approved</div></div></div>
          <div className="stat"><XCircle size={22} style={{ color: 'var(--accent)' }} /><div><div className="n">{count('rejected')}</div><div className="l">Rejected</div></div></div>
        </div>

        <div className="toolbar">
          <div className="filters" style={{ margin: 0 }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)}{f !== 'all' ? ` · ${count(f)}` : ''}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`btn-mini ${showUserManagement ? 'active' : ''}`} onClick={() => setShowUserManagement((v) => !v)}><Users size={15} /> Users</button>
            <button className="btn-mini" onClick={() => setShowImportModal(true)}><Upload size={15} /> Import</button>
            <button className="btn-mini" onClick={exportEvents}><Download size={15} /> Export</button>
          </div>
        </div>

        {showUserManagement && (
          <div style={{ marginBottom: 18 }}><UserManagement isVisible={showUserManagement} /></div>
        )}

        <div className="panel-card">
          <div className="ph">Shows ({filteredEvents.length})</div>
          {loading ? (
            <div className="empty" style={{ padding: '48px 0' }}><span className="label">Loading shows…</span></div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty" style={{ padding: '48px 20px' }}><h3>No shows found</h3></div>
          ) : (
            filteredEvents.map((event) => {
              const status = event.status || 'approved';
              const country = getEventCountry(event.città);
              const hasImg = !shouldUsePlaceholder(event.immagine);
              return (
                <div key={event.id} className="erow">
                  <div className="thumb">{hasImg && <img src={event.immagine} alt="" loading="lazy" />}</div>
                  <div className="info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <h3>{event.nome_evento}</h3>
                      <StatusBadge status={event.status} />
                    </div>
                    <div className="meta">
                      <span>{dateFmt.format(new Date(event.data_ora))}</span>
                      <span>{countryFlag(country)} {event.venue}, {event.città}</span>
                      <span>{event.sottogenere}</span>
                      <span style={{ color: 'var(--ink-3)' }}>{event.fonte} · {event.tipo_inserimento}</span>
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
        <ImportEvents onEventsImported={() => { fetchEvents(); setShowImportModal(false); }} />
      )}
    </div>
  );
}

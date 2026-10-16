import { useState, useEffect, useCallback, useRef } from 'react';
import { User as UserIcon, Trash2, ExternalLink, Clock, CheckCircle, XCircle, Plus, Settings, LogOut } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/auth-js';
import { supabase } from '../lib/supabase';
import { Event } from '../types/event';
import { UserProfile } from '../hooks/useUserRole';
import { Sleeve } from './home/EventCard';
import AddEventForm from './AddEventForm';
import DeleteAccountModal from './DeleteAccountModal';
import PanelHeader from './PanelHeader';

interface UserPanelProps {
  isAuthenticated: boolean;
  currentUser: SupabaseUser | null;
  userProfile: UserProfile | null;
  onAuthRequired: () => void;
  onLogout: () => void;
  onBackToMain: () => void;
}

// Show times are stored as the venue's wall clock (see utils/eventText), so print them in UTC.
const dateFmt = new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

function StatusBadge({ status }: { status?: string }) {
  const s = status || 'pending';
  const icon = s === 'approved' ? <CheckCircle size={13} /> : s === 'rejected' ? <XCircle size={13} /> : <Clock size={13} />;
  const label = s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : 'Pending review';
  return <span className={`status ${s}`}>{icon} {label}</span>;
}

export default function UserPanel({ isAuthenticated, currentUser, userProfile, onAuthRequired, onLogout, onBackToMain }: UserPanelProps) {
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const userId = currentUser?.id;
  const fetchUserEvents = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('eventi_prog')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUserEvents(data || []);
    } catch (err) {
      console.error('Error fetching user events:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const onAuthRequiredRef = useRef(onAuthRequired);
  onAuthRequiredRef.current = onAuthRequired;

  // Runs again once the user is known: the session can arrive before the user.
  useEffect(() => {
    if (!isAuthenticated) { onAuthRequiredRef.current(); return; }
    fetchUserEvents();
  }, [isAuthenticated, fetchUserEvents]);

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this show? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('eventi_prog').delete().eq('id', eventId);
      if (error) throw error;
      setUserEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Could not delete the show.');
    }
  };

  const count = (s: string) => userEvents.filter((e) => (e.status || 'pending') === s).length;
  const filteredEvents = filter === 'all' ? userEvents : userEvents.filter((e) => (e.status || 'pending') === filter);
  const role = userProfile?.user_role === 'admin' ? 'admin' : 'user';

  if (!isAuthenticated) return null;

  // ---------- Settings ----------
  if (showSettings) {
    return (
      <div className="pd">
        <PanelHeader
          onBack={() => setShowSettings(false)}
          backLabel="Back to your area"
          right={<button className="icon-btn" onClick={onLogout} title="Log out" aria-label="Log out"><LogOut size={16} /></button>}
        />
        <main className="panel-main panel-narrow">
          <div className="panel-title"><Settings size={26} /><h1>Settings</h1></div>
          <p className="panel-greet">Account configuration</p>

          <div className="stack" style={{ marginTop: 22 }}>
            <div className="panel-card pad">
              <h2 className="card-title">Account</h2>
              <div className="info-row">
                <span className="k">Email</span>
                <span className="val">{userProfile?.email || currentUser?.email || 'User'}</span>
              </div>
              <div className="info-row" style={{ marginBottom: 0 }}>
                <span className="k">Role</span>
                <span><span className={`role-tag ${role}`} style={{ marginTop: 0 }}>{role}</span></span>
              </div>
            </div>

            <div className="panel-card pad">
              <h2 className="card-title">Preferences</h2>
              <p className="muted">Notifications and favourite bands are coming soon.</p>
            </div>

            <div className="danger-zone">
              <h2>Danger zone</h2>
              <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
              <button className="btn-danger" onClick={() => setShowDeleteModal(true)}><Trash2 size={15} /> Delete account</button>
            </div>
          </div>
        </main>

        {showDeleteModal && (
          <DeleteAccountModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onAccountDeleted={() => { window.location.href = '/'; }}
            userEmail={userProfile?.email || currentUser?.email || ''}
          />
        )}
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
        <div className="eyebrow">Your record collection</div>
        <div className="panel-title" style={{ marginTop: 10 }}><UserIcon size={26} /><h1>Your area</h1></div>
        <div><span className={`role-tag ${role}`}>{role}</span></div>
        <p className="panel-greet">Hello, {userProfile?.email || currentUser?.email}</p>

        <div className="stats">
          <div className="stat"><div className="n">{userEvents.length}</div><div className="l">Your shows</div></div>
          <div className="stat"><div className="n">{count('approved')}</div><div className="l"><i style={{ background: 'var(--teal)' }} />Approved</div></div>
          <div className="stat"><div className="n">{count('pending')}</div><div className="l"><i style={{ background: 'var(--mustard)' }} />Pending</div></div>
        </div>

        <div className="toolbar">
          <div className="filters" style={{ margin: 0 }}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)}{f !== 'all' ? ` · ${count(f)}` : ''}
              </button>
            ))}
          </div>
          <button className="btn btn-accent" onClick={() => setShowAddForm(true)}><Plus size={16} /> Add a show</button>
        </div>

        <div className="panel-card">
          <div className="ph"><span>Your shows</span><span>{filteredEvents.length}</span></div>
          {loading ? (
            <div className="empty" style={{ padding: '48px 0' }}><span className="label">Loading your shows…</span></div>
          ) : userEvents.length === 0 ? (
            <div className="empty" style={{ padding: '48px 20px' }}><h3>No shows yet</h3><p>Add your first show with the button above.</p></div>
          ) : filteredEvents.length === 0 ? (
            <div className="empty" style={{ padding: '48px 20px' }}><h3>No {filter} shows</h3><p>Try a different filter.</p></div>
          ) : (
            filteredEvents.map((event) => {
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
                    </div>
                  </div>
                  <div className="acts">
                    {event.link && (
                      <a className="btn-mini" href={event.link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> View</a>
                    )}
                    <button className="btn-danger" onClick={() => handleDeleteEvent(event.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <AddEventForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onEventAdded={() => { fetchUserEvents(); setShowAddForm(false); }}
      />
    </div>
  );
}

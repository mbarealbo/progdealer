import { useState, useEffect } from 'react';
import { Shield, User as UserIcon, Edit3, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../hooks/useUserRole';

interface UserManagementProps {
  isVisible: boolean;
}

const joinedFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export default function UserManagement({ isVisible }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      fetchUsers();
    }
  }, [isVisible]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, user_role: newRole } : user
      ));
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role');
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="panel-card">
      <div className="ph"><span>Users · admin only</span><span>{loading ? '…' : users.length}</span></div>

      {loading ? (
        <div className="empty" style={{ padding: '40px 0' }}><span className="label">Loading users…</span></div>
      ) : (
        users.map((user) => (
          <div key={user.id} className="urow">
            <div className="who">
              <span className="avatar">{user.user_role === 'admin' ? <Shield size={18} /> : <UserIcon size={18} />}</span>
              <div style={{ minWidth: 0 }}>
                <div className="mail">{user.email}</div>
                <div className="since">
                  <span className={`role-tag ${user.user_role === 'admin' ? 'admin' : 'user'}`}>{user.user_role}</span>
                  <span>Joined {joinedFmt.format(new Date(user.created_at))}</span>
                </div>
              </div>
            </div>

            <div className="acts">
              {editingUser === user.id ? (
                <button className="btn-mini" onClick={() => setEditingUser(null)}><X size={14} /> Cancel</button>
              ) : (
                <button className="btn-mini" onClick={() => setEditingUser(user.id)}><Edit3 size={14} /> Edit role</button>
              )}
            </div>

            {editingUser === user.id && (
              <div className="urole">
                <span>Change role for {user.email}:</span>
                <div className="filters" role="group" aria-label="Role">
                  <button className={`chip ${user.user_role === 'user' ? 'on' : ''}`} aria-pressed={user.user_role === 'user'} onClick={() => updateUserRole(user.id, 'user')}>User</button>
                  <button className={`chip ${user.user_role === 'admin' ? 'on' : ''}`} aria-pressed={user.user_role === 'admin'} onClick={() => updateUserRole(user.id, 'admin')}>Admin</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

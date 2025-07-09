import React, { useState, useEffect } from 'react';
import { Users, Shield, User as UserIcon, Edit3, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../hooks/useUserRole';

interface UserManagementProps {
  isVisible: boolean;
}

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
    <div className="bg-coal-800 border-2 border-asphalt-600 mt-8">
      <div className="p-6 border-b border-asphalt-600">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-industrial-green-600" />
          <h2 className="text-xl font-industrial text-gray-100 tracking-wide uppercase">
            USER MANAGEMENT
          </h2>
          <span className="bg-yellow-600 text-black px-2 py-1 text-xs font-bold uppercase tracking-wide">
            ADMIN ONLY
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-industrial-green-600 mx-auto mb-4"></div>
          <p className="text-gray-400 font-condensed uppercase tracking-wide">
            Loading users...
          </p>
        </div>
      ) : (
        <div className="divide-y divide-asphalt-600">
          {users.map((user) => (
            <div key={user.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-coal-700 border border-asphalt-500 rounded-full flex items-center justify-center">
                    {user.user_role === 'admin' ? (
                      <Shield className="h-5 w-5 text-burgundy-400" />
                    ) : (
                      <UserIcon className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-gray-100">
                      {user.email}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                        user.user_role === 'admin' 
                          ? 'bg-burgundy-600 text-white' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        {user.user_role}
                      </span>
                      <span className="text-gray-400 text-sm font-condensed">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {editingUser === user.id ? (
                    <>
                      <button
                        onClick={() => updateUserRole(user.id, user.user_role === 'admin' ? 'user' : 'admin')}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 flex items-center space-x-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>SAVE</span>
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 flex items-center space-x-1"
                      >
                        <X className="h-3 w-3" />
                        <span>CANCEL</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingUser(user.id)}
                      className="bg-industrial-green-600 hover:bg-industrial-green-700 text-white px-3 py-2 text-sm font-condensed font-bold uppercase tracking-wide transition-colors duration-200 flex items-center space-x-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>EDIT ROLE</span>
                    </button>
                  )}
                </div>
              </div>

              {editingUser === user.id && (
                <div className="mt-4 p-4 bg-coal-900 border border-asphalt-600">
                  <p className="text-gray-300 text-sm font-condensed mb-3">
                    Change role for {user.email}:
                  </p>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => updateUserRole(user.id, 'user')}
                      className={`px-4 py-2 text-sm font-condensed font-bold uppercase tracking-wide border-2 transition-all duration-200 ${
                        user.user_role === 'user'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-transparent border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      USER
                    </button>
                    <button
                      onClick={() => updateUserRole(user.id, 'admin')}
                      className={`px-4 py-2 text-sm font-condensed font-bold uppercase tracking-wide border-2 transition-all duration-200 ${
                        user.user_role === 'admin'
                          ? 'bg-burgundy-600 border-burgundy-600 text-white'
                          : 'bg-transparent border-burgundy-600 text-burgundy-400 hover:bg-burgundy-600 hover:text-white'
                      }`}
                    >
                      ADMIN
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
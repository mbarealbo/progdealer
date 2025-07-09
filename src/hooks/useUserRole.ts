import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export function useUserRole(user: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          await createUserProfile();
          return;
        }
        throw error;
      }

      setProfile(data);
      setIsAdmin(data.role === 'admin');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email || '',
            role: 'user'
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setIsAdmin(data.role === 'admin');
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
  };

  const refreshProfile = () => {
    if (user) {
      fetchUserProfile();
    }
  };

  return {
    profile,
    isAdmin,
    loading,
    refreshProfile
  };
}
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/auth-js';

export interface UserProfile {
  id: string;
  email: string | undefined;
  user_role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export function useUserRole(user: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const createUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      // First check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        setProfile(existingProfile);
        setIsAdmin(existingProfile.user_role === 'admin');
        return;
      }

      // Create new profile with explicit default role
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email || '',
            user_role: 'user' // Explicit default user_role
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setIsAdmin(data.user_role === 'admin');
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Set default values even if profile creation fails
      setProfile({
        id: user.id,
        email: user.email,
        user_role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setIsAdmin(false);
    }
  }, [user]);

  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      // First sign-in: no profile yet, so create it
      if (!data) {
        await createUserProfile();
        return;
      }

      setProfile(data);
      setIsAdmin(data.user_role === 'admin');
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user, createUserProfile]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    fetchUserProfile();
  }, [user, fetchUserProfile]);

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

// Utility function to check if current user is admin
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user?.id)
      .single();
    
    return profile?.user_role === 'admin';
  } catch {
    return false;
  }
}
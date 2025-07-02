'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'manager' | 'sorter' | 'cdm' | 'guest' | 'duc';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  isManager: () => boolean;
  isSorter: () => boolean;
  isCDM: () => boolean;
  isGuest: () => boolean;
  isDUC: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  console.log('AuthContext: Initializing Supabase auth');
  
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    console.log('Initial session:', session);
    setUser(session?.user ?? null);
    if (session?.user) {
      fetchProfile(session.user.id);
    } else {
      setLoading(false);
    }
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('Auth state changed:', event, session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('SignIn attempt:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const hasRole = (roles: UserRole[]): boolean => {
    return profile ? roles.includes(profile.role) : false;
  };

  const isManager = (): boolean => hasRole(['manager']);
  const isSorter = (): boolean => hasRole(['sorter']);
  const isCDM = (): boolean => hasRole(['cdm']);
  const isGuest = (): boolean => hasRole(['guest']);
  const isDUC = (): boolean => hasRole(['duc']);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      hasRole,
      isManager,
      isSorter,
      isCDM,
      isGuest,
      isDUC,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
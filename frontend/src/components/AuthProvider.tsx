'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const PROFILE_CACHE_KEY = 'outsurance-profile-cache-v1';
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedProfile {
  data: Record<string, unknown>;
  userId: string;
  expiresAt: number;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: Record<string, unknown> | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  profile: null,
  refreshProfile: async () => {},
});

function getCachedProfile(userId: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedProfile = JSON.parse(raw);
    if (cached.userId !== userId || Date.now() > cached.expiresAt) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedProfile(userId: string, data: Record<string, unknown>) {
  try {
    const cached: CachedProfile = { data, userId, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cached));
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const cached = getCachedProfile(userId);
    if (cached) {
      setProfile(cached);
      return;
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) {
      setCachedProfile(userId, data);
      setProfile(data);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    localStorage.removeItem(PROFILE_CACHE_KEY);
    await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        localStorage.removeItem(PROFILE_CACHE_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ session, user, loading, profile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

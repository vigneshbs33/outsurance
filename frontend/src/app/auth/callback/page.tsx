'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase detects the code/token in the URL and exchanges it automatically
    // because detectSessionInUrl: true is set. We just wait for the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') ?? '/dashboard';
        router.replace(next);
      }
    });

    // Fallback: if already signed in by the time this runs
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') ?? '/dashboard';
        router.replace(next);
      }
    });

    // Safety timeout — if nothing happens in 8s, send to login
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      router.replace('/login?error=auth_timeout');
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-xs text-white/60 uppercase tracking-widest">Signing you in...</p>
      </div>
    </div>
  );
}

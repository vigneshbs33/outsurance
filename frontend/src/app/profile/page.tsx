'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { AnnotationBox, SectionEyebrow } from '../../components/editorial';
import { supabase } from '../../lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Record<string, any> | null>(null);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => setProfile(data));
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-white lg:flex">
      <Sidebar />
      <main className="flex-1 px-4 sm:px-8 py-8 lg:px-12">
        <div className="mx-auto max-w-[1100px]">
          <header className="mb-10 border-b border-neutral-200 pb-8">
            <SectionEyebrow>Profile & Account</SectionEyebrow>
            <h1 className="mt-2 font-[var(--font-heading)] text-3xl font-black uppercase tracking-tight text-black md:text-4xl leading-none">
              My Personal Profile.
            </h1>
          </header>

          <section className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-8">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block mb-6">My Details</span>
              <div className="border border-neutral-200 p-6 bg-white" style={{ borderRadius: '12px' }}>
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:justify-between border-b border-neutral-100 pb-3 gap-2">
                    <span className="font-mono text-xs text-[var(--ink-soft)] uppercase tracking-wider">Full Name</span>
                    <span className="font-mono text-xs font-bold text-black uppercase">
                      {String(profile?.full_name || '').includes(' || ') 
                        ? String(profile?.full_name || '').split(' || ')[0] 
                        : String(profile?.full_name || 'Anonymous Member')}
                    </span>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between border-b border-neutral-100 pb-3 gap-2">
                    <span className="font-mono text-xs text-[var(--ink-soft)] uppercase tracking-wider">Email Address</span>
                    <span className="font-mono text-xs font-bold text-black">{String(user?.email || '-')}</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between gap-2">
                    <span className="font-mono text-xs text-[var(--ink-soft)] uppercase tracking-wider">Account ID</span>
                    <span className="font-mono text-[10px] font-bold text-[var(--ink-mid)] break-all">{String(user?.id || '-')}</span>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-8">
              <AnnotationBox title="Your Privacy Matters">
                We process your health parameters strictly locally on your device to keep them safe. Your name and details are kept separate from your health data.
              </AnnotationBox>
              <div className="border border-neutral-200 p-6 bg-neutral-50 space-y-6" style={{ borderRadius: '12px' }}>
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-soft)] block">Session Security</span>
                  <p className="font-mono text-[11px] leading-5 text-[var(--ink-mid)]">
                    Your session is kept secure and private. When you are ready to log out, just click the button below to clear all temporary data.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push('/');
                  }}
                  className="mono-btn-secondary"
                >
                  Log Out Safely
                </button>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

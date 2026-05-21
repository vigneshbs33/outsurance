'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, LayoutDashboard, LogOut, Plus, User, Bookmark, MessageSquareText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Crosshair } from './editorial';
import { useLanguage } from './LanguageProvider';

const navItems = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/explorer', labelKey: 'nav.explorer', icon: Compass },
  { href: '/forum', labelKey: 'nav.forum', icon: MessageSquareText },
  { href: '/saved', labelKey: 'nav.saved', icon: Bookmark },
  { href: '/profile', labelKey: 'nav.profile', icon: User },
] as const;


export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState('Member');
  const [initials, setInitials] = useState('FI');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data?.full_name) return;
          const raw = data.full_name as string;
          const cleanName = raw.includes(' || ') ? raw.split(' || ')[0].trim() : raw.trim();
          setName(cleanName);
          setInitials(
            cleanName
              .split(' ')
              .filter((v: string) => v.length > 0)
              .map((v: string) => v[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          );
        });
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <>
      {/* 1. Desktop Left Sidebar */}
      <aside className="hidden min-h-screen w-[290px] flex-col justify-between border-r border-neutral-200 bg-white px-8 py-8 lg:flex shrink-0">
        <div className="space-y-10">
          <div
            className="flex items-center gap-1 select-none cursor-pointer pb-6 border-b border-neutral-100"
            onClick={() => router.push('/')}
          >
            <img
              src="/fidsurance-logo.png"
              alt="Outsurance Logo"
              className="h-12 w-auto object-contain"
            />
            <span className="font-space-mono text-[13px] tracking-[0.05em] text-black font-bold uppercase select-none leading-none -ml-2 translate-y-[-1.5px]">
              OUTSURANCE
            </span>
          </div>

          <nav className="space-y-4">
            {navItems.map(({ href, labelKey, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center justify-between border-b border-neutral-100 pb-3 transition-opacity ${
                    active ? 'opacity-100 border-black' : 'opacity-40 hover:opacity-100'
                  }`}
                >
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">{href.replace('/', '') || 'home'}</p>
                    <p className="mt-1 font-[var(--font-heading)] text-lg font-bold tracking-tight text-black">{t(labelKey)}</p>
                  </div>
                  <Icon size={16} className="text-black" />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-6">
          <Link
            href="/assessment"
            className="flex min-h-11 items-center justify-center gap-2 bg-black px-4 hover:bg-neutral-900 transition-colors"
            style={{ borderRadius: '2px' }}
          >
            <Plus size={14} className="text-white" />
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-white">{t('nav.newAssessment')}</span>
          </Link>

          <div className="border-t border-neutral-200 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">Account</div>
                <p className="mt-1 text-xs font-bold text-black font-mono">{name}</p>
              </div>
              <div 
                className="flex h-9 w-9 items-center justify-center border border-black font-mono text-[10px] font-bold bg-neutral-50"
                style={{ borderRadius: '2px' }}
              >
                {initials}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-between border-b border-neutral-100 pb-2 text-left opacity-60 transition-opacity hover:opacity-100"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider">Sign Out</span>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Sticky Header Bar */}
      <header className="sticky top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden shrink-0">
        <Link href="/dashboard" className="flex items-center gap-1">
          <img src="/fidsurance-logo.png" alt="Outsurance Logo" className="h-10 w-auto object-contain" />
          <span className="font-space-mono text-[12px] tracking-[0.05em] text-black font-bold uppercase leading-none -ml-1.5 translate-y-[-1px]">
            OUTSURANCE
          </span>
        </Link>

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="font-mono text-[10px] uppercase tracking-wider text-black border border-black px-3 py-1"
          style={{ borderRadius: '2px' }}
        >
          Menu
        </button>
      </header>

      {/* 3. Mobile Navigation Fullscreen Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white p-6 animate-fadeIn lg:hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div className="flex items-center gap-1">
              <img src="/fidsurance-logo.png" alt="Outsurance Logo" className="h-10 w-auto object-contain" />
              <span className="font-space-mono text-[12px] tracking-[0.05em] text-black font-bold uppercase leading-none -ml-1.5 translate-y-[-1px]">
                OUTSURANCE
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="font-mono text-xs uppercase tracking-widest text-neutral-400 hover:text-black border border-neutral-200 px-3 py-1"
              style={{ borderRadius: '2px' }}
            >
              [ Close ]
            </button>
          </div>

          {/* Navigation Links inside Drawer */}
          <nav className="flex-1 flex flex-col justify-center space-y-6">
            {navItems.map(({ href, labelKey, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between border-b border-neutral-100 pb-4 transition-opacity ${
                    active ? 'opacity-100 border-black' : 'opacity-40 hover:opacity-100'
                  }`}
                >
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block mb-1">
                      {href.replace('/', '') || 'home'}
                    </span>
                    <span className="font-[var(--font-heading)] text-2xl font-black uppercase tracking-tight text-black">
                      {t(labelKey)}
                    </span>
                  </div>
                  <Icon size={24} className="text-black" />
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions inside Drawer */}
          <div className="space-y-6 pt-6 border-t border-neutral-200">
            <Link
              href="/assessment"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex min-h-11 items-center justify-center gap-2 bg-black px-4 hover:bg-neutral-900 transition-colors"
              style={{ borderRadius: '2px' }}
            >
              <Plus size={14} className="text-white" />
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-white">{t('nav.newAssessment')}</span>
            </Link>

            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">Account</div>
                <p className="text-xs font-bold text-black font-mono">{name}</p>
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 hover:text-black border border-neutral-200 px-3 py-1"
                style={{ borderRadius: '2px' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

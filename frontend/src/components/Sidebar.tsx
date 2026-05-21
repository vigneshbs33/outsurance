'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, LayoutDashboard, LogOut, Plus, User, Bookmark } from 'lucide-react';
import { supabase } from '../lib/supabase';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/explorer', label: 'Plan Explorer', icon: Compass },
  { href: '/saved', label: 'Saved Plans', icon: Bookmark },
  { href: '/profile', label: 'Profile', icon: User },
];


export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState('Member');
  const [initials, setInitials] = useState('FI');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileMeta, setProfileMeta] = useState<any>(null);
  const [city, setCity] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const rawName = data.full_name || '';
          let cleanName = rawName;
          let meta: any = null;
          if (rawName.includes(' || ')) {
            const parts = rawName.split(' || ');
            cleanName = parts[0];
            try {
              meta = JSON.parse(parts[1]);
            } catch (e) {
              console.error(e);
            }
          }
          setName(cleanName);
          setProfileMeta(meta);
          setCity(data.city || '');
          setInitials(
            cleanName
              .split(' ')
              .map((value: string) => value[0])
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
        <div className="space-y-6">
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
            {navItems.map(({ href, label, icon: Icon }) => {
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
                    <p className="mt-1 font-[var(--font-heading)] text-lg font-bold tracking-tight text-black">{label}</p>
                  </div>
                  <Icon size={16} className="text-black" />
                </Link>
              );
            })}
          </nav>

          {/* Family Group Details Card */}
          {profileMeta && (
            <div className="bg-[#f9fbf9] border border-neutral-200 p-4 font-mono text-[10px] space-y-2 mt-4 uppercase rounded">
              <span className="text-neutral-400 font-bold block">Protected Group</span>
              <div className="border-b border-neutral-100 pb-1 flex justify-between">
                <span className="text-neutral-500">City</span>
                <span className="font-bold text-black">{city || 'N/A'}</span>
              </div>
              <div className="border-b border-neutral-100 pb-1">
                <span className="text-neutral-500 block">Covered Members</span>
                <span className="font-bold text-black block mt-0.5 truncate">
                  {profileMeta.covered_members?.join(', ') || 'Self'}
                </span>
              </div>
              <Link href="/assessment" className="text-[#00a278] hover:underline font-bold block pt-1">
                ✎ Edit Profile
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Link
            href="/assessment"
            className="flex min-h-11 items-center justify-center gap-2 bg-black px-4 hover:bg-neutral-900 transition-colors"
            style={{ borderRadius: '12px' }}
          >
            <span className="font-mono text-xs uppercase tracking-wider font-bold text-white">New Assessment</span>
          </Link>

          <div className="border-t border-neutral-200 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">Account</div>
                <p className="mt-1 text-xs font-bold text-black font-mono">{name}</p>
              </div>
              <div 
                className="flex h-9 w-9 items-center justify-center border border-black font-mono text-[10px] font-bold bg-neutral-50"
                style={{ borderRadius: '12px' }}
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
          style={{ borderRadius: '12px' }}
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
              style={{ borderRadius: '12px' }}
            >
              [ Close ]
            </button>
          </div>

          <nav className="flex-1 flex flex-col justify-center space-y-6">
            {navItems.map(({ href, label, icon: Icon }) => {
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
                      {label}
                    </span>
                  </div>
                  <Icon size={24} className="text-black" />
                </Link>
              );
            })}

            {profileMeta && (
              <div className="bg-[#f9fbf9] border border-neutral-200 p-4 font-mono text-[10px] space-y-2 mt-4 uppercase rounded">
                <span className="text-neutral-400 font-bold block">Protected Group</span>
                <div className="border-b border-neutral-100 pb-1 flex justify-between">
                  <span className="text-neutral-500">City</span>
                  <span className="font-bold text-black">{city || 'N/A'}</span>
                </div>
                <div className="border-b border-neutral-100 pb-1">
                  <span className="text-neutral-500 block">Covered Members</span>
                  <span className="font-bold text-black block mt-0.5 truncate">
                    {profileMeta.covered_members?.join(', ') || 'Self'}
                  </span>
                </div>
              </div>
            )}
          </nav>

          <div className="space-y-6 pt-6 border-t border-neutral-200">
            <Link
              href="/assessment"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex min-h-11 items-center justify-center gap-2 bg-black px-4 hover:bg-neutral-900 transition-colors"
              style={{ borderRadius: '12px' }}
            >
              <span className="font-mono text-xs uppercase tracking-wider font-bold text-white">New Assessment</span>
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
                style={{ borderRadius: '12px' }}
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

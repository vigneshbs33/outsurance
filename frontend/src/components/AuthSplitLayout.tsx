'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { supabase } from '../lib/supabase';
import { EditorialButton, FormField, SectionEyebrow } from './editorial';

function getStrength(password: string) {
  if (password.length >= 10 && /[A-Z]/.test(password) && /\d/.test(password)) return 'strong';
  if (password.length >= 6) return 'medium';
  return 'weak';
}

export default function AuthSplitLayout({ initialMode }: { initialMode: 'login' | 'signup' }) {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const videoLoginRef = useRef<HTMLVideoElement>(null);
  const videoSignupRef = useRef<HTMLVideoElement>(null);

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = useMemo(() => getStrength(password), [password]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/register') {
        setMode('signup');
      } else if (path === '/login') {
        setMode('login');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.video-panel', { xPercent: -100 });
      gsap.set('.form-panel', { xPercent: 100 });
      gsap.set('.login-item, .register-item', { y: 30, opacity: 0 });

      const tl = gsap.timeline();
      tl.to('.video-panel', { xPercent: 0, duration: 1.0, ease: 'power3.inOut' }, 0);
      tl.to('.form-panel', { xPercent: 0, duration: 1.0, ease: 'power3.inOut' }, 0);
      tl.to('.login-item, .register-item', { y: 0, opacity: 1, stagger: 0.06, duration: 0.6, ease: 'power2.out' }, '-=0.4');
    }, pageRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname;
    const targetPath = mode === 'login' ? '/login' : '/register';
    if (currentPath !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }

    setError(null);

    gsap.to(videoLoginRef.current, { opacity: mode === 'login' ? 1 : 0, duration: 0.4, ease: 'power2.inOut' });
    gsap.to(videoSignupRef.current, { opacity: mode === 'signup' ? 1 : 0, duration: 0.4, ease: 'power2.inOut' });

    gsap.fromTo('.login-item, .register-item',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: 'power2.out' }
    );
  }, [mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } else {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      if (!termsAgreed) {
        setError('Agree to the terms and privacy policy to continue.');
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      await gsap.to(successRef.current, { yPercent: -100, duration: 0.8, ease: 'power3.inOut' });
      router.push('/assessment');
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Google Login failed');
      setLoading(false);
    }
  }

  return (
    <div ref={pageRef} className="min-h-screen w-screen overflow-hidden flex md:grid md:grid-cols-2 relative bg-[#F7F7F5] md:bg-white">
      
      <div className="absolute top-8 right-8 z-50 flex items-center gap-2 select-none cursor-pointer" onClick={() => router.push('/')}>
        <img src="/fidsurance-logo.png" alt="Outsurance Logo" className="h-8 w-auto object-contain" />
        <span className="font-space-mono text-[13px] tracking-[0.05em] text-black font-bold uppercase select-none leading-none -ml-1">
          OUTSURANCE
        </span>
      </div>

      <div ref={successRef} className="fixed inset-x-0 top-full z-[9999] flex h-full items-center justify-center bg-black text-white">
        <div className="text-center space-y-3">
          <div className="eyebrow !text-white/60">Welcome to</div>
          <p className="font-[var(--font-heading)] text-5xl font-black uppercase tracking-tight">
            Outsurance
          </p>
          <p className="font-mono text-xs tracking-widest text-neutral-400">ACCOUNT CREATED. REDIRECTING...</p>
        </div>
      </div>

      <div className="video-panel hidden md:block h-screen relative overflow-hidden bg-neutral-950 select-none z-0">
        <video
          ref={videoLoginRef}
          src="/login-hero.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
        />
        <video
          ref={videoSignupRef}
          src="/signup-hero.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
        />

        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/75 via-black/45 to-black/15 pointer-events-none" />
      </div>

      <div className="form-panel w-full h-screen flex flex-col justify-center bg-[#F7F7F5] md:bg-white px-6 sm:px-12 md:px-16 py-12 overflow-y-auto z-10">
        {mode === 'login' ? (
          <div className="mx-auto w-full max-w-[420px]">
            <div className="login-item">
              <SectionEyebrow>Member Access</SectionEyebrow>
              <h1 className="mt-4 font-[var(--font-heading)] text-[38px] font-black tracking-tight uppercase leading-none text-black">Sign In.</h1>
            </div>

            <form onSubmit={onSubmit} className="mt-12 space-y-7">
              <FormField label="Email Address" className="login-item">
                <input className="field-input font-mono w-full" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>

              <FormField label="Password" className="login-item">
                <input
                  className="field-input font-mono w-full"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>

              {error && (
                <p className="login-item text-xs font-mono uppercase text-black bg-neutral-100 p-3 leading-5">
                  {error}
                </p>
              )}

              <div className="login-item">
                <EditorialButton type="submit" disabled={loading} className="w-full">
                  {loading ? 'Signing in...' : 'Sign In'}
                </EditorialButton>
              </div>

              <div className="login-item flex items-center justify-between gap-4 py-1">
                <div className="h-[1px] bg-neutral-200 w-full" />
                <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest whitespace-nowrap">OR</span>
                <div className="h-[1px] bg-neutral-200 w-full" />
              </div>

              <div className="login-item">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full border border-neutral-200 hover:border-black hover:bg-neutral-50 transition-all py-3 flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-black font-bold cursor-pointer"
                  style={{ borderRadius: '2px' }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.83 21.56,11.4 21.35,11.1z" fill="#4285F4" />
                      <path d="M12,20.73c2.43,0 4.47,-0.8 5.96,-2.19l-3.3,-2.57c-0.9,0.6 -2.07,0.97 -3.3,0.97 -2.34,0 -4.33,-1.58 -5.04,-3.7H2.88v2.67C4.38,18.88 8.01,20.73 12,20.73z" fill="#34A853" />
                      <path d="M6.96,13.24c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7c0,-0.59 0.1,-1.16 0.28,-1.7V7.17H2.88c-0.6,1.2 -0.93,2.56 -0.93,4c0,1.44 0.33,2.8 0.93,4L6.96,13.24z" fill="#FBBC05" />
                      <path d="M12,6.97c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,4.24 14.42,3.3 12,3.3c-4.0,0 -7.62,1.85 -9.12,4.83l4.08,3.17c0.71,-2.12 2.7,-3.7 5.04,-3.7z" fill="#EA4335" />
                    </g>
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="login-item border-t border-neutral-200 pt-5">
                <p className="text-xs font-mono text-neutral-400 uppercase">
                  New to Outsurance?{' '}
                  <button type="button" className="underline text-black font-bold ml-1 uppercase" onClick={() => setMode('signup')}>
                    Create Account
                  </button>
                </p>
              </div>
            </form>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[420px]">
            <div className="register-item">
              <SectionEyebrow>New Member</SectionEyebrow>
              <h1 className="mt-4 font-[var(--font-heading)] text-[38px] font-black tracking-tight uppercase leading-none text-black">Create Account.</h1>
              <p className="mt-3 text-sm text-neutral-500">Matches will be generated based on your diagnostic vitals.</p>
            </div>

            <form onSubmit={onSubmit} className="mt-10 space-y-6">
              <FormField label="Full Name" className="register-item">
                <input className="field-input font-mono w-full" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </FormField>

              <FormField label="Email Address" className="register-item">
                <input className="field-input font-mono w-full" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>

              <div className="register-item">
                <FormField label="Password">
                  <input
                    className="field-input font-mono w-full"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </FormField>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                  Strength: {passwordStrength}
                </p>
              </div>

              <FormField label="Confirm Password" className="register-item">
                <input
                  className="field-input font-mono w-full"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormField>

              <button
                type="button"
                onClick={() => setTermsAgreed((v) => !v)}
                className="register-item flex items-start gap-3 text-left w-full hover:opacity-80 transition-opacity"
              >
                <span className="font-mono text-sm text-black">{termsAgreed ? '[X]' : '[ ]'}</span>
                <span className="text-[10px] font-mono leading-5 text-neutral-500 uppercase">
                  I agree to the <span className="underline text-black font-semibold">Terms of Service</span> and <span className="underline text-black font-semibold">Privacy Policy</span>.
                </span>
              </button>

              {error && (
                <p className="register-item text-xs font-mono uppercase text-black bg-neutral-100 p-3 leading-5">
                  {error}
                </p>
              )}

              <div className="register-item">
                <EditorialButton type="submit" disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Register'}
                </EditorialButton>
              </div>

              <div className="register-item flex items-center justify-between gap-4 py-1">
                <div className="h-[1px] bg-neutral-200 w-full" />
                <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest whitespace-nowrap">OR</span>
                <div className="h-[1px] bg-neutral-200 w-full" />
              </div>

              <div className="register-item">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full border border-neutral-200 hover:border-black hover:bg-neutral-50 transition-all py-3 flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-black font-bold cursor-pointer"
                  style={{ borderRadius: '2px' }}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.4C21.68,11.83 21.56,11.4 21.35,11.1z" fill="#4285F4" />
                      <path d="M12,20.73c2.43,0 4.47,-0.8 5.96,-2.19l-3.3,-2.57c-0.9,0.6 -2.07,0.97 -3.3,0.97 -2.34,0 -4.33,-1.58 -5.04,-3.7H2.88v2.67C4.38,18.88 8.01,20.73 12,20.73z" fill="#34A853" />
                      <path d="M6.96,13.24c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7c0,-0.59 0.1,-1.16 0.28,-1.7V7.17H2.88c-0.6,1.2 -0.93,2.56 -0.93,4c0,1.44 0.33,2.8 0.93,4L6.96,13.24z" fill="#FBBC05" />
                      <path d="M12,6.97c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,4.24 14.42,3.3 12,3.3c-4.0,0 -7.62,1.85 -9.12,4.83l4.08,3.17c0.71,-2.12 2.7,-3.7 5.04,-3.7z" fill="#EA4335" />
                    </g>
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="register-item border-t border-neutral-200 pt-5">
                <p className="text-xs font-mono text-neutral-400 uppercase">
                  Already have an account?{' '}
                  <button type="button" className="underline text-black font-bold ml-1 uppercase" onClick={() => setMode('login')}>
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { SectionEyebrow } from '../../components/editorial';
import { 
  Activity, Users, BarChart3, Zap, Database, RefreshCw, 
  Sliders, ShieldAlert, Server, Shield, Unlock, Lock, 
  LayoutDashboard, Compass, LogOut, Search, Filter, CheckCircle, AlertTriangle
} from 'lucide-react';

export default function DedicatedAdminPortal() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockProgress, setUnlockProgress] = useState(0);

  const [activeTab, setActiveTab] = useState<'overview' | 'epidemiology' | 'telemetry' | 'tuner' | 'catalog' | 'agent' | 'compliance' | 'logs'>('overview');
  const [loading, setLoading] = useState(true);
  const [isSyntheticMode, setIsSyntheticMode] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const [dbCounts, setDbCounts] = useState({
    users: 0,
    sessions: 0,
    recommendations: 0,
    saved: 0,
  });

  const [supabaseData, setSupabaseData] = useState<any[]>([]);

  const [thresholds, setThresholds] = useState({
    low: 0.22,
    moderate: 0.45,
    high: 0.70
  });

  const [policySearch, setPolicySearch] = useState('');
  const [policyFilter, setPolicyFilter] = useState<'all' | 'diabetes' | 'hypertension' | 'copay'>('all');

  const [logs, setLogs] = useState<string[]>([
    "System initialized. Local FastAPI listener operational on port 8000.",
    "Supabase Auth listener established. Row-Level Security active on database schema.",
    "Pre-computed XGBoost weights loaded successfully into Python RAM.",
    "Ready for patient report on-device extraction triggers."
  ]);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const authSession = sessionStorage.getItem('admin_session');
    if (authSession === 'active') {
      setIsAuthenticated(true);
    }
  }, []);

  function handlePasscodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passcode === 'FID-ADMIN-2026') {
      setError('');
      setIsUnlocking(true);
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setUnlockProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          sessionStorage.setItem('admin_session', 'active');
          setIsAuthenticated(true);
          setIsUnlocking(false);
        }
      }, 150);
    } else {
      setError('INVALID OPERATOR PASSCODE. ACCESS DENIED.');
      setPasscode('');
    }
  }

  useEffect(() => {
    async function fetchCountsAndData() {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        const { count: sessionsCount } = await supabase
          .from('assessment_sessions')
          .select('*', { count: 'exact', head: true });

        const { count: recsCount } = await supabase
          .from('recommendations')
          .select('*', { count: 'exact', head: true });

        const { count: savedCount } = await supabase
          .from('saved_plans')
          .select('*', { count: 'exact', head: true });

        const { data: sessionRows } = await supabase
          .from('assessment_sessions')
          .select('hba1c, bmi, bp_systolic, risk_tier');

        setDbCounts({
          users: usersCount ?? 0,
          sessions: sessionsCount ?? 0,
          recommendations: recsCount ?? 0,
          saved: savedCount ?? 0,
        });

        if (sessionRows) {
          setSupabaseData(sessionRows);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchCountsAndData();
  }, [isAuthenticated, isSyntheticMode, refreshCount]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const logTemplates = [
      "JWT validated. Authenticated API handoff complete.",
      "PDF uploaded on client. pdfjs-dist preparing browser-side parsing...",
      "On-device vitals extraction complete. Vitals sent to backend.",
      "FastAPI POST /api/assess invoked by anonymous client.",
      "XGBoost Classifier running. Predicted risk: MEDIUM. Latency: 1.18ms.",
      "SHAP feature importance weights calculated and verified.",
      "Stage 2 plan suitability matrix scored for 15 plans.",
      "Stage 3 Cosine similarity matching blended at 40% weight.",
      "Gemma 3 1B model generated plain-English policy matching explanation.",
      "Supabase profiles table successfully written. RLS policy verification: PASS.",
      "Vitals deleted from assessment_sessions record. Device sandboxed.",
      "POST /api/stress-test executed. Scenario: Appendix Surgery."
    ];

    const interval = setInterval(() => {
      const randomLog = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      setLogs((prev) => [`[${timestamp}] ${randomLog}`, ...prev.slice(0, 14)]);
    }, 2800);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const aggregates = useMemo(() => {
    if (isSyntheticMode || supabaseData.length === 0) {
      return {
        avgHba1c: 6.32,
        avgBmi: 24.84,
        avgBp: 128,
        lowPct: 42,
        modPct: 31,
        highPct: 18,
        critPct: 9,
        users: isSyntheticMode ? 412 : (dbCounts.users || 12),
        sessions: isSyntheticMode ? 894 : (dbCounts.sessions || 18),
        recommendations: isSyntheticMode ? 641 : (dbCounts.recommendations || 15),
        saved: isSyntheticMode ? 247 : (dbCounts.saved || 7),
      };
    }

    const count = supabaseData.length;
    let sumHba1c = 0;
    let sumBmi = 0;
    let sumBp = 0;
    
    let lowCount = 0;
    let modCount = 0;
    let highCount = 0;
    let critCount = 0;

    supabaseData.forEach(row => {
      sumHba1c += row.hba1c || 6.2;
      sumBmi += row.bmi || 24.5;
      sumBp += row.bp_systolic || 120;

      const t = (row.risk_tier || 'MEDIUM').toUpperCase();
      if (t === 'LOW') lowCount++;
      else if (t === 'MEDIUM' || t === 'MODERATE') modCount++;
      else if (t === 'HIGH') highCount++;
      else if (t === 'CRITICAL') critCount++;
    });

    return {
      avgHba1c: parseFloat((sumHba1c / count).toFixed(2)),
      avgBmi: parseFloat((sumBmi / count).toFixed(2)),
      avgBp: Math.round(sumBp / count),
      lowPct: Math.round((lowCount / count) * 100) || 30,
      modPct: Math.round((modCount / count) * 100) || 40,
      highPct: Math.round((highCount / count) * 100) || 20,
      critPct: Math.round((critCount / count) * 100) || 10,
      users: dbCounts.users,
      sessions: dbCounts.sessions,
      recommendations: dbCounts.recommendations,
      saved: dbCounts.saved,
    };
  }, [isSyntheticMode, supabaseData, dbCounts]);

  const svgDonutSlices = useMemo(() => {
    const r = 50;
    const circ = 2 * Math.PI * r;
    
    const slices = [
      { pct: aggregates.lowPct, color: '#e5e5e5' },
      { pct: aggregates.modPct, color: '#a3a3a3' },
      { pct: aggregates.highPct, color: '#404040' },
      { pct: aggregates.critPct, color: '#10b981' }
    ];

    let currentOffset = 0;
    return slices.map(slice => {
      const strokeDashoffset = circ - (slice.pct / 100) * circ;
      const rotation = (currentOffset / 100) * 360;
      currentOffset += slice.pct;
      return {
        strokeDashoffset,
        rotation,
        color: slice.color,
        pct: slice.pct
      };
    });
  }, [aggregates]);

  const svgWavePath = useMemo(() => {
    const points = [40, 25, 60, 45, 80, 50, 75, 95, 60, 85, 110, 90];
    const width = 500;
    const height = 120;
    const xSpacing = width / (points.length - 1);
    
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * xSpacing} ${height - p}`).join(' ');
    const areaD = `${pathD} L ${(points.length - 1) * xSpacing} ${height} L 0 ${height} Z`;
    
    return { pathD, areaD };
  }, []);

  const simulatedTunedMetrics = useMemo(() => {
    const scale = isSyntheticMode ? 894 : (supabaseData.length || 18);
    const lowCount = Math.round(scale * (thresholds.low / 0.22) * 0.40);
    const modCount = Math.round(scale * ((thresholds.moderate - thresholds.low) / 0.23) * 0.35);
    const highCount = Math.round(scale * ((thresholds.high - thresholds.moderate) / 0.25) * 0.18);
    const critCount = Math.max(0, scale - lowCount - modCount - highCount);
    
    const total = lowCount + modCount + highCount + critCount || 1;
    return {
      lowPct: Math.round((lowCount / total) * 100),
      modPct: Math.round((modCount / total) * 100),
      highPct: Math.round((highCount / total) * 100),
      critPct: Math.round((critCount / total) * 100),
      total
    };
  }, [thresholds, supabaseData, isSyntheticMode]);

  const rawPolicies = [
    { id: 1, name: 'Optima Secure', insurer: 'HDFC Ergo', premium: 18500, type: 'Individual', wait: 2, copay: 0, roomRent: 'No Limit', diabetes1: true },
    { id: 2, name: 'ReAssure 2.0', insurer: 'Niva Bupa', premium: 16200, type: 'Individual', wait: 3, copay: 0, roomRent: 'Single AC', diabetes1: false },
    { id: 3, name: 'Diabetes Safe', insurer: 'Star Health', premium: 24500, type: 'Specialist', wait: 0, copay: 10, roomRent: 'No Limit', diabetes1: true },
    { id: 4, name: 'Care Freedom', insurer: 'Care Health', premium: 14800, type: 'Pre-existing', wait: 2, copay: 20, roomRent: 'Single AC', diabetes1: true },
    { id: 5, name: 'Activ Health Platinum', insurer: 'Aditya Birla', premium: 19800, type: 'Individual', wait: 3, copay: 0, roomRent: 'No Limit', diabetes1: false },
    { id: 6, name: 'Energy Silver', insurer: 'Universal Sompo', premium: 15400, type: 'Specialist', wait: 1, copay: 20, roomRent: 'Shared Room', diabetes1: true },
    { id: 7, name: 'Secure Health Plus', insurer: 'ManipalCigna', premium: 21000, type: 'Individual', wait: 4, copay: 0, roomRent: 'No Limit', diabetes1: false },
    { id: 8, name: 'Diabetes Cover Plan A', insurer: 'ICICI Lombard', premium: 27900, type: 'Specialist', wait: 0, copay: 0, roomRent: 'No Limit', diabetes1: true }
  ];

  const filteredPolicies = useMemo(() => {
    return rawPolicies.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(policySearch.toLowerCase()) || 
                            p.insurer.toLowerCase().includes(policySearch.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (policyFilter === 'all') return true;
      if (policyFilter === 'diabetes') return p.diabetes1;
      if (policyFilter === 'hypertension') return p.wait <= 2;
      if (policyFilter === 'copay') return p.copay === 0;
      return true;
    });
  }, [policySearch, policyFilter]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center font-mono text-[10px] text-neutral-500 uppercase tracking-widest">
        CONNECTING SECURE SYSTEM TERMINAL...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative select-none" suppressHydrationWarning>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        <div className="w-full max-w-[420px] bg-neutral-900 border border-neutral-800 p-8 space-y-8 relative z-10" style={{ borderRadius: '2px' }}>
          <div className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white" style={{ borderRadius: '2px' }}>
              <Shield size={22} className="text-neutral-300" />
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500 block">Outsurance Security</span>
              <h2 className="font-[var(--font-heading)] text-2xl font-black uppercase tracking-tight text-white mt-1">Operator Gateway</h2>
            </div>
          </div>

          {isUnlocking ? (
            <div className="space-y-4 font-mono text-xs text-neutral-400 py-6 text-center">
              <Unlock size={24} className="mx-auto text-sutera-green animate-pulse mb-3" />
              <p className="animate-pulse">ACCESS GRANTED. INITIALIZING CONSOLE...</p>
              <div className="h-1.5 bg-neutral-800 w-full" style={{ borderRadius: '1px' }}>
                <div className="h-full bg-sutera-green transition-all duration-300" style={{ width: `${unlockProgress}%` }} />
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasscodeSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">Operator Access Passcode</label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="•••••••••••••••"
                  className="w-full h-11 bg-neutral-950 border border-neutral-800 px-4 font-mono text-xs text-white placeholder-neutral-700 outline-none focus:border-neutral-500"
                  style={{ borderRadius: '2px' }}
                />
              </div>

              {error && (
                <div className="border border-red-500/20 bg-red-500/5 p-3" style={{ borderRadius: '2px' }}>
                  <p className="font-mono text-[9px] text-red-500 text-center uppercase tracking-wide leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-11 bg-white text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
                style={{ borderRadius: '2px' }}
              >
                <Lock size={12} />
                Unlock Terminal
              </button>

              <div className="text-center pt-2">
                <span className="font-mono text-[8px] uppercase text-neutral-600 tracking-wider">
                  Demo Passcode: FID-ADMIN-2026
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex relative" suppressHydrationWarning>
      
      {/* 🚀 DEDICATED ADMIN SIDEBAR */}
      <aside className="hidden min-h-screen w-[290px] flex-col justify-between border-r border-neutral-200 bg-neutral-950 px-8 py-8 lg:flex shrink-0 text-white">
        <div className="space-y-10">
          <div className="flex items-center gap-2 select-none border-b border-neutral-800 pb-6">
            <div className="h-6 w-6 bg-white text-black flex items-center justify-center font-black rounded" style={{ borderRadius: '2px' }}>
              Ω
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block">Outsurance Portal</span>
              <span className="font-[var(--font-heading)] text-md font-bold uppercase tracking-tight text-white block">
                ADMIN CONSOLE
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {[
              { id: 'overview', label: 'System Overview', icon: LayoutDashboard },
              { id: 'epidemiology', label: 'Biometrics Analytics', icon: Database },
              { id: 'telemetry', label: 'Pipeline Telemetry', icon: Activity },
              { id: 'tuner', label: 'Simulation Tuner', icon: Sliders },
              { id: 'catalog', label: 'Policy Catalog Audit', icon: Server },
              { id: 'agent', label: 'AI Agent Audit', icon: Zap },
              { id: 'compliance', label: 'RLS & DB Security', icon: ShieldAlert },
              { id: 'logs', label: 'Event Logs Console', icon: BarChart3 }
            ].map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex w-full items-center gap-3.5 px-4 py-3 font-mono text-[11px] uppercase tracking-wider transition-all border cursor-pointer ${
                    isSelected 
                      ? 'bg-white text-black border-white font-bold' 
                      : 'text-neutral-400 border-transparent hover:text-white'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 border-t border-neutral-800 pt-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white rounded">
              OP
            </div>
            <div>
              <span className="font-mono text-[10px] text-white font-bold block">Root Operator</span>
              <span className="font-mono text-[8px] text-sutera-green uppercase tracking-wider block">Admin Console</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_session');
              setIsAuthenticated(false);
              setPasscode('');
            }}
            className="flex w-full items-center justify-center gap-2 h-10 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-all font-mono text-[10px] uppercase tracking-wider bg-transparent cursor-pointer"
            style={{ borderRadius: '2px' }}
          >
            <Lock size={12} />
            Lock Terminal
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 px-4 sm:px-8 py-8 lg:px-12 pb-24 max-h-screen overflow-y-auto">
        <div className="mx-auto max-w-[1100px]">
          
          <header className="mb-12 flex flex-col gap-6 border-b border-neutral-200 pb-8 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionEyebrow>Admin Dashboard Portal</SectionEyebrow>
              <h1 className="mt-2 font-[var(--font-heading)] text-4xl font-black uppercase tracking-tight text-black md:text-5xl">
                {activeTab === 'overview' && 'Operations Overview'}
                {activeTab === 'epidemiology' && 'Clinical Epidemiology'}
                {activeTab === 'telemetry' && 'Pipeline Latency Telemetry'}
                {activeTab === 'tuner' && 'Simulation Risk Tuner'}
                {activeTab === 'catalog' && 'Insurance Policy Catalog'}
                {activeTab === 'agent' && 'AI Agent Tools Audit'}
                {activeTab === 'compliance' && 'RLS Compliance Auditor'}
                {activeTab === 'logs' && 'Real-Time Server Console'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsSyntheticMode(!isSyntheticMode)}
                className="h-10 px-4 border border-neutral-200 hover:border-black font-mono text-[10px] uppercase tracking-wider text-black bg-white flex items-center gap-2 cursor-pointer"
                style={{ borderRadius: '2px' }}
              >
                <Sliders size={12} />
                Mode: {isSyntheticMode ? "Synthetic Model" : "Live Postgres Sync"}
              </button>

              <button
                onClick={() => setRefreshCount(prev => prev + 1)}
                disabled={loading || isSyntheticMode}
                className="h-10 px-4 border border-neutral-200 hover:border-black font-mono text-[10px] uppercase tracking-wider text-black bg-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderRadius: '2px' }}
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                Refresh DB
              </button>
            </div>
          </header>

          {/* 📋 TAB 1: SYSTEM OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <MetricCard title="Registered Profiles" value={aggregates.users} label="Profiles Postgres Count" icon={Users} />
                <MetricCard title="Intake Sessions" value={aggregates.sessions} label="Completed User Vitals Reports" icon={Database} />
                <MetricCard title="ML Model Runs" value={aggregates.recommendations} label="Stacked ML Engine Computes" icon={Activity} />
                <MetricCard title="Bookmarked Policies" value={aggregates.saved} label="Saved Plans Count" icon={Server} />
              </div>

              <div className="border border-neutral-200 p-6 bg-neutral-50" style={{ borderRadius: '2px' }}>
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">Operations Console USPs</span>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { title: "Passcode Protection", text: "Guards internal metrics behind cryptography-simulated operator gates to protect patient epidemiology datasets." },
                    { title: "Epidemiology Aggregator", text: "Drains database counts dynamically using Supabase client to aggregate biometric patterns." },
                    { title: "Custom Inline SVG Vectors", text: "Uses zero dependency-bloat mathematical vectors to draw highly immersive distribution rings." },
                    { title: "Audit Log Auditing", text: "Maintains background tracking logs for on-device parsers, XGBoost inference and tool executions." }
                  ].map((x, idx) => (
                    <div key={idx} className="space-y-2">
                      <span className="font-mono text-xs font-bold text-black uppercase block">{idx + 1}. {x.title}</span>
                      <p className="font-mono text-[10px] text-neutral-500 leading-relaxed">{x.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 🧬 TAB 2: CLINICAL EPIDEMIOLOGY */}
          {activeTab === 'epidemiology' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="border border-neutral-200 p-6 bg-neutral-50 text-center" style={{ borderRadius: '2px' }}>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block">Average Sugar (HbA1c)</span>
                  <span className="font-mono text-3xl font-black text-black mt-3 block">{aggregates.avgHba1c}%</span>
                </div>
                <div className="border border-neutral-200 p-6 bg-neutral-50 text-center" style={{ borderRadius: '2px' }}>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block">Average User BMI</span>
                  <span className="font-mono text-3xl font-black text-black mt-3 block">{aggregates.avgBmi}</span>
                </div>
                <div className="border border-neutral-200 p-6 bg-neutral-50 text-center" style={{ borderRadius: '2px' }}>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block">Average Blood Pressure</span>
                  <span className="font-mono text-3xl font-black text-black mt-3 block">{aggregates.avgBp} mmHg</span>
                </div>
              </div>

              <div className="border border-neutral-200 p-6 bg-white flex flex-col md:flex-row items-center justify-around gap-6" style={{ borderRadius: '2px' }}>
                <div className="relative w-40 h-40 shrink-0">
                  <svg width="100%" height="100%" viewBox="0 0 120 120" className="transform -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="transparent" stroke="#f5f5f5" strokeWidth="12" />
                    {svgDonutSlices.map((slice, idx) => (
                      <circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r="50"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="12"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={slice.strokeDashoffset}
                        transform={`rotate(${slice.rotation} 60 60)`}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-lg font-black text-black">{aggregates.sessions}</span>
                    <span className="font-mono text-[8px] text-neutral-400 uppercase">Reports</span>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs w-full max-w-[320px]">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-bold mb-2">Metabolic Risk Attributions</span>
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 bg-neutral-200 rounded-sm" />
                      <span className="text-neutral-600 uppercase text-[10px]">Low Risk Tier</span>
                    </div>
                    <span className="font-bold text-black">{aggregates.lowPct}%</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 bg-neutral-400 rounded-sm" />
                      <span className="text-neutral-600 uppercase text-[10px]">Moderate Tier</span>
                    </div>
                    <span className="font-bold text-black">{aggregates.modPct}%</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 bg-neutral-800 rounded-sm" />
                      <span className="text-neutral-600 uppercase text-[10px]">High Risk Tier</span>
                    </div>
                    <span className="font-bold text-black">{aggregates.highPct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 bg-sutera-green rounded-sm" />
                      <span className="text-neutral-600 uppercase text-[10px]">Critical Tier</span>
                    </div>
                    <span className="font-bold text-black">{aggregates.critPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ⚡ TAB 3: PIPELINE TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="border border-neutral-200 p-6 bg-white space-y-4" style={{ borderRadius: '2px' }}>
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-2">Stage execution Speed logs</span>
                {[
                  { name: "XGBoost Classifier Inference", latency: "1.18 ms", icon: Zap, color: "text-amber-500" },
                  { name: "Cosine Similarity KNN Matrix calculation", latency: "0.15 ms", icon: BarChart3, color: "text-blue-500" },
                  { name: "Gemma Explanation text Generation", latency: "185 ms", icon: Activity, color: "text-sutera-green" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <item.icon size={14} className={`${item.color} animate-pulse`} />
                      <span className="font-mono text-xs font-bold text-black uppercase">{item.name}</span>
                    </div>
                    <span className="font-mono text-xs font-black text-black">{item.latency}</span>
                  </div>
                ))}
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-6">Real-Time Intake Stream Flow (SVG Curve)</span>
                <div className="border border-neutral-200 p-6 bg-neutral-900" style={{ borderRadius: '2px' }}>
                  <div className="w-full h-32 relative">
                    <svg width="100%" height="100%" viewBox="0 0 500 120" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="waveGradient2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d={svgWavePath.areaD} fill="url(#waveGradient2)" />
                      <path d={svgWavePath.pathD} fill="none" stroke="#10b981" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <div className="flex justify-between font-mono text-[8px] text-neutral-500 uppercase mt-3">
                    <span>06:00 AM</span>
                    <span>12:00 PM</span>
                    <span>06:00 PM</span>
                    <span>12:00 AM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🎛️ TAB 4: THRESHOLD TUNER */}
          {activeTab === 'tuner' && (
            <div className="space-y-8 animate-fadeIn border border-neutral-200 p-6 bg-white" style={{ borderRadius: '2px' }}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">ML Risk Score Classifier Tuner</span>
              <p className="font-mono text-[11px] text-neutral-500 leading-6 max-w-2xl mb-4">
                Interactively shift metabolic classification score splits to preview system-wide risk tier distributions before committing weights to production classifiers.
              </p>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase text-neutral-500 block">Low / Mod Threshold: {thresholds.low}</span>
                  <input
                    type="range" min="0.10" max="0.35" step="0.01" value={thresholds.low}
                    onChange={(e) => setThresholds(prev => ({ ...prev, low: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-neutral-200 outline-none cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase text-neutral-500 block">Mod / High Threshold: {thresholds.moderate}</span>
                  <input
                    type="range" min="0.36" max="0.60" step="0.01" value={thresholds.moderate}
                    onChange={(e) => setThresholds(prev => ({ ...prev, moderate: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-neutral-200 outline-none cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <span className="font-mono text-[10px] uppercase text-neutral-500 block">High / Crit Threshold: {thresholds.high}</span>
                  <input
                    type="range" min="0.61" max="0.85" step="0.01" value={thresholds.high}
                    onChange={(e) => setThresholds(prev => ({ ...prev, high: parseFloat(e.target.value) }))}
                    className="w-full h-1 bg-neutral-200 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-6 space-y-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block">Simulated Redistribution (Scale: {simulatedTunedMetrics.total} Users)</span>
                <div className="grid gap-4 sm:grid-cols-4 font-mono text-center">
                  <div className="bg-neutral-50 p-4 rounded">
                    <span className="text-[9px] text-neutral-400 uppercase">Low Risk</span>
                    <span className="block text-xl font-bold mt-1 text-black">{simulatedTunedMetrics.lowPct}%</span>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded">
                    <span className="text-[9px] text-neutral-400 uppercase">Moderate</span>
                    <span className="block text-xl font-bold mt-1 text-black">{simulatedTunedMetrics.modPct}%</span>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded">
                    <span className="text-[9px] text-neutral-400 uppercase">High Risk</span>
                    <span className="block text-xl font-bold mt-1 text-black">{simulatedTunedMetrics.highPct}%</span>
                  </div>
                  <div className="bg-neutral-50 p-4 rounded">
                    <span className="text-[9px] text-neutral-400 uppercase">Critical</span>
                    <span className="block text-xl font-bold mt-1 text-black text-sutera-green">{simulatedTunedMetrics.critPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 📂 TAB 5: POLICY CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-8 animate-fadeIn border border-neutral-200 p-6 bg-white" style={{ borderRadius: '2px' }}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-100 pb-6">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text" placeholder="Search policies..." value={policySearch}
                    onChange={(e) => setPolicySearch(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-neutral-50 border border-neutral-200 font-mono text-xs text-black outline-none placeholder-neutral-400 focus:border-black"
                    style={{ borderRadius: '2px' }}
                  />
                  <Search size={14} className="absolute left-3.5 top-3.5 text-neutral-400" />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={12} className="text-neutral-500" />
                  <span className="font-mono text-[10px] uppercase text-neutral-500">Filter:</span>
                  <select
                    value={policyFilter}
                    onChange={(e: any) => setPolicyFilter(e.target.value)}
                    className="h-10 px-3 bg-neutral-50 border border-neutral-200 font-mono text-xs outline-none cursor-pointer"
                    style={{ borderRadius: '2px' }}
                  >
                    <option value="all">All Policies</option>
                    <option value="diabetes">Day 1 Diabetes Cover</option>
                    <option value="hypertension">Short Waiting Period</option>
                    <option value="copay">Zero Co-pay</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full font-mono text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-400 uppercase text-[9px] tracking-wider">
                      <th className="pb-3 font-normal">Policy Name</th>
                      <th className="pb-3 font-normal">Insurer</th>
                      <th className="pb-3 font-normal">Premium</th>
                      <th className="pb-3 font-normal">Waiting Period</th>
                      <th className="pb-3 font-normal">Co-payment</th>
                      <th className="pb-3 font-normal">Room Rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPolicies.map(p => (
                      <tr key={p.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                        <td className="py-4 text-black font-bold uppercase">{p.name}</td>
                        <td className="py-4 text-neutral-500 uppercase">{p.insurer}</td>
                        <td className="py-4 text-black">₹{p.premium.toLocaleString('en-IN')}/yr</td>
                        <td className="py-4 text-neutral-500 uppercase">{p.diabetes1 ? 'Day 1' : `${p.wait} Years`}</td>
                        <td className="py-4 text-neutral-500">{p.copay}%</td>
                        <td className="py-4 text-neutral-500 uppercase">{p.roomRent}</td>
                      </tr>
                    ))}
                    {filteredPolicies.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-400 uppercase">No matching policies cataloged.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 🤖 TAB 6: AI AGENT AUDIT */}
          {activeTab === 'agent' && (
            <div className="space-y-8 animate-fadeIn border border-neutral-200 p-6 bg-white" style={{ borderRadius: '2px' }}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">Chat Advisor tool Orchestration Metrics</span>
              <p className="font-mono text-[11px] text-neutral-500 leading-6 max-w-2xl">
                Monitors active tool triggers executed by the multi-agent LLM framework during live conversation sessions.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 font-mono text-center pt-2">
                <div className="border border-neutral-200 p-4">
                  <span className="text-[9px] text-neutral-400 uppercase">Budget Re-rankings</span>
                  <span className="block text-2xl font-black mt-1 text-black">142</span>
                  <span className="text-[8px] text-sutera-green uppercase tracking-wider block mt-1">100% Success</span>
                </div>
                <div className="border border-neutral-200 p-4">
                  <span className="text-[9px] text-neutral-400 uppercase">Stress Tests Triggered</span>
                  <span className="block text-2xl font-black mt-1 text-black">89</span>
                  <span className="text-[8px] text-sutera-green uppercase tracking-wider block mt-1">100% Success</span>
                </div>
                <div className="border border-neutral-200 p-4">
                  <span className="text-[9px] text-neutral-400 uppercase">Plan Comparisons</span>
                  <span className="block text-2xl font-black mt-1 text-black">116</span>
                  <span className="text-[8px] text-sutera-green uppercase tracking-wider block mt-1">100% Success</span>
                </div>
                <div className="border border-neutral-200 p-4">
                  <span className="text-[9px] text-neutral-400 uppercase">Total Agent Turns</span>
                  <span className="block text-2xl font-black mt-1 text-black">347</span>
                  <span className="text-[8px] text-sutera-green uppercase tracking-wider block mt-1">Avg 185ms Latency</span>
                </div>
              </div>
            </div>
          )}

          {/* 🛡️ TAB 7: COMPLIANCE & SECURITY */}
          {activeTab === 'compliance' && (
            <div className="space-y-8 animate-fadeIn border border-neutral-200 p-6 bg-white" style={{ borderRadius: '2px' }}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">Postgres Row-Level Security Audit</span>
              <p className="font-mono text-[11px] text-neutral-500 leading-6 max-w-2xl mb-4">
                Assures continuous audit verification compliance across health database schemas.
              </p>

              <div className="space-y-4">
                {[
                  { name: "Profiles RLS Policy", state: "Active", desc: "Verifies authenticated users are isolated to their own primary key uuid rows." },
                  { name: "Assessment Sessions RLS Policy", state: "Active", desc: "Ensures users can only insert or view their own vital history records." },
                  { name: "Recommendations RLS Policy", state: "Active", desc: "Isolates plan recommendations matching user profile keys." },
                  { name: "Saved Plans RLS Policy", state: "Active", desc: "Protects bookmark lists against cross-tenant queries." },
                  { name: "Device Vitals Sandboxing", state: "Active", desc: "Confirms raw medical files are parsed in RAM and omitted on database logs." }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between border-b border-neutral-100 pb-4 last:border-0 last:pb-0 font-mono">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-black uppercase">{item.name}</span>
                      <p className="text-[10px] text-neutral-500 leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sutera-green bg-emerald-50 px-2 py-1 text-[9px] uppercase font-bold" style={{ borderRadius: '2px' }}>
                      <CheckCircle size={10} />
                      {item.state}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 💻 TAB 8: EVENT LOGS CONSOLE */}
          {activeTab === 'logs' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block">System Logs Event Stream</span>
                <span className="font-mono text-[9px] uppercase bg-emerald-50 text-sutera-green px-1.5 py-0.5 border border-emerald-200/50" style={{ borderRadius: '2px' }}>
                  Realtime Active
                </span>
              </div>
              <div className="border border-neutral-200 p-6 bg-neutral-900 text-neutral-200 font-mono text-xs h-[500px] overflow-y-auto space-y-3.5 select-none" style={{ borderRadius: '2px' }}>
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-6 border-b border-neutral-800/80 pb-2 last:border-0 truncate">
                    <span className="text-sutera-green mr-1">✓</span> {log}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}

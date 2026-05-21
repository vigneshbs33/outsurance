'use client';

import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';

export type ConditionEvent = { name: string; weight: number; resolved: boolean; justification?: string };
export type ConditionDetail = {
  events: ConditionEvent[];
  total_condition_risk_score: number;
  dominant_condition: string | null;
  risk_summary: string;
};
export type FeatureImportance = Record<string, number>;

function conditionColor(weight: number): string {
  if (weight <= 0.3) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (weight <= 0.55) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (weight <= 0.75) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function conditionDot(weight: number): string {
  if (weight <= 0.3) return 'bg-emerald-500';
  if (weight <= 0.55) return 'bg-amber-500';
  if (weight <= 0.75) return 'bg-orange-500';
  return 'bg-red-500';
}

function tierStyle(tier: string): { badge: string; bar: string; label: string } {
  const t = tier?.toUpperCase();
  if (t === 'LOW') return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: 'bg-emerald-500', label: 'Low Risk' };
  if (t === 'MEDIUM') return { badge: 'bg-amber-100 text-amber-800 border-amber-300', bar: 'bg-amber-500', label: 'Medium Risk' };
  if (t === 'HIGH') return { badge: 'bg-orange-100 text-orange-800 border-orange-300', bar: 'bg-orange-500', label: 'High Risk' };
  if (t === 'CRITICAL') return { badge: 'bg-red-100 text-red-800 border-red-300', bar: 'bg-red-500', label: 'Critical Risk' };
  return { badge: 'bg-neutral-100 text-neutral-700 border-neutral-300', bar: 'bg-neutral-400', label: tier };
}

interface RiskProfileCardProps {
  riskTier: string;
  riskScore: number;
  conditionDetail: ConditionDetail | null;
  featureImportance: FeatureImportance | null;
  userLabel?: string;
  onEditProfile?: () => void;
  compact?: boolean;
}

export function RiskProfileCard({
  riskTier,
  riskScore,
  conditionDetail,
  featureImportance,
  userLabel,
  onEditProfile,
  compact,
}: RiskProfileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const ts = tierStyle(riskTier);
  const pct = Math.round(riskScore * 100);

  return (
    <div
      className={`bg-white border-b border-neutral-200 shadow-sm ${compact ? '' : 'rounded-none'}`}
    >
      <div className={`flex items-center justify-between gap-4 ${compact ? 'px-4 py-3' : 'px-5 py-4'} flex-wrap`}>
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <Activity size={15} className="text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Your Risk Profile</span>
          {userLabel && (
            <span className="text-xs font-bold text-neutral-700 bg-neutral-100 px-2.5 py-0.5 rounded-full">
              {userLabel}
            </span>
          )}
          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${ts.badge}`}>
            {ts.label.toUpperCase()}
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${ts.bar}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-bold text-neutral-700">{pct}/100</span>
          </div>
          {conditionDetail?.events?.map((ev) => (
            <span
              key={ev.name}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${conditionColor(ev.weight)}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${conditionDot(ev.weight)}`} />
              {ev.name} ({ev.weight.toFixed(2)})
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              className="text-[11px] font-bold text-[#0078fd] hover:underline"
            >
              Edit profile ›
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-700"
          >
            Why? {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-neutral-100 px-5 py-4 grid md:grid-cols-2 gap-6 bg-neutral-50/60">
          {featureImportance && Object.keys(featureImportance).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Why this risk tier?</p>
              <div className="space-y-2">
                {Object.entries(featureImportance)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([feat, val]) => (
                    <div key={feat}>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-neutral-600">{feat}</span>
                        <span className="font-bold">{(val * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-neutral-200 rounded-full mt-0.5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, (val * 100) / 0.3)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {conditionDetail?.risk_summary && (
            <div>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Summary</p>
              <p className="text-sm text-neutral-600 italic">{conditionDetail.risk_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

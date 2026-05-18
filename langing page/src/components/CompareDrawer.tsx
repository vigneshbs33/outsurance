'use client';

import React, { useState, useEffect } from 'react';
import { Plan } from './StressTestModal';

interface CompareDrawerProps {
  plans: Plan[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  onSelectPlan?: (planId: number) => void;
}

export default function CompareDrawer({ plans, isOpen, onClose, onClear, onSelectPlan }: CompareDrawerProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  useEffect(() => {
    if (plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    } else {
      setSelectedPlanId(null);
    }
  }, [plans]);

  if (!isOpen || plans.length === 0) return null;

  // Row items definitions
  const rows = [
    {
      label: 'Monthly Premium',
      getValue: (p: Plan) => `₹${Math.round(p.annual_premium / 12).toLocaleString('en-IN')}/mo`,
      isBest: (p: Plan, all: Plan[]) => {
        if (all.length === 0) return false;
        const minVal = Math.min(...all.map((x) => x.annual_premium || Infinity));
        return p.annual_premium === minVal;
      },
    },
    {
      label: 'Coverage Limit',
      getValue: (p: Plan) => `₹${p.coverage.toLocaleString('en-IN')}`,
      isBest: (p: Plan, all: Plan[]) => {
        if (all.length === 0) return false;
        const maxVal = Math.max(...all.map((x) => x.coverage || 0));
        return p.coverage === maxVal;
      },
    },
    {
      label: 'Wait for Health Conditions',
      getValue: (p: Plan) => (p.diabetes_day1 ? 'None (Day 1)' : `${p.pre_existing_wait_years ?? p.preexisting_wait_years ?? 0} Years`),
      isBest: (p: Plan, all: Plan[]) => {
        if (all.length === 0) return false;
        const getWait = (x: Plan) => (x.diabetes_day1 ? 0 : (x.pre_existing_wait_years ?? x.preexisting_wait_years ?? 4));
        const minWait = Math.min(...all.map(getWait));
        return getWait(p) === minWait;
      },
    },
    {
      label: 'Diabetes covered from Day 1',
      getValue: (p: Plan) => (p.diabetes_day1 ? 'Yes' : 'No'),
      isBest: (p: Plan, all: Plan[]) => p.diabetes_day1 === true,
    },
    {
      label: 'High BP covered from Day 1',
      getValue: (p: Plan) => (p.hypertension_day1 ? 'Yes' : 'No'),
      isBest: (p: Plan, all: Plan[]) => p.hypertension_day1 === true,
    },
    {
      label: 'Cashless Partner Hospitals',
      getValue: (p: Plan) => `${(p.hospital_network_count || 0).toLocaleString('en-IN')}+`,
      isBest: (p: Plan, all: Plan[]) => {
        if (all.length === 0) return false;
        const maxVal = Math.max(...all.map((x) => x.hospital_network_count || 0));
        return (p.hospital_network_count || 0) === maxVal;
      },
    },
    {
      label: 'Room Rent Caps',
      getValue: (p: Plan) => p.room_rent_limit || 'No Limit',
      isBest: (p: Plan, all: Plan[]) => {
        const text = (p.room_rent_limit || '').toLowerCase();
        return text === 'no limit' || text === 'any room' || text === 'single private';
      },
    },
    {
      label: 'Claims Settled Successfully',
      getValue: (p: Plan) => `${p.claim_settlement_ratio || 90}%`,
      isBest: (p: Plan, all: Plan[]) => {
        if (all.length === 0) return false;
        const maxVal = Math.max(...all.map((x) => x.claim_settlement_ratio || 0));
        return (p.claim_settlement_ratio || 0) === maxVal;
      },
    },
    {
      label: 'Match Score',
      getValue: (p: Plan) => (p.suitability_score || 8.4).toFixed(1),
      isBest: (p: Plan, all: Plan[]) => {
        if (all.length === 0) return false;
        const maxVal = Math.max(...all.map((x) => x.suitability_score || 0));
        return (p.suitability_score || 0) === maxVal;
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 backdrop-blur-[1px] p-0 md:p-6 animate-fadeIn">
      {/* Back drop closer */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div 
        className="w-full max-w-[800px] border-t-2 border-black bg-white p-6 shadow-2xl transition-all duration-300 md:max-h-[85vh] overflow-y-auto"
        style={{ borderRadius: '2px 2px 0 0' }}
      >
        <header className="mb-6 flex justify-between items-center">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">Compare Policies</span>
            <h2 className="font-[var(--font-heading)] text-lg font-black uppercase tracking-tight text-black">
              Compare Policy Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
          >
            [ Close ]
          </button>
        </header>

        {/* Side-by-side Table */}
        <div className="overflow-x-auto border border-neutral-200" style={{ borderRadius: '2px' }}>
          <table className="w-full min-w-[500px] border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-black bg-neutral-50">
                <th className="p-3 text-left font-bold text-neutral-500 uppercase tracking-widest text-[9px] w-[140px] sticky left-0 bg-neutral-50 z-10 border-r border-neutral-200">
                  Policy Features
                </th>
                {plans.map((plan) => {
                  const selected = selectedPlanId === plan.id;
                  return (
                    <th 
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-3 text-center cursor-pointer transition-all border-r border-neutral-200 last:border-r-0 ${
                        selected ? 'bg-neutral-100 font-bold' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-[9px] uppercase text-neutral-400 tracking-wider block">
                        {plan.insurer}
                      </span>
                      <span className="font-bold text-black uppercase tracking-tight text-xs block mt-0.5">
                        {plan.name}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr 
                  key={row.label} 
                  className={`border-b border-neutral-100 last:border-b-0 ${
                    rIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'
                  }`}
                >
                  <td className="p-3 text-left font-bold text-black border-r border-neutral-200 sticky left-0 bg-white z-10">
                    {row.label}
                  </td>
                  {plans.map((plan) => {
                    const isBestCell = row.isBest(plan, plans);
                    const selected = selectedPlanId === plan.id;
                    return (
                      <td 
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-3 text-center border-r border-neutral-200 last:border-r-0 cursor-pointer transition-colors ${
                          isBestCell ? 'bg-neutral-100 text-black font-semibold' : 'text-neutral-600'
                        } ${selected && !isBestCell ? 'bg-neutral-50' : ''}`}
                      >
                        {row.getValue(plan)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scroll Help Text */}
        <div className="mt-2 text-center md:hidden">
          <span className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest">
            Scroll table horizontally to compare →
          </span>
        </div>

        {/* Sticky Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 pt-6 border-t border-neutral-200">
          <button
            onClick={() => {
              if (selectedPlanId && onSelectPlan) {
                onSelectPlan(selectedPlanId);
                onClose();
              }
            }}
            disabled={!selectedPlanId}
            className="flex-1 h-11 bg-black text-white hover:bg-neutral-900 transition-colors uppercase font-mono text-xs tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ borderRadius: '2px' }}
          >
            View Full Policy Details
          </button>
          
          <button
            onClick={() => {
              onClear();
              onClose();
            }}
            className="h-11 px-6 border border-neutral-200 text-black hover:border-black transition-colors uppercase font-mono text-xs tracking-wider"
            style={{ borderRadius: '2px' }}
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
}

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

export function CompareDrawer({ plans, isOpen, onClose, onClear, onSelectPlan }: CompareDrawerProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  useEffect(() => {
    if (plans.length > 0) {
      setTimeout(() => {
        setSelectedPlanId(plans[0].id);
      }, 0);
    } else {
      setTimeout(() => {
        setSelectedPlanId(null);
      }, 0);
    }
  }, [plans]);

  if (!isOpen || plans.length === 0) return null;

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
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 backdrop-blur-[1px] p-0 sm:p-4 md:p-6 animate-fadeIn">
      <div className="absolute inset-0 -z-10" onClick={onClose} aria-hidden />

      <div
        className="w-full max-w-[800px] border-t-4 border-teal-700 bg-white p-4 sm:p-6 shadow-2xl transition-all duration-300 max-h-[92vh] sm:max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        role="dialog"
        aria-labelledby="compare-drawer-title"
      >
        <header className="mb-4 sm:mb-6 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <span className="font-sans text-[10px] uppercase font-bold tracking-wider text-neutral-400">Compare Policies</span>
            <h2
              id="compare-drawer-title"
              className="font-sans text-base sm:text-lg font-black uppercase tracking-tight text-neutral-800"
            >
              Compare Policy Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-xs uppercase font-bold text-neutral-400 hover:text-neutral-700 transition-colors shrink-0 pt-1"
          >
            Close
          </button>
        </header>

        <div className="-mx-1 sm:mx-0 overflow-x-auto border border-neutral-200 rounded-xl">
          <table className="w-full min-w-[min(100%,480px)] border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="p-2 sm:p-3 text-left font-bold text-neutral-500 uppercase tracking-wider text-[10px] w-24 sm:w-[140px] sticky left-0 bg-neutral-50 z-10 border-r border-neutral-200">
                  Feature
                </th>
                {plans.map((plan) => {
                  const selected = selectedPlanId === plan.id;
                  return (
                    <th
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-2 sm:p-3 text-center cursor-pointer transition-all border-r border-neutral-200 last:border-r-0 min-w-[96px] ${
                        selected ? 'bg-emerald-50/50 font-bold border-b-2 border-b-teal-600' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-[9px] sm:text-[10px] uppercase text-neutral-400 font-semibold tracking-wider block leading-tight">
                        {plan.insurer}
                      </span>
                      <span className="font-bold text-neutral-800 text-[10px] sm:text-xs block mt-0.5 leading-tight line-clamp-2">
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
                    rIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/30'
                  }`}
                >
                  <td className="p-2 sm:p-3 text-left font-bold text-neutral-700 border-r border-neutral-200 sticky left-0 bg-inherit z-[1] text-[10px] sm:text-xs">
                    {row.label}
                  </td>
                  {plans.map((plan) => {
                    const isBestCell = row.isBest(plan, plans);
                    const selected = selectedPlanId === plan.id;
                    return (
                      <td
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={`p-2 sm:p-3 text-center border-r border-neutral-200 last:border-r-0 cursor-pointer transition-colors text-[10px] sm:text-xs whitespace-nowrap ${
                          isBestCell ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-neutral-600'
                        } ${selected && !isBestCell ? 'bg-emerald-50/20' : ''}`}
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

        <div className="mt-2 text-center md:hidden">
          <span className="font-sans text-[10px] text-neutral-400 uppercase tracking-widest">
            Scroll table horizontally to compare &rarr;
          </span>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 pt-6 border-t border-neutral-200">
          <button
            onClick={() => {
              if (selectedPlanId && onSelectPlan) {
                onSelectPlan(selectedPlanId);
                onClose();
              }
            }}
            disabled={!selectedPlanId}
            className="flex-1 h-11 bg-[#ff4f18] text-white hover:bg-orange-600 transition-colors uppercase font-bold text-xs tracking-wider disabled:opacity-30 disabled:cursor-not-allowed rounded-xl shadow-md shadow-orange-500/10"
          >
            View Full Policy Details
          </button>
          
          <button
            onClick={() => {
              onClear();
              onClose();
            }}
            className="h-11 px-6 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors uppercase font-bold text-xs tracking-wider rounded-xl"
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompareDrawer;

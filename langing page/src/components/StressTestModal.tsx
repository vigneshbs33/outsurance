'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Crosshair } from './editorial';
import { Sparkles } from 'lucide-react';
import { predictScenarioDetails } from '../lib/api';

export interface Plan {
  id: number;
  name: string;
  insurer: string;
  coverage: number;
  copayment_pct?: number;
  room_rent_limit?: string;
  diabetes_day1?: boolean;
  hypertension_day1?: boolean;
  pre_existing_wait_years?: number;
  preexisting_wait_years?: number;
  [key: string]: any;
}

interface Scenario {
  id: string;
  name: string;
  cost: number;
  days: number;
  isChronic: boolean;
}

const SCENARIOS: Scenario[] = [
  { id: 'appendix', name: 'Appendix Surgery', cost: 300000, days: 3, isChronic: false },
  { id: 'icu', name: '5-Day ICU Stay', cost: 800000, days: 5, isChronic: false },
  { id: 'cardiac', name: 'Cardiac Event', cost: 500000, days: 4, isChronic: true },
  { id: 'knee', name: 'Knee Joint Replacement', cost: 450000, days: 3, isChronic: false },
  { id: 'maternity', name: 'Maternity Care (with complications)', cost: 250000, days: 3, isChronic: false },
];

interface StressTestModalProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  suggestedPlanName?: string;
  initialScenario?: Partial<Scenario>;
}

export default function StressTestModal({ plan, isOpen, onClose, suggestedPlanName, initialScenario }: StressTestModalProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SCENARIOS[0].id);

  const [customName, setCustomName] = useState('Custom Emergency Case');
  const [customCost, setCustomCost] = useState<number>(300000);
  const [customDays, setCustomDays] = useState<number>(3);
  const [customIsChronic, setCustomIsChronic] = useState<boolean>(false);
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    if (isOpen && initialScenario) {
      setSelectedScenarioId(initialScenario.id || 'custom');
      if (initialScenario.name) setCustomName(initialScenario.name);
      if (initialScenario.cost !== undefined) setCustomCost(initialScenario.cost);
      if (initialScenario.days !== undefined) setCustomDays(initialScenario.days);
      if (initialScenario.isChronic !== undefined) setCustomIsChronic(initialScenario.isChronic);
    }
  }, [isOpen, initialScenario]);

  async function handleAIPredict() {
    if (!customName.trim() || isPredicting) return;
    setIsPredicting(true);
    try {
      const data = await predictScenarioDetails(customName);
      if (data) {
        setCustomCost(data.cost || 300000);
        setCustomDays(data.days || 3);
        setCustomIsChronic(!!data.isChronic);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPredicting(false);
    }
  }

  const activeScenario = useMemo(() => {
    if (selectedScenarioId === 'custom') {
      return {
        id: 'custom',
        name: customName || 'Custom Case',
        cost: Number(customCost) || 0,
        days: Number(customDays) || 1,
        isChronic: customIsChronic,
      };
    }
    return SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];
  }, [selectedScenarioId, customName, customCost, customDays, customIsChronic]);

  const calculation = useMemo(() => {
    if (!plan) return { cost: 0, covered: 0, outOfPocket: 0, status: 'fully', roomRentDeduction: 0, copayDeduction: 0 };

    const totalCost = activeScenario.cost;
    let covered = Math.min(totalCost, plan.coverage);

    // Apply room rent deductions if limited
    let roomRentDeduction = 0;
    if (plan.room_rent_limit && plan.room_rent_limit !== 'No Limit' && plan.room_rent_limit !== 'Any Room' && plan.room_rent_limit !== 'N/A') {
      if (plan.room_rent_limit.includes('₹5,000')) {
        // Assume actual ICU/room rent is ₹12,000/day, so ₹7,000/day extra out of pocket
        roomRentDeduction = 7000 * activeScenario.days;
      } else if (plan.room_rent_limit.includes('1%')) {
        const limit = plan.coverage * 0.01;
        const actualRent = 12000;
        if (actualRent > limit) {
          roomRentDeduction = (actualRent - limit) * activeScenario.days;
        }
      }
    }

    covered = Math.max(0, covered - roomRentDeduction);

    // Apply copayment
    let copayDeduction = 0;
    const copayPct = plan.copayment_pct || 0;
    if (copayPct > 0) {
      copayDeduction = covered * (copayPct / 100);
      covered = Math.max(0, covered - copayDeduction);
    }

    // Chronic complications check
    if (activeScenario.isChronic) {
      // If plan doesn't cover chronic conditions on day 1 and wait years exist
      const waitYears = plan.pre_existing_wait_years ?? plan.preexisting_wait_years ?? 0;
      if (waitYears > 0 && (!plan.diabetes_day1 || !plan.hypertension_day1)) {
        // 50% penalty/exclusion in stress test scenario
        copayDeduction += covered * 0.5;
        covered = covered * 0.5;
      }
    }

    const outOfPocket = totalCost - covered;

    let status: 'fully' | 'partial' | 'large' = 'fully';
    if (outOfPocket > 100000) {
      status = 'large';
    } else if (outOfPocket > 30000) {
      status = 'partial';
    }

    return {
      cost: totalCost,
      covered: Math.round(covered),
      outOfPocket: Math.round(outOfPocket),
      roomRentDeduction: Math.round(roomRentDeduction),
      copayDeduction: Math.round(copayDeduction),
      status,
    };
  }, [plan, activeScenario]);

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-[1px] p-4 sm:p-6 animate-fadeIn overflow-y-auto">
      <div 
        className="relative w-full max-w-[500px] my-auto max-h-[85vh] sm:max-h-[92vh] border-t-2 border-black bg-white shadow-xl transition-all duration-300 flex flex-col"
        style={{ borderRadius: '2px' }}
      >
        {/* Header (Fixed) */}
        <div className="p-5 border-b border-neutral-100 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 font-mono text-[10px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors border border-neutral-200 px-2 py-0.5 rounded hover:border-black cursor-pointer bg-white"
          >
            [ Close ]
          </button>

          <header className="pr-12">
            <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 block">Emergency Cost Calculator</span>
            <h2 className="mt-1 font-[var(--font-heading)] text-lg font-black uppercase tracking-tight text-black leading-tight">
              Stress Test: {plan.name}
            </h2>
            <p className="mt-1 font-mono text-[10px] text-neutral-400">
              How much would you pay if you faced a medical emergency?
            </p>
          </header>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
          
          {/* Scenarios Selection */}
          <div className="space-y-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">Pick an Emergency Scenario</span>
            <div className="space-y-2">
              {SCENARIOS.map((scenario) => {
                const selected = scenario.id === selectedScenarioId;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                    className={`w-full flex items-center justify-between border p-3 text-left transition-all cursor-pointer ${
                      selected ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-black'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all ${
                          selected ? 'border-black bg-black' : 'border-neutral-300'
                        }`}
                      >
                        {selected && <div className="h-1 w-1 rounded-full bg-white" />}
                      </div>
                      <span className="font-mono text-[11px] sm:text-xs font-bold text-black uppercase tracking-tight">
                        {scenario.name}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] sm:text-[10px] text-neutral-400">
                      Est. Cost: ₹{scenario.cost.toLocaleString('en-IN')}
                    </span>
                  </button>
                );
              })}

              {/* Custom Scenario Option */}
              <button
                type="button"
                onClick={() => setSelectedScenarioId('custom')}
                className={`w-full flex items-center justify-between border p-3 text-left transition-all cursor-pointer ${
                  selectedScenarioId === 'custom' ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-black'
                }`}
                style={{ borderRadius: '2px' }}
              >
                <div className="flex items-center gap-2.5">
                  <div 
                    className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center transition-all ${
                      selectedScenarioId === 'custom' ? 'border-black bg-black' : 'border-neutral-300'
                    }`}
                  >
                    {selectedScenarioId === 'custom' && <div className="h-1 w-1 rounded-full bg-white" />}
                  </div>
                  <span className="font-mono text-[11px] sm:text-xs font-bold text-black uppercase tracking-tight">
                    ➕ Create Custom Scenario...
                  </span>
                </div>
              </button>
            </div>
          </div>

          {selectedScenarioId === 'custom' && (
            <div className="border border-black p-4 space-y-4 bg-neutral-50 animate-fadeIn shrink-0" style={{ borderRadius: '2px' }}>
              <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">Configure Custom Scenario</span>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-[8px] uppercase tracking-wider text-neutral-400 block">Scenario Name</label>
                  <button
                    type="button"
                    onClick={handleAIPredict}
                    disabled={isPredicting || !customName.trim() || customName === 'Custom Emergency Case'}
                    className="font-mono text-[8px] uppercase tracking-widest text-black hover:underline cursor-pointer disabled:opacity-40 disabled:hover:no-underline flex items-center gap-1"
                  >
                    <Sparkles size={8} className={isPredicting ? "animate-spin" : ""} />
                    {isPredicting ? '[ Estimating... ]' : '[ ✨ Auto-Fill details with AI ]'}
                  </button>
                </div>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Brain Tumor Removal or Food Poisoning stay"
                  className="w-full border border-neutral-200 bg-white px-3 py-2 font-mono text-[11px] sm:text-xs text-black focus:border-black outline-none"
                  style={{ borderRadius: '2px' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[8px] uppercase tracking-wider text-neutral-400 block">Estimated Cost (₹)</label>
                  <input
                    type="number"
                    value={customCost}
                    onChange={(e) => setCustomCost(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-neutral-200 bg-white px-3 py-2 font-mono text-[11px] sm:text-xs text-black focus:border-black outline-none"
                    style={{ borderRadius: '2px' }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[8px] uppercase tracking-wider text-neutral-400 block">Length of Stay (Days)</label>
                  <input
                    type="number"
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value)))}
                    className="w-full border border-neutral-200 bg-white px-3 py-2 font-mono text-[11px] sm:text-xs text-black focus:border-black outline-none"
                    style={{ borderRadius: '2px' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border border-neutral-200 bg-white p-3" style={{ borderRadius: '2px' }}>
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] font-bold text-black uppercase">Pre-Existing Condition?</span>
                  <span className="font-mono text-[8px] text-neutral-400 uppercase mt-0.5">Triggers waiting period penalty</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomIsChronic(v => !v)}
                  className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1 border transition-all cursor-pointer ${
                    customIsChronic ? 'bg-black text-white border-black' : 'border-neutral-300 text-neutral-400 hover:text-black hover:border-black'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  {customIsChronic ? '[ Yes ]' : '[ No ]'}
                </button>
              </div>
            </div>
          )}

          {/* Calculation Matrix */}
          <div className="border-t border-neutral-100 pt-4 space-y-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">Bill Breakdown</span>
            
            <div className="space-y-2 bg-neutral-50 p-4 font-mono text-[11px] sm:text-xs border border-neutral-100" style={{ borderRadius: '2px' }}>
              <div className="flex justify-between items-center pb-2 border-b border-neutral-200/50">
                <span className="text-neutral-500 uppercase text-[9px] sm:text-[10px]">Total Hospital Bill</span>
                <span className="text-xs sm:text-sm font-bold text-black">₹{calculation.cost.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-neutral-200/50">
                <span className="text-neutral-500 uppercase text-[9px] sm:text-[10px]">Paid by Insurance</span>
                <span className="text-xs sm:text-sm font-bold text-black">₹{calculation.covered.toLocaleString('en-IN')}</span>
              </div>

              {calculation.roomRentDeduction > 0 && (
                <div className="flex justify-between items-center py-1 text-neutral-400 text-[9px] sm:text-[10px]">
                  <span>- Room Rent Cap Penalty</span>
                  <span>₹{calculation.roomRentDeduction.toLocaleString('en-IN')}</span>
                </div>
              )}

              {calculation.copayDeduction > 0 && (
                <div className="flex justify-between items-center py-1 text-neutral-400 text-[9px] sm:text-[10px]">
                  <span>- Your Share (Copay / Waiting Deductions)</span>
                  <span>₹{calculation.copayDeduction.toLocaleString('en-IN')}</span>
                </div>
              )}
              
              <div 
                className={`flex justify-between items-center mt-2.5 p-3 transition-colors ${
                  calculation.status === 'fully' 
                    ? 'bg-neutral-100' 
                    : calculation.status === 'partial' 
                    ? 'bg-neutral-200/50' 
                    : 'bg-neutral-200'
                }`}
                style={{ borderRadius: '2px' }}
              >
                <div className="flex flex-col">
                  <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-neutral-500">Your Share of the Bill</span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-black uppercase mt-0.5">
                    {calculation.status === 'fully' 
                      ? '✓ Fully Covered' 
                      : calculation.status === 'partial' 
                      ? 'Moderate out-of-pocket' 
                      : '⚠ High Out-Of-Pocket'}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-black">₹{calculation.outOfPocket.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Suggestion Text if large out-of-pocket */}
          {calculation.status === 'large' && (
            <div className="border border-black p-3.5 bg-neutral-50 transition-all duration-300" style={{ borderRadius: '2px' }}>
              <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-wider text-neutral-400 block mb-1">💡 Quick tip from our AI</span>
              <p className="font-mono text-[10px] sm:text-[11px] leading-5 text-black">
                Because this scenario could lead to high out-of-pocket costs, consider a plan with higher coverage or no room rent limits.
                {suggestedPlanName && <> <span className="font-bold underline">{suggestedPlanName}</span> would cover this more fully.</>}
              </p>
            </div>
          )}

        </div>

        {/* Footer (Fixed) */}
        <div className="p-4 border-t border-neutral-100 bg-white shrink-0">
          <button
            onClick={onClose}
            className="w-full h-11 bg-black text-white hover:bg-neutral-900 transition-colors uppercase font-mono text-xs tracking-wider cursor-pointer"
            style={{ borderRadius: '2px' }}
          >
            Close Simulation
          </button>
        </div>

      </div>
    </div>
  );
}

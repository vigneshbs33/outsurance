'use client';

import React from 'react';
import type { Plan } from './StressTestModal';
import { formatSimilarityScore, getPlanCosineSimilarity } from '../lib/planCompare';

interface CompareInlineTableProps {
  plans: Plan[];
  comparisonTable?: Record<string, Record<string, string>>;
}

export function CompareInlineTable({ plans, comparisonTable }: CompareInlineTableProps) {
  if (plans.length < 2) return null;

  const rows: [string, Record<string, string>][] = comparisonTable
    ? Object.entries(comparisonTable)
    : [
        ['Match Score', Object.fromEntries(plans.map((p) => [p.name, `${(p.suitability_score ?? 0).toFixed(1)}/10`]))],
        ['KNN Similarity', Object.fromEntries(plans.map((p) => [p.name, formatSimilarityScore(p)]))],
      ];

  const maxSim = Math.max(...plans.map((p) => getPlanCosineSimilarity(p)), 0.01);
  const maxScore = Math.max(...plans.map((p) => p.suitability_score ?? 0), 0.01);

  return (
    <div className="space-y-4 -mx-1 sm:mx-0">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p, i) => {
          const sim = getPlanCosineSimilarity(p);
          const explanation =
            p.plain_english_explanation ||
            `Rank #${i + 1}: ${p.type ?? 'Health'} plan with KNN similarity ${formatSimilarityScore(p)} and match ${(p.suitability_score ?? 0).toFixed(1)}/10 for your profile.`;
          return (
            <div key={p.id} className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
              <p className="text-[9px] uppercase text-neutral-400 font-bold">{p.insurer}</p>
              <p className="text-xs font-black text-neutral-800 mt-0.5 leading-snug">{p.name}</p>
              <div className="mt-2 space-y-1.5">
                <div>
                  <div className="flex justify-between text-[9px] text-neutral-500 mb-0.5">
                    <span>KNN Similarity</span>
                    <span className="font-bold">{sim.toFixed(1)}/10</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(sim / maxSim) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-neutral-500 mb-0.5">
                    <span>Match Score</span>
                    <span className="font-bold">{(p.suitability_score ?? 0).toFixed(1)}/10</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${((p.suitability_score ?? 0) / maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] text-teal-900 leading-relaxed border-t border-emerald-100 pt-2">
                {explanation}
              </p>
            </div>
          );
        })}
      </div>

      <div className="-mx-1 sm:mx-0 overflow-x-auto border border-neutral-200 rounded-xl shadow-sm">
        <table className="w-full min-w-[min(100%,520px)] border-collapse text-xs">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="p-2 sm:p-2.5 text-left text-[10px] uppercase font-bold text-neutral-500 w-24 sm:w-32 sticky left-0 bg-neutral-50 z-10">
                Feature
              </th>
              {plans.map((p) => (
                <th
                  key={p.id}
                  className="p-2 sm:p-2.5 text-center font-bold text-neutral-800 border-l border-neutral-100 min-w-[100px]"
                >
                  <span className="text-[9px] text-neutral-400 block uppercase leading-tight">{p.insurer}</span>
                  <span className="text-[10px] sm:text-xs leading-tight line-clamp-2">{p.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, cols], idx) => (
              <tr key={label} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                <td className="p-2 sm:p-2.5 font-bold text-neutral-600 border-r border-neutral-100 sticky left-0 bg-inherit text-[10px] sm:text-xs z-[1]">
                  {label}
                </td>
                {plans.map((p) => (
                  <td
                    key={p.id}
                    className="p-2 sm:p-2.5 text-center text-neutral-700 border-l border-neutral-100 text-[10px] sm:text-xs whitespace-nowrap"
                  >
                    {cols[p.name] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-neutral-400 text-center sm:hidden">Swipe table to see all columns →</p>
    </div>
  );
}

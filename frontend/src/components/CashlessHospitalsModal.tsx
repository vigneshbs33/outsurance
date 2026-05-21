'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Search, X } from 'lucide-react';
import type { Plan } from './StressTestModal';
import {
  fetchPlanHospitalNetwork,
  fetchPlanHospitals,
  resolveDefaultCityId,
  type HospitalCity,
  type PlanHospitalEntry,
  type PlanNetworkSummary,
} from '../lib/hospitalNetwork';

interface CashlessHospitalsModalProps {
  plan: Plan | null;
  defaultCityName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CashlessHospitalsModal({
  plan,
  defaultCityName,
  isOpen,
  onClose,
}: CashlessHospitalsModalProps) {
  const [summary, setSummary] = useState<PlanNetworkSummary | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [hospitals, setHospitals] = useState<PlanHospitalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [settlement, setSettlement] = useState<'all' | 'cashless' | 'cash'>('all');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultCityId = useMemo(
    () => resolveDefaultCityId(defaultCityName),
    [defaultCityName]
  );

  const loadHospitals = useCallback(
    async (pid: number, cid: number, reset: boolean, appendFrom = 0) => {
      setLoadingList(true);
      setError(null);
      const page = await fetchPlanHospitals(pid, cid, {
        q: search,
        settlement,
        offset: reset ? 0 : appendFrom,
        limit: 60,
      });
      if (!page) {
        setError('Could not load hospitals. Is the backend running?');
        setLoadingList(false);
        return;
      }
      setTotal(page.total);
      setHasMore(page.has_more);
      setHospitals((prev) => (reset ? page.hospitals : [...prev, ...page.hospitals]));
      setLoadingList(false);
    },
    [search, settlement]
  );

  useEffect(() => {
    if (!isOpen || !plan) return;
    setSummary(null);
    setHospitals([]);
    setSearch('');
    setSettlement('all');
    setError(null);
    setLoadingSummary(true);

    void fetchPlanHospitalNetwork(plan.id).then((data) => {
      setLoadingSummary(false);
      if (!data) {
        setError('Hospital network data not available for this plan.');
        return;
      }
      setSummary(data);
      const preferred =
        data.cities.find((c) => c.id === defaultCityId) ??
        data.cities.find((c) => (c.total ?? 0) > 0) ??
        data.cities[0];
      if (preferred) {
        setCityId(preferred.id);
      }
    });
  }, [isOpen, plan, defaultCityId]);

  useEffect(() => {
    if (!isOpen || !plan || cityId == null) return;
    setHospitals([]);
    void loadHospitals(plan.id, cityId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when filters/city change
  }, [isOpen, plan?.id, cityId, search, settlement]);

  const activeCity = summary?.cities.find((c) => c.id === cityId);

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />

      <div
        role="dialog"
        aria-labelledby="hospitals-modal-title"
        className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <header className="shrink-0 px-4 sm:px-5 py-4 border-b border-neutral-100 bg-teal-800 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                Cashless hospital network
              </p>
              <h2 id="hospitals-modal-title" className="text-base sm:text-lg font-black leading-tight truncate">
                {plan.name}
              </h2>
              <p className="text-xs text-white/80 mt-0.5">{plan.insurer}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/15"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          {summary?.national_network_count != null && (
            <p className="text-[11px] mt-2 text-emerald-100">
              {summary.national_network_count.toLocaleString('en-IN')}+ hospitals nationally ·{' '}
              {summary.network_summary?.cashless_in_top_10_cities?.toLocaleString('en-IN') ?? '—'} cashless
              in top metros
            </p>
          )}
        </header>

        {loadingSummary ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
          </div>
        ) : error && !summary ? (
          <div className="p-6 text-center text-sm text-red-600">{error}</div>
        ) : (
          <>
            <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-neutral-100 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
                {(summary?.cities ?? []).map((c: HospitalCity) => {
                  const selected = cityId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCityId(c.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                        selected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:border-emerald-300'
                      }`}
                    >
                      {c.name}
                      <span className="opacity-80 ml-1">({c.total ?? 0})</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search in ${activeCity?.name ?? 'city'}…`}
                    className="w-full h-10 pl-9 pr-3 border border-neutral-200 rounded-xl text-sm outline-none focus:border-emerald-400"
                  />
                </div>
                <div className="flex rounded-xl border border-neutral-200 overflow-hidden shrink-0">
                  {(['all', 'cashless', 'cash'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSettlement(s)}
                      className={`px-3 py-2 text-[11px] font-bold capitalize ${
                        settlement === s
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {s === 'all' ? 'All' : s}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-neutral-500">
                Showing {hospitals.length} of {total} hospitals
                {activeCity ? ` in ${activeCity.name}` : ''}
                {defaultCityName && defaultCityName !== activeCity?.name
                  ? ` · Profile city “${defaultCityName}” mapped to nearest metro network`
                  : ''}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-2 min-h-0">
              {loadingList && hospitals.length === 0 ? (
                <div className="py-12 flex justify-center">
                  <span className="h-7 w-7 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
                </div>
              ) : hospitals.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-12">No hospitals match your filters.</p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {hospitals.map((h) => (
                    <li key={`${h.hospital_id}-${h.hospital_name}`} className="py-3 flex gap-3">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-neutral-800 leading-snug">{h.hospital_name}</p>
                        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="shrink-0" />
                          {h.area}
                          {activeCity ? `, ${activeCity.name}` : ''}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 self-start text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                          h.settlement === 'cashless'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                        }`}
                      >
                        {h.settlement === 'cashless' ? 'Cashless' : 'Reimburse'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {hasMore && (
              <footer className="shrink-0 px-4 py-3 border-t border-neutral-100">
                <button
                  type="button"
                  disabled={loadingList}
                  onClick={() =>
                    plan && cityId != null && loadHospitals(plan.id, cityId, false, hospitals.length)
                  }
                  className="w-full h-10 rounded-xl border border-neutral-200 text-sm font-bold text-neutral-700 hover:border-emerald-400 disabled:opacity-50"
                >
                  {loadingList ? 'Loading…' : 'Load more hospitals'}
                </button>
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
}

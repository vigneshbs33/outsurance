'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { ForumReviewCard } from '../../components/ForumReviewCard';
import {
  DEFAULT_REVIEW_FILTERS,
  buildForumUrl,
  fetchReviewsDataset,
  filterReviews,
  flattenReviews,
  getReviewFacets,
  groupReviewsByPlan,
  parseReviewFiltersFromSearchParams,
  type ReviewFilters,
  type ReviewsDataset,
} from '../../lib/reviews';
import { fetchAllPlans } from '../../lib/api';
import type { Plan } from '../../components/StressTestModal';
import { Filter, MessageSquareText, Search, Sparkles, X } from 'lucide-react';

function ForumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlight = searchParams.get('highlight');

  const [dataset, setDataset] = useState<ReviewsDataset | null>(null);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const urlFilters = useMemo(
    () => parseReviewFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const [draft, setDraft] = useState<ReviewFilters>(urlFilters);

  useEffect(() => {
    setDraft(urlFilters);
  }, [urlFilters]);

  useEffect(() => {
    Promise.all([fetchReviewsDataset(), fetchAllPlans()])
      .then(([reviews, plans]) => {
        setDataset(reviews);
        setAllPlans(plans as Plan[]);
      })
      .finally(() => setLoading(false));
  }, []);

  const facets = useMemo(
    () => (dataset ? getReviewFacets(dataset) : { insurers: [], platforms: [], planOptions: [] }),
    [dataset]
  );

  const flatAll = useMemo(() => (dataset ? flattenReviews(dataset) : []), [dataset]);

  const filtered = useMemo(() => filterReviews(flatAll, urlFilters), [flatAll, urlFilters]);

  const grouped = useMemo(() => groupReviewsByPlan(filtered), [filtered]);

  const highlightedPlans = useMemo(() => {
    if (!urlFilters.planIds.length) return [];
    const idSet = new Set(urlFilters.planIds);
    return allPlans.filter((p) => idSet.has(p.id));
  }, [allPlans, urlFilters.planIds]);

  const applyFilters = useCallback(
    (next: ReviewFilters, extra?: { highlight?: string }) => {
      router.push(buildForumUrl({ ...next, highlight: extra?.highlight }));
    },
    [router]
  );

  const syncDraftToUrl = useCallback(() => {
    applyFilters(draft, highlight ? { highlight } : undefined);
  }, [applyFilters, draft, highlight]);

  const clearFilters = useCallback(() => {
    setDraft(DEFAULT_REVIEW_FILTERS);
    router.push('/forum');
  }, [router]);

  const stats = useMemo(() => {
    const pos = filtered.filter((r) => r.sentiment === 'positive').length;
    const neg = filtered.filter((r) => r.sentiment === 'negative').length;
    return { total: filtered.length, positive: pos, negative: neg, plans: grouped.length };
  }, [filtered, grouped.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] lg:flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 lg:h-screen lg:overflow-y-auto">
        <header className="bg-white border-b border-neutral-100 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-sm">
          <div className="max-w-[1100px] mx-auto">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-emerald-700 mb-1">
                  <MessageSquareText size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Community</span>
                </div>
                <h1 className="text-xl font-black text-neutral-900">Plan Review Forum</h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {dataset?.meta.total_plans ?? 0} plans · {flatAll.length} real customer reviews
                </p>
              </div>
              <div className="flex gap-2 text-center">
                <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-lg font-black text-emerald-700">{stats.positive}</p>
                  <p className="text-[9px] font-bold uppercase text-emerald-600">Positive</p>
                </div>
                <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-lg font-black text-red-600">{stats.negative}</p>
                  <p className="text-[9px] font-bold uppercase text-red-500">Negative</p>
                </div>
                <div className="px-3 py-2 bg-white border border-neutral-200 rounded-xl">
                  <p className="text-lg font-black text-neutral-800">{stats.total}</p>
                  <p className="text-[9px] font-bold uppercase text-neutral-500">Showing</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={draft.q}
                  onChange={(e) => setDraft((f) => ({ ...f, q: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && syncDraftToUrl()}
                  placeholder="Search plan, insurer, or review text…"
                  className="w-full h-10 pl-9 pr-4 border border-neutral-200 rounded-xl text-sm outline-none focus:border-emerald-400"
                />
              </div>
              <button
                type="button"
                onClick={syncDraftToUrl}
                className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="lg:hidden h-10 px-3 border border-neutral-200 rounded-xl bg-white flex items-center gap-1.5 text-xs font-bold"
              >
                <Filter size={14} />
                Filters
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 py-5 pb-16 flex gap-5">
          {/* Filters sidebar */}
          <aside
            className={`${
              filtersOpen ? 'fixed inset-0 z-40 bg-black/30 lg:static lg:bg-transparent' : 'hidden'
            } lg:block w-full lg:w-[260px] shrink-0`}
          >
            <div
              className={`${
                filtersOpen ? 'absolute right-0 top-0 bottom-0 w-[min(100%,280px)] overflow-y-auto' : ''
              } lg:static bg-white lg:bg-transparent border-l lg:border-0 border-neutral-200 p-4 lg:p-0 lg:sticky lg:top-24`}
            >
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4 shadow-sm lg:shadow-none">
                <div className="flex items-center justify-between lg:block">
                  <p className="text-xs font-black text-neutral-800 uppercase tracking-wider">Filters</p>
                  <button
                    type="button"
                    className="lg:hidden p-1"
                    onClick={() => setFiltersOpen(false)}
                    aria-label="Close filters"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Plan</label>
                  <select
                    value={draft.planIds.length === 1 ? String(draft.planIds[0]) : draft.planIds.length > 1 ? '__multi__' : ''}
                    onChange={(e) => {
                      if (e.target.value === '__multi__') return;
                      const id = parseInt(e.target.value, 10);
                      setDraft((f) => ({
                        ...f,
                        planIds: e.target.value ? [id] : [],
                      }));
                    }}
                    className="mt-1 w-full h-9 border border-neutral-200 rounded-lg text-xs px-2 outline-none focus:border-emerald-400"
                  >
                    <option value="">All plans</option>
                    {draft.planIds.length > 1 && (
                      <option value="__multi__">{draft.planIds.length} plans selected</option>
                    )}
                    {facets.planOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.insurer})
                      </option>
                    ))}
                  </select>
                </div>

                {urlFilters.planIds.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {urlFilters.planIds.map((id) => {
                      const plan = facets.planOptions.find((p) => p.id === id);
                      return (
                        <span
                          key={id}
                          className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full"
                        >
                          {plan?.name ?? `Plan #${id}`}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Insurer</label>
                  <select
                    value={draft.insurer}
                    onChange={(e) => setDraft((f) => ({ ...f, insurer: e.target.value }))}
                    className="mt-1 w-full h-9 border border-neutral-200 rounded-lg text-xs px-2 outline-none focus:border-emerald-400"
                  >
                    <option value="">All insurers</option>
                    {facets.insurers.map((ins) => (
                      <option key={ins} value={ins}>
                        {ins}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Sentiment</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(['all', 'positive', 'negative'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDraft((f) => ({ ...f, sentiment: s }))}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          draft.sentiment === s
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white border-neutral-200 text-neutral-600'
                        }`}
                      >
                        {s === 'all' ? 'All' : s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Platform</label>
                  <select
                    value={draft.platform}
                    onChange={(e) => setDraft((f) => ({ ...f, platform: e.target.value }))}
                    className="mt-1 w-full h-9 border border-neutral-200 rounded-lg text-xs px-2 outline-none focus:border-emerald-400"
                  >
                    <option value="">All platforms</option>
                    {facets.platforms.map((pl) => (
                      <option key={pl} value={pl}>
                        {pl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Sort</label>
                  <select
                    value={draft.sort}
                    onChange={(e) =>
                      setDraft((f) => ({ ...f, sort: e.target.value as ReviewFilters['sort'] }))
                    }
                    className="mt-1 w-full h-9 border border-neutral-200 rounded-lg text-xs px-2 outline-none focus:border-emerald-400"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="plan_name">Plan name</option>
                    <option value="positive_first">Positive first</option>
                    <option value="negative_first">Negative first</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      syncDraftToUrl();
                      setFiltersOpen(false);
                    }}
                    className="flex-1 h-9 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-9 px-3 border border-neutral-200 text-xs font-bold rounded-lg bg-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-5">
            {(highlight === 'recommended' || urlFilters.planIds.length > 0) && highlightedPlans.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-emerald-600" />
                  <p className="text-xs font-black text-emerald-800">
                    {highlight === 'recommended'
                      ? 'Reviews for your top recommended plans'
                      : 'Filtered plan reviews'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {highlightedPlans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => router.push(`/explorer/${p.id}`)}
                      className="text-[11px] font-bold bg-white border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full hover:bg-emerald-50"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-12 text-center">
                <p className="text-sm text-neutral-500">No reviews match your filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 text-xs font-bold text-[#0078fd] hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : urlFilters.planIds.length > 0 ? (
              grouped.map((group) => (
                <section key={group.plan_id} className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-neutral-400">{group.insurer}</p>
                      <h2 className="text-base font-black text-neutral-900">{group.plan_name}</h2>
                    </div>
                    <div className="flex gap-2 text-[10px] font-bold">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        +{group.review_stats.positive}
                      </span>
                      <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                        −{group.review_stats.negative}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.reviews.map((r) => (
                      <ForumReviewCard
                        key={`${group.plan_id}-${r.id}`}
                        review={{
                          ...r,
                          plan_id: group.plan_id,
                          plan_name: group.plan_name,
                          insurer: group.insurer,
                          plan_link: group.link,
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((r) => (
                  <ForumReviewCard key={`${r.plan_id}-${r.id}-${r.platform}`} review={r} />
                ))}
              </div>
            )}

            {filtered.length > 0 && filtered.length < flatAll.length && (
              <p className="text-center text-[10px] text-neutral-400 font-medium">
                Showing {filtered.length} of {flatAll.length} reviews
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ForumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
          <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
        </div>
      }
    >
      <ForumContent />
    </Suspense>
  );
}

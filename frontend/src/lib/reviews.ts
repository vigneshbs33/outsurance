export type ReviewSentiment = 'positive' | 'negative' | 'neutral';

export type PlanReview = {
  id: number;
  sentiment: ReviewSentiment;
  platform: string;
  review_summary: string;
  detailed_review: string;
  source_url?: string;
};

export type PlanReviewGroup = {
  plan_id: number;
  plan_name: string;
  insurer: string;
  link?: string;
  review_stats: { total: number; positive: number; negative: number };
  reviews: PlanReview[];
};

export type ReviewsDataset = {
  meta: { version: string; description: string; total_plans: number };
  plans: PlanReviewGroup[];
};

export type FlatReview = PlanReview & {
  plan_id: number;
  plan_name: string;
  insurer: string;
  plan_link?: string;
};

export type ReviewFilters = {
  q: string;
  planIds: number[];
  insurer: string;
  sentiment: 'all' | ReviewSentiment;
  platform: string;
  sort: 'relevance' | 'positive_first' | 'negative_first' | 'plan_name';
};

export const DEFAULT_REVIEW_FILTERS: ReviewFilters = {
  q: '',
  planIds: [],
  insurer: '',
  sentiment: 'all',
  platform: '',
  sort: 'relevance',
};

export function parsePlanIdsParam(raw: string | null): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export function parseReviewFiltersFromSearchParams(
  params: URLSearchParams | { get: (k: string) => string | null }
): ReviewFilters {
  const sentiment = (params.get('sentiment') || 'all') as ReviewFilters['sentiment'];
  return {
    q: params.get('q') || '',
    planIds: parsePlanIdsParam(params.get('planIds')),
    insurer: params.get('insurer') || '',
    sentiment:
      sentiment === 'positive' || sentiment === 'negative' ? sentiment : 'all',
    platform: params.get('platform') || '',
    sort: (params.get('sort') as ReviewFilters['sort']) || 'relevance',
  };
}

export function buildForumUrl(filters: Partial<ReviewFilters> & { highlight?: string }): string {
  const p = new URLSearchParams();
  if (filters.q) p.set('q', filters.q);
  if (filters.planIds?.length) p.set('planIds', filters.planIds.join(','));
  if (filters.insurer) p.set('insurer', filters.insurer);
  if (filters.sentiment && filters.sentiment !== 'all') p.set('sentiment', filters.sentiment);
  if (filters.platform) p.set('platform', filters.platform);
  if (filters.sort && filters.sort !== 'relevance') p.set('sort', filters.sort);
  if (filters.highlight) p.set('highlight', filters.highlight);
  const qs = p.toString();
  return qs ? `/forum?${qs}` : '/forum';
}

export function flattenReviews(dataset: ReviewsDataset): FlatReview[] {
  const out: FlatReview[] = [];
  for (const plan of dataset.plans) {
    for (const review of plan.reviews ?? []) {
      out.push({
        ...review,
        plan_id: plan.plan_id,
        plan_name: plan.plan_name,
        insurer: plan.insurer,
        plan_link: plan.link,
      });
    }
  }
  return out;
}

function matchesSearch(review: FlatReview, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  const hay = [
    review.plan_name,
    review.insurer,
    review.review_summary,
    review.detailed_review,
    review.platform,
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

export function filterReviews(all: FlatReview[], filters: ReviewFilters): FlatReview[] {
  let list = [...all];

  if (filters.planIds.length > 0) {
    const idSet = new Set(filters.planIds);
    list = list.filter((r) => idSet.has(r.plan_id));
  }

  if (filters.insurer.trim()) {
    const ins = filters.insurer.trim().toLowerCase();
    list = list.filter((r) => r.insurer.toLowerCase().includes(ins));
  }

  if (filters.sentiment !== 'all') {
    list = list.filter((r) => r.sentiment === filters.sentiment);
  }

  if (filters.platform) {
    list = list.filter((r) => r.platform === filters.platform);
  }

  if (filters.q.trim()) {
    list = list.filter((r) => matchesSearch(r, filters.q));
  }

  if (filters.sort === 'positive_first') {
    list.sort((a, b) => {
      const score = (s: ReviewSentiment) => (s === 'positive' ? 0 : s === 'negative' ? 2 : 1);
      return score(a.sentiment) - score(b.sentiment) || a.plan_name.localeCompare(b.plan_name);
    });
  } else if (filters.sort === 'negative_first') {
    list.sort((a, b) => {
      const score = (s: ReviewSentiment) => (s === 'negative' ? 0 : s === 'positive' ? 2 : 1);
      return score(a.sentiment) - score(b.sentiment) || a.plan_name.localeCompare(b.plan_name);
    });
  } else if (filters.sort === 'plan_name') {
    list.sort(
      (a, b) =>
        a.plan_name.localeCompare(b.plan_name) || a.insurer.localeCompare(b.insurer)
    );
  } else if (filters.planIds.length > 0) {
    const order = new Map(filters.planIds.map((id, i) => [id, i]));
    list.sort(
      (a, b) =>
        (order.get(a.plan_id) ?? 99) - (order.get(b.plan_id) ?? 99) ||
        a.id - b.id
    );
  }

  return list;
}

export function groupReviewsByPlan(reviews: FlatReview[]): PlanReviewGroup[] {
  const map = new Map<number, PlanReviewGroup>();
  for (const r of reviews) {
    let group = map.get(r.plan_id);
    if (!group) {
      group = {
        plan_id: r.plan_id,
        plan_name: r.plan_name,
        insurer: r.insurer,
        link: r.plan_link,
        review_stats: { total: 0, positive: 0, negative: 0 },
        reviews: [],
      };
      map.set(r.plan_id, group);
    }
    group.reviews.push({
      id: r.id,
      sentiment: r.sentiment,
      platform: r.platform,
      review_summary: r.review_summary,
      detailed_review: r.detailed_review,
      source_url: r.source_url,
    });
    group.review_stats.total += 1;
    if (r.sentiment === 'positive') group.review_stats.positive += 1;
    if (r.sentiment === 'negative') group.review_stats.negative += 1;
  }
  return Array.from(map.values());
}

export function getReviewFacets(dataset: ReviewsDataset) {
  const insurers = new Set<string>();
  const platforms = new Set<string>();
  const planOptions: { id: number; name: string; insurer: string }[] = [];

  for (const p of dataset.plans) {
    insurers.add(p.insurer);
    planOptions.push({ id: p.plan_id, name: p.plan_name, insurer: p.insurer });
    for (const r of p.reviews ?? []) {
      if (r.platform) platforms.add(r.platform);
    }
  }

  return {
    insurers: Array.from(insurers).sort(),
    platforms: Array.from(platforms).sort(),
    planOptions: planOptions.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function fetchReviewsDataset(): Promise<ReviewsDataset> {
  const res = await fetch('/reviews.json');
  if (!res.ok) throw new Error('Failed to load reviews');
  return res.json();
}

export function isReviewsNavigationRequest(text: string): boolean {
  return /\b(reviews?|see reviews|customer reviews|user reviews|forum)\b/i.test(text);
}

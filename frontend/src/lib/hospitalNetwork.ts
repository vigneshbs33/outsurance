const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';

export type HospitalCity = {
  id: number;
  name: string;
  state: string;
  total?: number;
  cashless?: number;
  cash?: number;
};

export type PlanHospitalEntry = {
  hospital_id: number;
  hospital_name: string;
  area: string;
  settlement: 'cashless' | 'cash' | string;
};

export type PlanNetworkSummary = {
  plan_id: number;
  plan_name: string;
  insurer: string;
  national_network_count?: number;
  network_summary?: {
    total_tied_in_top_10_cities?: number;
    cashless_in_top_10_cities?: number;
    national_network_count?: number;
  };
  cities: HospitalCity[];
};

export type PlanHospitalsPage = {
  total: number;
  hospitals: PlanHospitalEntry[];
  offset: number;
  limit: number;
  has_more: boolean;
};

/** Map assessment / profile city names to hospital_network.json city ids. */
export const PROFILE_CITY_TO_NETWORK_ID: Record<string, number> = {
  Bengaluru: 3,
  Bangalore: 3,
  Mysore: 3,
  Belgaum: 3,
  'Udupi and Uttara Kannada': 3,
  'Dakshina Kannada': 3,
  Dharwad: 3,
  Bellary: 3,
  Tumkur: 3,
  Kolar: 3,
  Shimoga: 3,
  Mumbai: 1,
  Delhi: 2,
  Hyderabad: 4,
  Chennai: 5,
  Kolkata: 6,
  Pune: 7,
  Ahmedabad: 8,
  Jaipur: 9,
  Lucknow: 10,
};

export function resolveDefaultCityId(profileCity?: string): number {
  if (profileCity && PROFILE_CITY_TO_NETWORK_ID[profileCity]) {
    return PROFILE_CITY_TO_NETWORK_ID[profileCity];
  }
  return 3;
}

export async function fetchPlanHospitalNetwork(planId: number): Promise<PlanNetworkSummary | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/hospital-network/plans/${planId}`);
    if (!res.ok) return null;
    return (await res.json()) as PlanNetworkSummary;
  } catch {
    return null;
  }
}

export async function fetchPlanHospitals(
  planId: number,
  cityId: number,
  opts?: { q?: string; settlement?: 'all' | 'cashless' | 'cash'; offset?: number; limit?: number }
): Promise<PlanHospitalsPage | null> {
  const params = new URLSearchParams({
    city_id: String(cityId),
    offset: String(opts?.offset ?? 0),
    limit: String(opts?.limit ?? 80),
  });
  if (opts?.q) params.set('q', opts.q);
  if (opts?.settlement && opts.settlement !== 'all') params.set('settlement', opts.settlement);
  try {
    const res = await fetch(
      `${BACKEND_URL}/hospital-network/plans/${planId}/hospitals?${params.toString()}`
    );
    if (!res.ok) return null;
    return (await res.json()) as PlanHospitalsPage;
  } catch {
    return null;
  }
}

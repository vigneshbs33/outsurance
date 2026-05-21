import type { Plan } from '../components/StressTestModal';

/** Top hidden drawbacks — cons, exclusions, waits, co-pay, flags. */
export function getCriticalDrawbacks(plan: Plan, max = 4): string[] {
  const scored: { text: string; weight: number }[] = [];

  const wait = (plan.pre_existing_wait_years ?? plan.preexisting_wait_years ?? 0) as number;
  if (wait >= 3) {
    scored.push({
      text: `${wait}-year waiting period for pre-existing diseases before any claim`,
      weight: wait >= 4 ? 10 : 8,
    });
  }

  const copay = plan.copayment_pct as number | undefined;
  if (copay != null && copay > 0) {
    scored.push({
      text: `${copay}% co-payment deducted from every approved hospital bill`,
      weight: copay >= 10 ? 9 : 7,
    });
  }

  if (!plan.diabetes_day1 && !plan.hypertension_day1) {
    scored.push({
      text: 'No day-1 cover for diabetes or hypertension — standard waiting rules apply',
      weight: 6,
    });
  }

  if (plan.room_rent_limit && !/no limit|any room/i.test(String(plan.room_rent_limit))) {
    scored.push({
      text: `Room rent capped at ${plan.room_rent_limit} — excess room charges are out of pocket`,
      weight: 7,
    });
  }

  if (!plan.restoration_benefit) {
    scored.push({
      text: 'No restoration benefit — once sum insured is used, cover stops until renewal',
      weight: 5,
    });
  }

  const cons = (plan.cons as string[] | undefined) ?? [];
  cons.forEach((c) => scored.push({ text: c, weight: 8 }));

  const exclusions = (plan.exclusions as string[] | undefined) ?? [];
  exclusions.slice(0, 2).forEach((e) => scored.push({ text: `Excluded: ${e}`, weight: 7 }));

  const flags = (plan.warning_flags as string[] | undefined) ?? [];
  flags.forEach((f) => scored.push({ text: f, weight: 9 }));

  if ((plan.claim_settlement_ratio ?? 100) < 90) {
    scored.push({
      text: `Claim settlement ratio ${plan.claim_settlement_ratio}% — below industry leaders`,
      weight: 6,
    });
  }

  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.weight - a.weight)
    .map((s) => s.text)
    .filter((t) => {
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

import { useEffect, useState } from 'react';
import { fetchAllPlans } from '../lib/api';
import { Plan } from '../components/StressTestModal';

export function usePlanDetail(planId: number) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isNaN(planId)) return;

    setLoading(true);
    fetchAllPlans()
      .then((allPlans) => {
        const found = allPlans.find((p: { id: number }) => p.id === planId);
        if (found) {
          setPlan(found as Plan);
        } else {
          setError(new Error('Plan not found'));
        }
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [planId]);

  return { plan, loading, error };
}

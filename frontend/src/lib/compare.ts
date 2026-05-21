'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'outsurance_compare_ids';

export function getCompareIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export function saveCompareIds(ids: number[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event('outsurance_compare_change'));
  } catch {
  }
}

export function useCompare(validPlanIds?: number[]) {
  const [ids, setIds] = useState<number[]>(() => getCompareIds());

  useEffect(() => {
    const handleStorageChange = () => {
      setIds(getCompareIds());
    };

    window.addEventListener('outsurance_compare_change', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('outsurance_compare_change', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!validPlanIds?.length) return;
    const valid = new Set(validPlanIds);
    const current = getCompareIds();
    const pruned = current.filter((id) => valid.has(id));
    if (pruned.length !== current.length) {
      saveCompareIds(pruned);
      setIds(pruned);
    }
  }, [validPlanIds]);

  const toggleCompare = (id: number) => {
    const planId = Number(id);
    if (!Number.isFinite(planId)) return false;

    const current = getCompareIds();
    let next: number[];
    if (current.includes(planId)) {
      next = current.filter((x) => x !== planId);
    } else {
      if (current.length >= 3) {
        return false;
      }
      next = [...current, planId];
    }
    saveCompareIds(next);
    setIds(next);
    return true;
  };

  const clearCompare = () => {
    saveCompareIds([]);
    setIds([]);
  };

  const isInCompare = (id: number) => ids.includes(id);

  return {
    compareIds: ids,
    toggleCompare,
    clearCompare,
    isInCompare,
  };
}

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

export function useCompare() {
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

  const toggleCompare = (id: number) => {
    const current = getCompareIds();
    let next: number[];
    if (current.includes(id)) {
      next = current.filter((x) => x !== id);
    } else {
      if (current.length >= 3) {
        return false;
      }
      next = [...current, id];
    }
    saveCompareIds(next);
    return true;
  };

  const clearCompare = () => {
    saveCompareIds([]);
  };

  const isInCompare = (id: number) => ids.includes(id);

  return {
    compareIds: ids,
    toggleCompare,
    clearCompare,
    isInCompare,
  };
}

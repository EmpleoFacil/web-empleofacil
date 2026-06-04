'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

/** Syncs ?search= from URL into local filter state when the route or query string changes. */
export function useUrlSearchParam(setSearch: (value: string) => void, paramName = 'search') {
  const searchParams = useSearchParams();
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    const q = searchParams.get(paramName) ?? '';
    if (lastSynced.current !== q) {
      lastSynced.current = q;
      setSearch(q);
    }
  }, [searchParams, paramName, setSearch]);
}

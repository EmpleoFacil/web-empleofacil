'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Syncs ?search= from URL into local filter state when the route or query string changes. */
export function useUrlSearchParam(setSearch: (value: string) => void, paramName = 'search') {
  const pathname = usePathname();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get(paramName);
    if (q) {
      setSearch(q);
    }
  }, [pathname, paramName, setSearch]);
}

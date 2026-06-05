'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { search } from '@/lib/api';
import { cn } from '@/lib/utils';

type SearchType = 'all' | 'jobs' | 'candidates' | 'messages';

type JobHit = { id: string; title: string; status?: string; city?: string | null };
type CandidateHit = {
  applicationId: string;
  candidate: { id: string; fullName: string };
  job: { id: string; title: string };
};
type MessageHit = { id: string; title: string; status?: string };

type CompanySearchData = {
  jobs?: JobHit[];
  candidates?: CandidateHit[];
  messages?: MessageHit[];
};

const ADMIN_ROUTE_MAP: { prefix: string; path: string; placeholder: string }[] = [
  { prefix: '/admin/companies', path: '/admin/companies', placeholder: 'Buscar empresas por nombre o email...' },
  { prefix: '/admin/candidates', path: '/admin/candidates', placeholder: 'Buscar candidatos por nombre o email...' },
  { prefix: '/admin/jobs', path: '/admin/jobs', placeholder: 'Buscar vacantes en la plataforma...' },
  { prefix: '/admin/commercial', path: '/admin/companies', placeholder: 'Buscar empresas...' },
  { prefix: '/admin', path: '/admin/companies', placeholder: 'Buscar empresas, candidatos o vacantes...' },
];

const COMPANY_ROUTE_MAP: { prefix: string; type: SearchType; placeholder: string; listPath: string }[] = [
  { prefix: '/jobs', type: 'jobs', placeholder: 'Buscar vacantes...', listPath: '/jobs' },
  { prefix: '/candidates', type: 'candidates', placeholder: 'Buscar candidatos...', listPath: '/candidates' },
  { prefix: '/messages', type: 'messages', placeholder: 'Buscar mensajes...', listPath: '/messages' },
  { prefix: '/interviews', type: 'candidates', placeholder: 'Buscar candidatos...', listPath: '/candidates' },
  { prefix: '/dashboard', type: 'all', placeholder: 'Buscar vacantes, candidatos o mensajes...', listPath: '/dashboard' },
];

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function GlobalSearch({ className }: { className?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CompanySearchData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const isAdmin = user?.role === 'super_admin';

  const config = useMemo((): {
    mode: 'admin' | 'company';
    path: string;
    placeholder: string;
    type?: SearchType;
    listPath?: string;
  } => {
    if (isAdmin) {
      const match =
        ADMIN_ROUTE_MAP.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/')) ??
        ADMIN_ROUTE_MAP[ADMIN_ROUTE_MAP.length - 1];
      return { mode: 'admin', path: match.path, placeholder: match.placeholder };
    }
    const match =
      COMPANY_ROUTE_MAP.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/')) ??
      COMPANY_ROUTE_MAP[COMPANY_ROUTE_MAP.length - 1];
    return {
      mode: 'company',
      path: match.listPath,
      placeholder: match.placeholder,
      type: match.type,
      listPath: match.listPath,
    };
  }, [isAdmin, pathname]);

  const runCompanySearch = useCallback(
    async (q: string, type: SearchType = 'all') => {
      if (q.length < 2) {
        setResults(null);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      setFeedback(null);
      try {
        const res = await search.company(q, type);
        const payload = res.data?.data ?? res.data;
        setResults(payload as CompanySearchData);
        const total =
          (payload?.jobs?.length ?? 0) +
          (payload?.candidates?.length ?? 0) +
          (payload?.messages?.length ?? 0);
        if (total === 0) {
          setFeedback('Sin resultados. Prueba con otro término.');
        }
      } catch {
        setError('No se pudo buscar. Intenta de nuevo.');
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (config.mode !== 'company') return;
    if (!open || debouncedQuery.length < 2) {
      setResults(null);
      setError(null);
      setFeedback(debouncedQuery.length === 1 ? 'Escribe al menos 2 caracteres.' : null);
      return;
    }
    void runCompanySearch(debouncedQuery, config.type);
  }, [debouncedQuery, open, config.mode, config.type, runCompanySearch]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const navigateAdmin = (q: string) => {
    if (!q) return;
    const params = new URLSearchParams({ search: q });
    router.push(`${config.path}?${params.toString()}`);
    setOpen(false);
    setFeedback(`Filtrando en ${config.path.replace('/admin/', '')}...`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    if (isAdmin) {
      navigateAdmin(q);
      return;
    }

    if (config.listPath && config.listPath !== '/dashboard') {
      const params = new URLSearchParams({ search: q });
      router.push(`${config.listPath}?${params.toString()}`);
      setOpen(false);
      return;
    }

    setOpen(true);
    void runCompanySearch(q, config.type);
  };

  const hasHits =
    results &&
    ((results.jobs?.length ?? 0) > 0 ||
      (results.candidates?.length ?? 0) > 0 ||
      (results.messages?.length ?? 0) > 0);

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-md', className)}>
      <form onSubmit={handleSubmit}>
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setFeedback(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder={config.placeholder}
          aria-label="Buscar"
          className="h-12 w-full rounded-[14px] border border-[#E2E8F0] bg-white pl-10 pr-4 text-sm font-medium text-[#334155] placeholder:text-[#94A3B8] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
        />
      </form>

      {open && (query.trim() || feedback || error || loading || hasHits) && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(420px,70vh)] overflow-y-auto rounded-[14px] border border-[#E6ECF5] bg-white py-2 shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#64748B]">
              <Loader2 className="h-4 w-4 animate-spin text-[#0B5CFF]" />
              Buscando...
            </div>
          )}

          {error && <p className="px-4 py-2 text-sm text-[#B91C1C]">{error}</p>}
          {feedback && !loading && !error && (
            <p className="px-4 py-2 text-sm text-[#64748B]">{feedback}</p>
          )}

          {isAdmin && query.trim() && !loading && (
            <button
              type="button"
              className="w-full px-4 py-2.5 text-left text-sm font-medium text-[#0B5CFF] hover:bg-[#F8FAFC]"
              onClick={() => navigateAdmin(query.trim())}
            >
              Ver resultados en listado →
            </button>
          )}

          {!isAdmin && hasHits && (
            <>
              {(results?.jobs?.length ?? 0) > 0 && (
                <div className="px-2 py-1">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                    Vacantes
                  </p>
                  {results!.jobs!.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[#F8FAFC]"
                      onClick={() => {
                        router.push(`/jobs/${job.id}`);
                        setOpen(false);
                      }}
                    >
                      <span className="font-semibold text-[#0F172A]">{job.title}</span>
                      {job.city && (
                        <span className="ml-2 text-xs text-[#64748B]">{job.city}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {(results?.candidates?.length ?? 0) > 0 && (
                <div className="px-2 py-1">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                    Candidatos
                  </p>
                  {results!.candidates!.map((row) => (
                    <button
                      key={row.applicationId}
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[#F8FAFC]"
                      onClick={() => {
                        router.push(`/candidates/${row.applicationId}`);
                        setOpen(false);
                      }}
                    >
                      <span className="font-semibold text-[#0F172A]">{row.candidate.fullName}</span>
                      <span className="ml-2 text-xs text-[#64748B]">{row.job.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {(results?.messages?.length ?? 0) > 0 && (
                <div className="px-2 py-1">
                  <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                    Mensajes
                  </p>
                  {results!.messages!.map((msg) => (
                    <button
                      key={msg.id}
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[#F8FAFC]"
                      onClick={() => {
                        router.push(`/messages?search=${encodeURIComponent(msg.title)}`);
                        setOpen(false);
                      }}
                    >
                      <span className="font-semibold text-[#0F172A]">{msg.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

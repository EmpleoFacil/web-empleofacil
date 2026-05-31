'use client';

import { useState, useMemo } from 'react';
import { useUrlSearchParam } from '@/lib/use-url-search-param';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MapPin,
  Users,
  Eye,
  Edit,
  Pause,
  Play,
  Trash2,
  Copy,
  BarChart3,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { JobPreviewDrawer } from '@/components/jobs/job-preview-drawer';
import { jobs } from '@/lib/api';
import { getStatusLabel, getModalityLabel } from '@/lib/utils';
import { listQueryOptions, queryKeys } from '@/lib/query-config';

type JobRow = {
  id: string;
  title: string;
  city: string | null;
  modality?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  status: string;
  createdAt: string;
  _count?: { applications: number };
  applications?: number;
};

type JobsListResponse = {
  items: JobRow[];
  total: number;
  page: number;
  totalPages: number;
};

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', status: '', city: '' });
  const [appliedFilters, setAppliedFilters] = useState({ search: '', status: '', city: '' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobRow | null>(null);

  useUrlSearchParam((search) => {
    const next = { search, status: '', city: '' };
    setFilters(next);
    setAppliedFilters(next);
    setPage(1);
  });

  const filterKey = useMemo(
    () => ({
      search: appliedFilters.search,
      status: appliedFilters.status,
      city: appliedFilters.city,
    }),
    [appliedFilters.search, appliedFilters.status, appliedFilters.city]
  );

  const { data: summary } = useQuery({
    queryKey: queryKeys.jobsCompanySummary,
    queryFn: () => jobs.getCompanySummary().then((res) => res.data),
    ...listQueryOptions,
  });

  const { data: jobsData, isFetching } = useQuery({
    queryKey: queryKeys.jobsCompany(filterKey, page),
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 10 };
      const search = appliedFilters.search.trim();
      const city = appliedFilters.city.trim();

      if (search) params.search = search;
      if (appliedFilters.status) params.status = appliedFilters.status;
      if (city) params.city = city;

      return jobs.getCompanyJobs(params).then((res) => res.data as JobsListResponse);
    },
    ...listQueryOptions,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => jobs.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-company'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobsCompanySummary });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-company'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobsCompanySummary });
      setDeleteTarget(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => jobs.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-company'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobsCompanySummary });
    },
    onError: () => {
      alert('Duplicar vacante no está disponible en el servidor aún.');
    },
  });

  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const clearFilters = () => {
    const empty = { search: '', status: '', city: '' };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const metricCards = [
    {
      key: 'active',
      title: 'Activas',
      value: summary?.active?.value ?? 0,
      trend: summary?.active?.trend,
      icon: Play,
      iconBg: 'bg-[#EAF8EF]',
      iconColor: 'text-[#16A34A]',
    },
    {
      key: 'paused',
      title: 'Pausadas',
      value: summary?.paused?.value ?? 0,
      trend: summary?.paused?.trend,
      icon: Pause,
      iconBg: 'bg-[#FFF5E6]',
      iconColor: 'text-[#F59E0B]',
    },
    {
      key: 'closed',
      title: 'Cerradas',
      value: summary?.closed?.value ?? 0,
      trend: summary?.closed?.trend,
      icon: XCircle,
      iconBg: 'bg-[#FEECEC]',
      iconColor: 'text-[#EF4444]',
    },
    {
      key: 'applications',
      title: 'Total postulaciones',
      value: summary?.applications?.value ?? 0,
      trend: summary?.applications?.trend,
      icon: Users,
      iconBg: 'bg-[#F5EAFE]',
      iconColor: 'text-[#A855F7]',
    },
  ];

  const items = jobsData?.items ?? [];
  const cityOptions = Array.from(new Set(items.map((job) => job.city).filter(Boolean) as string[])).sort();
  const isInitialLoading = isFetching && !jobsData;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Vacantes"
        subtitle="Administra y publica las oportunidades laborales de tu empresa."
        actions={
          <>
            <Link href="/jobs/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva vacante
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </>
        }
      />

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {metricCards.map((card) => (
            <StatCard
              key={card.key}
              title={card.title}
              value={card.value}
              trend={card.trend}
              period="mes anterior"
              icon={card.icon}
              iconBg={card.iconBg}
              iconColor={card.iconColor}
            />
          ))}
        </div>

        <Card className="rounded-[18px] border border-[#E6ECF5] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="relative md:col-span-6">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="Buscar por puesto o ciudad..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    className="h-10 w-full rounded-lg border border-[#E6ECF5] bg-white pl-9 pr-3 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                  />
                </div>
                <div className="md:col-span-3">
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#E6ECF5] bg-white px-3 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                  >
                    <option value="">Todas las ciudades</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#E6ECF5] bg-white px-3 text-sm text-[#334155] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                  >
                    <option value="">Todos los estados</option>
                    <option value="active">Activas</option>
                    <option value="paused">Pausadas</option>
                    <option value="closed">Cerradas</option>
                  </select>
                </div>
              </div>

            {showFilters && (
              <div className="flex gap-2">
                <Button variant="outline" className="h-10" onClick={clearFilters}>
                  Limpiar
                </Button>
                <Button className="h-10" onClick={applyFilters}>
                  Aplicar
                </Button>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-[#E6ECF5]">
              <table className="min-w-full divide-y divide-[#E6ECF5] bg-white">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {['Puesto', 'Ciudad', 'Modalidad', 'Salario', 'Estado', 'Postulaciones', 'Acciones'].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]"
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {isInitialLoading ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-[#64748B]" colSpan={7}>
                        Cargando vacantes...
                      </td>
                    </tr>
                  ) : items.length ? (
                    items.map((job) => {
                      const applicationsCount = job._count?.applications ?? job.applications ?? 0;
                      const hasSalary =
                        typeof job.salaryMin === 'number' || typeof job.salaryMax === 'number';
                      const salaryText = hasSalary
                        ? `C$ ${job.salaryMin?.toLocaleString() ?? '-'} - C$ ${job.salaryMax?.toLocaleString() ?? '-'}`
                        : 'No definido';

                      return (
                        <tr key={job.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <span className="font-medium text-[#0F172A]">{job.title}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#475569]">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-[#94A3B8]" />
                              {job.city || 'Remoto'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#475569]">
                            {getModalityLabel(job.modality)}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#334155]">{salaryText}</td>
                          <td className="px-4 py-3">
                            <Badge variant={getStatusBadgeVariant(job.status)}>
                              {getStatusLabel(job.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">
                            {applicationsCount}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/jobs/${job.id}`}
                                title="Editar"
                                className="rounded-md border border-[#E6ECF5] p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button
                                type="button"
                                title="Ver"
                                onClick={() => setPreviewJobId(job.id)}
                                className="rounded-md border border-[#E6ECF5] p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <Link
                                href={`/jobs/${job.id}`}
                                title="Estadísticas"
                                className="rounded-md border border-[#E6ECF5] p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Link>
                              {job.status === 'active' ? (
                                <button
                                  type="button"
                                  title="Pausar"
                                  onClick={() =>
                                    updateStatusMutation.mutate({ id: job.id, status: 'paused' })
                                  }
                                  className="rounded-md border border-[#E6ECF5] p-1.5 text-[#F59E0B] hover:bg-amber-50"
                                >
                                  <Pause className="h-4 w-4" />
                                </button>
                              ) : job.status === 'paused' ? (
                                <button
                                  type="button"
                                  title="Activar"
                                  onClick={() =>
                                    updateStatusMutation.mutate({ id: job.id, status: 'active' })
                                  }
                                  className="rounded-md border border-[#E6ECF5] p-1.5 text-[#16A34A] hover:bg-emerald-50"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              ) : null}
                              {job.status !== 'closed' && (
                                <button
                                  type="button"
                                  title="Cerrar"
                                  onClick={() =>
                                    updateStatusMutation.mutate({ id: job.id, status: 'closed' })
                                  }
                                  className="rounded-md border border-[#E6ECF5] p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Duplicar"
                                onClick={() => duplicateMutation.mutate(job.id)}
                                disabled={duplicateMutation.isPending}
                                className="rounded-md border border-[#E6ECF5] p-1.5 text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-50"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Eliminar"
                                onClick={() => setDeleteTarget(job)}
                                className="rounded-md border border-[#E6ECF5] p-1.5 text-[#EF4444] hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-12 text-center" colSpan={7}>
                        <div className="mx-auto w-fit rounded-lg border border-[#E6ECF5] bg-[#F8FAFC] p-6">
                          <Briefcase className="mx-auto h-8 w-8 text-[#CBD5E1]" />
                          <p className="mt-2 text-sm font-medium text-[#1E293B]">No hay vacantes</p>
                          <p className="mt-1 text-xs text-[#64748B]">
                            Comienza creando tu primera oferta laboral.
                          </p>
                          <Link href="/jobs/new" className="mt-3 inline-block">
                            <Button size="sm">
                              <Plus className="h-3.5 w-3.5" />
                              Nueva vacante
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {typeof jobsData?.total === 'number' && jobsData.total > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#64748B]">
                  Mostrando {(page - 1) * 10 + 1} a {Math.min(page * 10, jobsData.total)} de{' '}
                  {jobsData.total} vacantes
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm font-medium text-[#64748B]">
                    {page} / {jobsData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= jobsData.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <JobPreviewDrawer jobId={previewJobId} onClose={() => setPreviewJobId(null)} />

      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar vacante"
        description={`¿Seguro que deseas eliminar "${deleteTarget?.title}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

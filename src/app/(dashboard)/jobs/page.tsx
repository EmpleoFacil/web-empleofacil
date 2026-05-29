'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MapPin,
  Clock,
  Users,
  Eye,
  Edit,
  Pause,
  Play,
  Trash2,
  ArrowUp,
  ArrowDown,
  Building2,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { jobs } from '@/lib/api';
import { formatDate, getStatusLabel } from '@/lib/utils';

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

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', status: '', city: '' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['jobs-summary'],
    queryFn: () => jobs.getCompanySummary().then((res) => res.data),
  });

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs-company', filters, page],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit: 10 };
      const search = filters.search.trim();
      const city = filters.city.trim();

      if (search) params.search = search;
      if (filters.status) params.status = filters.status;
      if (city) params.city = city;

      return jobs.getCompanyJobs(params).then((res) => res.data);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => jobs.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-company'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-company'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-summary'] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Seguro que deseas eliminar esta vacante?')) {
      deleteMutation.mutate(id);
    }
  };

  const metricCards = [
    {
      key: 'active',
      title: 'Activas',
      value: summary?.active?.value ?? 0,
      trend: summary?.active?.trend ?? 0,
      icon: Play,
      iconWrap: 'bg-emerald-100 text-emerald-600',
    },
    {
      key: 'paused',
      title: 'Pausadas',
      value: summary?.paused?.value ?? 0,
      trend: summary?.paused?.trend ?? 0,
      icon: Pause,
      iconWrap: 'bg-amber-100 text-amber-600',
    },
    {
      key: 'closed',
      title: 'Cerradas',
      value: summary?.closed?.value ?? 0,
      trend: summary?.closed?.trend ?? 0,
      icon: Building2,
      iconWrap: 'bg-rose-100 text-rose-600',
    },
    {
      key: 'applications',
      title: 'Total postulaciones',
      value: summary?.applications?.value ?? 0,
      trend: summary?.applications?.trend ?? 0,
      icon: Users,
      iconWrap: 'bg-violet-100 text-violet-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Vacantes" subtitle="Administra y publica las oportunidades laborales de tu empresa." />

      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button>
              <Plus className="h-4 w-4" />
              Nueva vacante
            </Button>
            <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            const positive = card.trend >= 0;
            const TrendIcon = positive ? ArrowUp : ArrowDown;

            return (
              <Card key={card.key} className="rounded-xl border border-slate-200 shadow-sm">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconWrap}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                      <p className="text-4xl font-semibold text-slate-900">{card.value}</p>
                    </div>
                  </div>
                  <p className={`flex items-center gap-1 text-xs ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    {Math.abs(card.trend)}% vs. mes anterior
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-xl border border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-4 md:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="relative md:col-span-5">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por puesto o ciudad..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="md:col-span-3">
                <input
                  type="text"
                  placeholder="Todas las ciudades"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="md:col-span-2">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activas</option>
                  <option value="paused">Pausadas</option>
                  <option value="closed">Cerradas</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Button variant="outline" className="h-10 w-full" onClick={() => setFilters({ search: '', status: '', city: '' })}>
                  Limpiar
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Filtros avanzados disponibles en el siguiente bloque.
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 bg-white">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Puesto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ciudad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Modalidad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Salario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Postulaciones</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Publicado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={8}>
                        Cargando vacantes...
                      </td>
                    </tr>
                  ) : jobsData?.items?.length ? (
                    jobsData.items.map((job: JobRow) => {
                      const applicationsCount = job._count?.applications ?? job.applications ?? 0;
                      const hasSalary = typeof job.salaryMin === 'number' || typeof job.salaryMax === 'number';
                      const salaryText = hasSalary
                        ? `C$ ${job.salaryMin?.toLocaleString() ?? '-'} - C$ ${job.salaryMax?.toLocaleString() ?? '-'}`
                        : 'No definido';

                      return (
                        <tr key={job.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <Link href={`/jobs/${job.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                              {job.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {job.city || 'Remoto'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm capitalize text-slate-600">{job.modality || 'Presencial'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-slate-400" />
                              {salaryText}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={getStatusBadgeVariant(job.status)}>{getStatusLabel(job.status)}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{applicationsCount}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-slate-400" />
                              {formatDate(job.createdAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Link href={`/jobs/${job.id}`} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link href={`/jobs/${job.id}/edit`} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                                <Edit className="h-4 w-4" />
                              </Link>
                              {job.status === 'active' ? (
                                <button
                                  onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'paused' })}
                                  className="rounded-md border border-slate-200 p-1.5 text-amber-600 hover:bg-amber-50"
                                >
                                  <Pause className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateStatusMutation.mutate({ id: job.id, status: 'active' })}
                                  className="rounded-md border border-slate-200 p-1.5 text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(job.id)}
                                className="rounded-md border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50"
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
                      <td className="px-4 py-12 text-center" colSpan={8}>
                        <div className="mx-auto w-fit rounded-lg border border-slate-200 bg-slate-50 p-6">
                          <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
                          <p className="mt-2 text-sm font-medium text-slate-800">No hay vacantes</p>
                          <p className="mt-1 text-xs text-slate-500">Comienza creando tu primera oferta laboral.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {typeof jobsData?.total === 'number' && jobsData.total > 0 && jobsData.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Mostrando {((page - 1) * 10) + 1} a {Math.min(page * 10, jobsData.total)} de {jobsData.total} vacantes
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= jobsData.totalPages} onClick={() => setPage(page + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

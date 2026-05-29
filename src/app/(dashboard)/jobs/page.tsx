'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Briefcase, Plus, Search, Filter, MapPin, Clock, Users, 
  MoreHorizontal, Eye, Edit, Pause, Play, Trash2, X 
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { jobs } from '@/lib/api';
import { formatDate, getStatusLabel, cn } from '@/lib/utils';

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', status: '', city: '' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['jobs-summary'],
    queryFn: () => jobs.getCompanySummary().then(res => res.data),
  });

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs-company', filters, page],
    queryFn: () => jobs.getCompanyJobs({ ...filters, page, limit: 10 }).then(res => res.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => jobs.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-company'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-summary'] });
      setActiveMenu(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs-company'] });
      queryClient.invalidateQueries({ queryKey: ['jobs-summary'] });
      setActiveMenu(null);
    },
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta vacante?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="Vacantes" subtitle="Gestiona las ofertas de trabajo de tu empresa" />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Play className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary?.active?.value ?? 0}</p>
                  <p className="text-sm text-gray-500">Activas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Pause className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary?.paused?.value ?? 0}</p>
                  <p className="text-sm text-gray-500">Pausadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <X className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary?.closed?.value ?? 0}</p>
                  <p className="text-sm text-gray-500">Cerradas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{summary?.applications?.value ?? 0}</p>
                  <p className="text-sm text-gray-500">Aplicaciones totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar vacantes..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="h-10 w-full rounded-lg border border-gray-300 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
            <Link href="/jobs/new">
              <Button>
                <Plus className="h-4 w-4" />
                Nueva vacante
              </Button>
            </Link>
          </CardHeader>

          {showFilters && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activas</option>
                  <option value="paused">Pausadas</option>
                  <option value="closed">Cerradas</option>
                </select>
                <input
                  type="text"
                  placeholder="Ciudad..."
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
                />
                <Button variant="ghost" size="sm" onClick={() => setFilters({ search: '', status: '', city: '' })}>
                  Limpiar filtros
                </Button>
              </div>
            </div>
          )}

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : jobsData?.jobs?.length ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vacante</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Aplicaciones</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Publicado</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobsData.jobs.map((job: {
                      id: string;
                      title: string;
                      city: string | null;
                      status: string;
                      createdAt: string;
                      _count: { applications: number };
                    }) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Briefcase className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <Link href={`/jobs/${job.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                                {job.title}
                              </Link>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-500">
                            <MapPin className="h-4 w-4" />
                            {job.city || 'Remoto'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{job._count?.applications ?? 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(job.status)}>
                            {getStatusLabel(job.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-4 w-4" />
                            {formatDate(job.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(activeMenu === job.id ? null : job.id)}
                              className="p-2 rounded-lg hover:bg-gray-100"
                            >
                              <MoreHorizontal className="h-4 w-4 text-gray-500" />
                            </button>
                            {activeMenu === job.id && (
                              <div className="absolute right-0 top-10 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                                <Link
                                  href={`/jobs/${job.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver detalles
                                </Link>
                                <Link
                                  href={`/jobs/${job.id}/edit`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Edit className="h-4 w-4" />
                                  Editar
                                </Link>
                                {job.status === 'active' ? (
                                  <button
                                    onClick={() => handleStatusChange(job.id, 'paused')}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100"
                                  >
                                    <Pause className="h-4 w-4" />
                                    Pausar
                                  </button>
                                ) : job.status === 'paused' ? (
                                  <button
                                    onClick={() => handleStatusChange(job.id, 'active')}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                                  >
                                    <Play className="h-4 w-4" />
                                    Activar
                                  </button>
                                ) : null}
                                <button
                                  onClick={() => handleDelete(job.id)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {jobsData.pagination && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                    <p className="text-sm text-gray-500">
                      Mostrando {((page - 1) * 10) + 1} a {Math.min(page * 10, jobsData.pagination.total)} de {jobsData.pagination.total} vacantes
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
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= jobsData.pagination.pages}
                        onClick={() => setPage(page + 1)}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-lg font-medium text-gray-900">No hay vacantes</p>
                <p className="mt-1 text-sm text-gray-500">Comienza creando tu primera oferta de trabajo</p>
                <Link href="/jobs/new">
                  <Button className="mt-6">
                    <Plus className="h-4 w-4" />
                    Nueva vacante
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

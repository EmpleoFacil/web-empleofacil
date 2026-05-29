'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Briefcase, Search, Filter, MapPin, Clock, Users, Building2,
  MoreHorizontal, Eye, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { jobs } from '@/lib/api';
import { formatDate, getStatusLabel } from '@/lib/utils';

export default function AdminJobsPage() {
  const [filters, setFilters] = useState({ search: '', status: '', companyId: '' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs-admin', filters, page],
    queryFn: () => jobs.getAdminJobs({ ...filters, page, limit: 15 }).then(res => res.data),
  });

  return (
    <div className="min-h-screen">
      <Header title="Vacantes Globales" subtitle="Todas las vacantes de la plataforma" />

      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{jobsData?.stats?.total ?? 0}</p>
                  <p className="text-sm text-gray-500">Total vacantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{jobsData?.stats?.active ?? 0}</p>
                  <p className="text-sm text-gray-500">Activas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{jobsData?.stats?.companies ?? 0}</p>
                  <p className="text-sm text-gray-500">Empresas activas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{jobsData?.stats?.applications ?? 0}</p>
                  <p className="text-sm text-gray-500">Aplicaciones hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar vacantes o empresas..."
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
                <Button variant="ghost" size="sm" onClick={() => setFilters({ search: '', status: '', companyId: '' })}>
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
                      <TableHead>Empresa</TableHead>
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
                      company: { id: string; name: string };
                      _count: { applications: number };
                    }) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Briefcase className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900">{job.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <Link 
                              href={`/admin/companies/${job.company.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {job.company.name}
                            </Link>
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
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/admin/jobs/${job.id}`}
                              className="p-2 rounded-lg hover:bg-gray-100"
                            >
                              <Eye className="h-4 w-4 text-gray-500" />
                            </Link>
                            <a
                              href={`/jobs/${job.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-gray-100"
                            >
                              <ExternalLink className="h-4 w-4 text-gray-500" />
                            </a>
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
                      Mostrando {((page - 1) * 15) + 1} a {Math.min(page * 15, jobsData.pagination.total)} de {jobsData.pagination.total} vacantes
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
                <p className="mt-1 text-sm text-gray-500">No se encontraron vacantes con los filtros actuales</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

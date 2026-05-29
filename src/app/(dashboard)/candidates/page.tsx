'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Filter, Download, LayoutGrid, List, MapPin,
  MoreHorizontal, Calendar, MessageSquare, FileText, ChevronDown
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { api, jobs } from '@/lib/api';
import { formatDate, getStatusLabel, cn } from '@/lib/utils';

type ViewMode = 'pipeline' | 'table';

const PIPELINE_COLUMNS = [
  { key: 'applied', label: 'Nuevos', color: 'bg-blue-500' },
  { key: 'reviewing', label: 'En revisión', color: 'bg-yellow-500' },
  { key: 'interview_scheduled', label: 'Preseleccionados', color: 'bg-purple-500' },
  { key: 'interview_confirmed', label: 'Entrevista', color: 'bg-indigo-500' },
  { key: 'rejected', label: 'Descartados', color: 'bg-gray-400' },
];

interface Candidate {
  id: string;
  status: string;
  appliedAt: string;
  candidate: { id: string; fullName: string; city: string | null };
  job: { id: string; title: string };
}

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [filters, setFilters] = useState({ search: '', jobId: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['applications-summary'],
    queryFn: () => api.get('/applications/company/summary').then(res => res.data),
  });

  const { data: pipeline, isLoading: pipelineLoading } = useQuery({
    queryKey: ['applications-pipeline', filters.jobId],
    queryFn: () => api.get('/applications/company/pipeline', { params: { jobId: filters.jobId || undefined } }).then(res => res.data),
    enabled: viewMode === 'pipeline',
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ['applications-table', filters],
    queryFn: () => api.get('/applications/company', { params: filters }).then(res => res.data),
    enabled: viewMode === 'table',
  });

  const { data: companyJobs } = useQuery({
    queryKey: ['company-jobs-filter'],
    queryFn: () => jobs.getCompanyJobs({ limit: 100 }).then(res => res.data.items),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/applications/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['applications-table'] });
      queryClient.invalidateQueries({ queryKey: ['applications-summary'] });
      setActiveMenu(null);
    },
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleExport = async () => {
    const data = await api.get('/applications/company/export', { params: { jobId: filters.jobId || undefined } });
    const csv = [
      ['Nombre', 'Teléfono', 'Ciudad', 'Vacante', 'Estado', 'Fecha'],
      ...data.data.map((a: { candidate: { fullName: string; phone: string; city: string }; job: { title: string }; status: string; appliedAt: string }) => [
        a.candidate.fullName, a.candidate.phone, a.candidate.city, a.job.title, a.status, a.appliedAt
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidatos.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Candidatos / postulaciones" subtitle="Administra los candidatos que se han postulado a tus vacantes." />

      <div className="p-6 space-y-6">
        {/* View Toggle & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <List className="h-4 w-4" />
              Tabla
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                viewMode === 'pipeline' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Pipeline
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className={showFilters ? '' : 'hidden'}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <select
                value={filters.jobId}
                onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none min-w-[200px]"
              >
                <option value="">Todas las vacantes</option>
                {companyJobs?.map((job: { id: string; title: string }) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="applied">Nuevos</option>
                <option value="reviewing">En revisión</option>
                <option value="interview_scheduled">Entrevista</option>
                <option value="rejected">Descartados</option>
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar candidato..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="h-10 w-full rounded-lg border border-gray-300 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline View */}
        {viewMode === 'pipeline' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_COLUMNS.map((col) => {
              const items = pipeline?.[col.key] || [];
              const count = items.length;

              return (
                <div key={col.key} className="flex-shrink-0 w-72">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('w-3 h-3 rounded-full', col.color)} />
                    <h3 className="font-semibold text-gray-900">{col.label}</h3>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
                  </div>

                  <div className="space-y-3">
                    {pipelineLoading ? (
                      <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                    ) : items.length > 0 ? (
                      <>
                        {items.slice(0, 5).map((app: Candidate) => (
                          <CandidateCard
                            key={app.id}
                            application={app}
                            activeMenu={activeMenu}
                            setActiveMenu={setActiveMenu}
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                        {items.length > 5 && (
                          <button className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            + Ver más
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="py-8 text-center text-sm text-gray-400">
                        Sin candidatos
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <CardContent className="p-0">
              {tableLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : tableData?.applications?.length ? (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Candidato</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Vacante</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Estado</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Fecha</th>
                      <th className="px-6 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tableData.applications.map((app: Candidate) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {app.candidate.fullName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{app.candidate.fullName}</p>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <MapPin className="h-3 w-3" />
                                {app.candidate.city || 'Sin ubicación'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{app.job.title}</td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusBadgeVariant(app.status)}>
                            {getStatusLabel(app.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(app.appliedAt)}</td>
                        <td className="px-6 py-4">
                          <button className="p-2 rounded-lg hover:bg-gray-100">
                            <MoreHorizontal className="h-4 w-4 text-gray-500" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4 text-lg font-medium text-gray-900">No hay postulaciones</p>
                  <p className="mt-1 text-sm text-gray-500">Las postulaciones aparecerán aquí cuando los candidatos apliquen</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CandidateCard({
  application,
  activeMenu,
  setActiveMenu,
  onStatusChange,
}: {
  application: Candidate;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {application.candidate.fullName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{application.candidate.fullName}</p>
            <p className="text-xs text-gray-500">{application.job.title}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === application.id ? null : application.id)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </button>
          {activeMenu === application.id && (
            <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
              <button
                onClick={() => onStatusChange(application.id, 'reviewing')}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Mover a revisión
              </button>
              <button
                onClick={() => onStatusChange(application.id, 'interview_scheduled')}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Calendar className="h-4 w-4" />
                Programar entrevista
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <MessageSquare className="h-4 w-4" />
                Enviar mensaje
              </button>
              <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <FileText className="h-4 w-4" />
                Añadir nota
              </button>
              <hr className="my-1" />
              <button
                onClick={() => onStatusChange(application.id, 'rejected')}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                Descartar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <MapPin className="h-3 w-3" />
        <span>{application.candidate.city || 'Sin ubicación'}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
        {formatDate(application.appliedAt)}
      </div>
    </div>
  );
}

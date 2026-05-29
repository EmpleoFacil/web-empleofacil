'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, Filter, Download, MapPin, Eye, FileText, Briefcase,
  MoreHorizontal, X, CheckCircle, Clock, XCircle, ChevronDown
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, getStatusLabel, cn } from '@/lib/utils';

interface Candidate {
  id: string;
  fullName: string;
  city: string | null;
  status: string;
  profileCompletion: number;
  createdAt: string;
  user: { email: string };
  _count: { applications: number; documents: number };
}

interface DrawerProps {
  candidateId: string | null;
  type: 'detail' | 'documents' | 'applications' | null;
  onClose: () => void;
}

export default function AdminCandidatesPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: '', status: '', city: '' });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerProps>({ candidateId: null, type: null, onClose: () => {} });

  const { data: summary } = useQuery({
    queryKey: ['candidates-summary'],
    queryFn: () => api.get('/candidates/summary').then(res => res.data),
  });

  const { data: candidatesData, isLoading } = useQuery({
    queryKey: ['candidates-list', filters, page],
    queryFn: () => api.get('/candidates', { params: { ...filters, page, limit: 10 } }).then(res => res.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/candidates/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates-list'] });
      queryClient.invalidateQueries({ queryKey: ['candidates-summary'] });
      setActiveMenu(null);
    },
  });

  const handleExport = async () => {
    const data = await api.get('/candidates/export', { params: filters });
    const csv = [
      ['Nombre', 'Email', 'Ciudad', 'Estado', 'Postulaciones', 'Perfil %', 'Registro'],
      ...data.data.map((c: Candidate) => [
        c.fullName, c.user.email, c.city || '', c.status, c._count.applications, c.profileCompletion, c.createdAt
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidatos.csv';
    a.click();
  };

  const openDrawer = (candidateId: string, type: 'detail' | 'documents' | 'applications') => {
    setDrawer({ candidateId, type, onClose: () => setDrawer({ candidateId: null, type: null, onClose: () => {} }) });
    setActiveMenu(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Candidatos globales" subtitle="Administra la base general de candidatos registrados." />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total candidatos"
            value={summary?.total?.value ?? 0}
            trend={summary?.total?.trend}
            period="mes anterior"
            icon={Users}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Perfiles completos"
            value={summary?.complete?.value ?? 0}
            trend={summary?.complete?.trend}
            period="mes anterior"
            icon={CheckCircle}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            title="Documentos pendientes"
            value={summary?.pendingDocs?.value ?? 0}
            icon={Clock}
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
          />
          <StatCard
            title="Candidatos activos"
            value={summary?.active?.value ?? 0}
            icon={Users}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo o perfil buscado..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="h-10 w-full rounded-lg border border-gray-300 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
                Más filtros
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Exportar candidatos
              </Button>
            </div>
          </CardHeader>

          {showFilters && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="reviewing">En revisión</option>
                  <option value="paused">Pausado</option>
                  <option value="inactive">Inactivo</option>
                </select>
                <input
                  type="text"
                  placeholder="Todas las ciudades"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
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
            ) : candidatesData?.candidates?.length ? (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Nombre</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Ciudad</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Estado</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Documentos</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Postulaciones</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {candidatesData.candidates.map((candidate: Candidate) => (
                      <tr key={candidate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {candidate.fullName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{candidate.fullName}</p>
                              <p className="text-sm text-gray-500">{candidate.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="h-4 w-4" />
                            {candidate.city || 'Sin ubicación'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusBadgeVariant(candidate.status)}>
                            {getStatusLabel(candidate.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'text-sm font-medium',
                            candidate._count.documents >= 4 ? 'text-green-600' : 'text-yellow-600'
                          )}>
                            ✓ {candidate._count.documents} / 4
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{candidate._count.applications}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openDrawer(candidate.id, 'detail')}
                              className="p-2 rounded-lg hover:bg-gray-100"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => openDrawer(candidate.id, 'documents')}
                              className="p-2 rounded-lg hover:bg-gray-100"
                              title="Ver documentos"
                            >
                              <FileText className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => openDrawer(candidate.id, 'applications')}
                              className="p-2 rounded-lg hover:bg-gray-100"
                              title="Ver postulaciones"
                            >
                              <Briefcase className="h-4 w-4 text-gray-500" />
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenu(activeMenu === candidate.id ? null : candidate.id)}
                                className="p-2 rounded-lg hover:bg-gray-100"
                              >
                                <MoreHorizontal className="h-4 w-4 text-gray-500" />
                              </button>
                              {activeMenu === candidate.id && (
                                <div className="absolute right-0 top-10 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                                  <button
                                    onClick={() => updateStatusMutation.mutate({ id: candidate.id, status: 'active' })}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    Marcar activo
                                  </button>
                                  <button
                                    onClick={() => updateStatusMutation.mutate({ id: candidate.id, status: 'reviewing' })}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-gray-100"
                                  >
                                    <Clock className="h-4 w-4" />
                                    En revisión
                                  </button>
                                  <button
                                    onClick={() => updateStatusMutation.mutate({ id: candidate.id, status: 'inactive' })}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                  >
                                    <XCircle className="h-4 w-4" />
                                    Desactivar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {candidatesData.pagination && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                    <p className="text-sm text-gray-500">
                      Mostrando {((page - 1) * 10) + 1} a {Math.min(page * 10, candidatesData.pagination.total)} de {candidatesData.pagination.total} candidatos
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= candidatesData.pagination.pages} onClick={() => setPage(page + 1)}>
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-lg font-medium text-gray-900">No hay candidatos</p>
                <p className="mt-1 text-sm text-gray-500">No se encontraron candidatos con los filtros actuales</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drawer */}
      {drawer.candidateId && drawer.type && (
        <CandidateDrawer
          candidateId={drawer.candidateId}
          type={drawer.type}
          onClose={() => setDrawer({ candidateId: null, type: null, onClose: () => {} })}
        />
      )}
    </div>
  );
}

function CandidateDrawer({ candidateId, type, onClose }: { candidateId: string; type: string; onClose: () => void }) {
  const { data: candidate } = useQuery({
    queryKey: ['candidate-detail', candidateId],
    queryFn: () => api.get(`/candidates/${candidateId}`).then(res => res.data),
    enabled: type === 'detail',
  });

  const { data: applications } = useQuery({
    queryKey: ['candidate-applications', candidateId],
    queryFn: () => api.get(`/candidates/${candidateId}/applications`).then(res => res.data),
    enabled: type === 'applications',
  });

  const { data: documents } = useQuery({
    queryKey: ['candidate-documents', candidateId],
    queryFn: () => api.get(`/candidates/${candidateId}/documents`).then(res => res.data),
    enabled: type === 'documents',
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {type === 'detail' && 'Detalle del candidato'}
            {type === 'applications' && 'Postulaciones'}
            {type === 'documents' && 'Documentos'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(100vh-80px)]">
          {type === 'detail' && candidate && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-medium text-blue-600">{candidate.fullName?.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{candidate.fullName}</h3>
                  <p className="text-gray-500">{candidate.user?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Ciudad</p>
                  <p className="font-medium">{candidate.city || 'No especificada'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Teléfono</p>
                  <p className="font-medium">{candidate.phone || 'No especificado'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Perfil completado</p>
                  <p className="font-medium">{candidate.profileCompletion}%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Estado</p>
                  <Badge variant={getStatusBadgeVariant(candidate.status)}>{getStatusLabel(candidate.status)}</Badge>
                </div>
              </div>
            </div>
          )}

          {type === 'applications' && (
            <div className="space-y-4">
              {applications?.length ? applications.map((app: { id: string; status: string; appliedAt: string; job: { title: string; company: { name: string } } }) => (
                <div key={app.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{app.job.title}</p>
                      <p className="text-sm text-gray-500">{app.job.company.name}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(app.status)}>{getStatusLabel(app.status)}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">{formatDate(app.appliedAt)}</p>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-8">Sin postulaciones</p>
              )}
            </div>
          )}

          {type === 'documents' && (
            <div className="space-y-4">
              {documents?.length ? documents.map((doc: { id: string; type: string; status: string; uploadedAt: string }) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.type}</p>
                      <p className="text-xs text-gray-500">{formatDate(doc.uploadedAt)}</p>
                    </div>
                  </div>
                  <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}>
                    {doc.status}
                  </Badge>
                </div>
              )) : (
                <p className="text-center text-gray-500 py-8">Sin documentos</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

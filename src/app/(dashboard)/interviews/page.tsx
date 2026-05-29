'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, Search, Filter, Plus, Clock, CheckCircle, RefreshCw,
  MapPin, Video, MoreHorizontal, Bell, FileText, Eye, Edit, ChevronDown, X
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface Interview {
  id: string;
  date: string;
  modality: string;
  location?: string;
  meetingUrl?: string;
  status: string;
  result?: string;
  candidate?: { id: string; fullName: string; city?: string };
  job?: { id: string; title: string };
  application?: { id: string; job?: { id: string; title: string } };
}

interface CompanyApplicationOption {
  id: string;
  candidate?: { fullName?: string };
  job?: { title?: string };
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  rescheduled: 'bg-orange-100 text-orange-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  pending_confirmation: 'bg-purple-100 text-purple-700',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  rescheduled: 'Reagendada',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
  pending_confirmation: 'Pendiente de confirmación',
};

export default function InterviewsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', jobId: '', search: '', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [showResultModal, setShowResultModal] = useState<Interview | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['interviews-summary'],
    queryFn: () => api.get('/interviews/company/summary').then(res => res.data),
  });

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['interviews', filters],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.jobId) params.jobId = filters.jobId;
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      return api.get('/interviews/company', { params }).then(res => {
        const data = res.data;
        return Array.isArray(data) ? data : (data.items ?? []);
      });
    },
  });

  const { data: jobs } = useQuery({
    queryKey: ['company-jobs'],
    queryFn: () => api.get('/jobs/company').then(res => res.data.items ?? res.data.jobs ?? []),
  });

  const { data: companyApplications } = useQuery({
    queryKey: ['company-applications-for-interviews'],
    queryFn: () =>
      api
        .get('/applications/company', { params: { limit: 100 } })
        .then(res => res.data.applications ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const { modality, ...rest } = data as Record<string, unknown>;
      return api.post('/interviews', { ...rest, type: modality });
    },
    onSuccess: () => {
      setCreateError('');
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews-summary'] });
      setShowNewModal(false);
    },
    onError: (err: unknown) => {
      const apiError = err as { response?: { data?: { message?: string } } };
      setCreateError(apiError.response?.data?.message || 'No se pudo crear la entrevista.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => api.patch(`/interviews/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      setEditingInterview(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/interviews/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews-summary'] });
      setActiveMenu(null);
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: (id: string) => api.post(`/interviews/${id}/reminder`),
    onSuccess: () => setActiveMenu(null),
  });

  const recordResultMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; result: string; notes?: string; moveApplicationStatus?: string }) => 
      api.post(`/interviews/${id}/result`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interviews-summary'] });
      setShowResultModal(null);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Entrevistas" subtitle="Gestiona y da seguimiento a todas las entrevistas programadas para tus vacantes." />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard
            title="Total entrevistas"
            value={summary?.total?.value ?? 0}
            trend={summary?.total?.trend}
            period="mes anterior"
            icon={Calendar}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Pendientes de confirmación"
            value={summary?.pending?.value ?? 0}
            icon={Clock}
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
          />
          <StatCard
            title="Confirmadas"
            value={summary?.confirmed?.value ?? 0}
            icon={CheckCircle}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            title="Reprogramadas"
            value={summary?.rescheduled?.value ?? 0}
            icon={RefreshCw}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
          <StatCard
            title="Finalizadas"
            value={summary?.completed?.value ?? 0}
            icon={FileText}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por candidato o vacante..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="h-10 w-full rounded-lg border border-gray-300 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              >
                <option value="">Todos los estados</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select
                value={filters.jobId}
                onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              >
                <option value="">Todas las vacantes</option>
                {jobs?.map((job: { id: string; title: string }) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
            <Button onClick={() => { setCreateError(''); setShowNewModal(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Programar entrevista
            </Button>
          </CardHeader>

          {showFilters && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Desde</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFilters({ status: '', jobId: '', search: '', dateFrom: '', dateTo: '' })}>
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
            ) : interviews?.length ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Candidato</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Vacante</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Fecha</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Hora</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Modalidad</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Ubicación / Enlace</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Estado</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {interviews.map((interview: Interview) => {
                    const date = new Date(interview.date);
                    return (
                      <tr key={interview.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">{(interview.candidate?.fullName || '?').charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{interview.candidate?.fullName || 'Candidato'}</p>
                              <p className="text-sm text-gray-500">{interview.candidate?.city}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{interview.job?.title || interview.application?.job?.title || 'Vacante'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {date.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' })}
                          <span className="block text-xs text-gray-500">{date.toLocaleDateString('es-NI', { weekday: 'long' })}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {date.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                            interview.modality === 'virtual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          )}>
                            {interview.modality === 'virtual' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            {interview.modality === 'virtual' ? 'Virtual' : 'Presencial'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {interview.modality === 'virtual' && interview.meetingUrl ? (
                            <a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-[200px]">
                              {interview.meetingUrl}
                            </a>
                          ) : (
                            <span className="text-gray-900">{interview.location || 'Por definir'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColors[interview.status] || 'bg-gray-100 text-gray-700')}>
                            {statusLabels[interview.status] || interview.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditingInterview(interview)} className="p-2 rounded-lg hover:bg-gray-100" title="Editar">
                              <Edit className="h-4 w-4 text-gray-500" />
                            </button>
                            <button onClick={() => sendReminderMutation.mutate(interview.id)} className="p-2 rounded-lg hover:bg-gray-100" title="Recordatorio">
                              <Bell className="h-4 w-4 text-gray-500" />
                            </button>
                            <button onClick={() => setShowResultModal(interview)} className="p-2 rounded-lg hover:bg-gray-100" title="Resultado">
                              <FileText className="h-4 w-4 text-gray-500" />
                            </button>
                            <div className="relative">
                              <button onClick={() => setActiveMenu(activeMenu === interview.id ? null : interview.id)} className="p-2 rounded-lg hover:bg-gray-100">
                                <MoreHorizontal className="h-4 w-4 text-gray-500" />
                              </button>
                              {activeMenu === interview.id && (
                                <div className="absolute right-0 top-10 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                                  <button onClick={() => updateStatusMutation.mutate({ id: interview.id, status: 'confirmed' })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100">
                                    <CheckCircle className="h-4 w-4" /> Confirmar
                                  </button>
                                  <button onClick={() => updateStatusMutation.mutate({ id: interview.id, status: 'rescheduled' })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-gray-100">
                                    <RefreshCw className="h-4 w-4" /> Reagendar
                                  </button>
                                  <button onClick={() => updateStatusMutation.mutate({ id: interview.id, status: 'cancelled' })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                                    <X className="h-4 w-4" /> Cancelar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-lg font-medium text-gray-900">No hay entrevistas</p>
                <p className="mt-1 text-sm text-gray-500">Programa tu primera entrevista para comenzar</p>
                <Button className="mt-4" onClick={() => { setCreateError(''); setShowNewModal(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Programar entrevista
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Interview Modal */}
      {showNewModal && (
        <InterviewModal
          title="Programar entrevista"
          applications={companyApplications ?? []}
          errorMessage={createError}
          onClose={() => { setCreateError(''); setShowNewModal(false); }}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Interview Modal */}
      {editingInterview && (
        <InterviewModal
          title="Editar entrevista"
          interview={editingInterview}
          onClose={() => setEditingInterview(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingInterview.id, ...data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Result Modal */}
      {showResultModal && (
        <ResultModal
          interview={showResultModal}
          onClose={() => setShowResultModal(null)}
          onSubmit={(data) => recordResultMutation.mutate({ id: showResultModal.id, ...data })}
          isLoading={recordResultMutation.isPending}
        />
      )}
    </div>
  );
}

function InterviewModal({ title, interview, applications, errorMessage, onClose, onSubmit, isLoading }: { 
  title: string; 
  interview?: Interview;
  applications?: CompanyApplicationOption[];
  errorMessage?: string;
  onClose: () => void; 
  onSubmit: (data: Record<string, unknown>) => void; 
  isLoading: boolean 
}) {
  const [form, setForm] = useState({
    applicationId: interview?.application?.id || '',
    date: interview ? new Date(interview.date).toISOString().slice(0, 16) : '',
    modality: interview?.modality || 'presencial',
    location: interview?.location || '',
    meetingUrl: interview?.meetingUrl || '',
    notesForCandidate: '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            {!interview && errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
            {!interview && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postulacion</label>
                <select
                  value={form.applicationId}
                  onChange={e => setForm({ ...form, applicationId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-300 px-3"
                  required
                >
                  <option value="">Selecciona una postulacion</option>
                  {applications?.map((application) => (
                    <option key={application.id} value={application.id}>
                      {(application.candidate?.fullName || 'Candidato')} - {(application.job?.title || 'Vacante')}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora</label>
              <input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
              <select value={form.modality} onChange={e => setForm({ ...form, modality: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3">
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>
            </div>
            {form.modality === 'presencial' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" placeholder="Dirección" />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enlace de videollamada</label>
                <input type="url" value={form.meetingUrl} onChange={e => setForm({ ...form, meetingUrl: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" placeholder="https://..." />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas para el candidato</label>
              <textarea value={form.notesForCandidate} onChange={e => setForm({ ...form, notesForCandidate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={3} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ResultModal({ interview, onClose, onSubmit, isLoading }: { 
  interview: Interview; 
  onClose: () => void; 
  onSubmit: (data: { result: string; notes?: string; moveApplicationStatus?: string }) => void; 
  isLoading: boolean 
}) {
  const [form, setForm] = useState({ result: 'passed', notes: '', moveApplicationStatus: '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Registrar resultado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Entrevista con <strong>{interview.candidate?.fullName || 'Candidato'}</strong> para <strong>{interview.job?.title || interview.application?.job?.title || 'Vacante'}</strong>
          </p>
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
              <select value={form.result} onChange={e => setForm({ ...form, result: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3">
                <option value="passed">Aprobado</option>
                <option value="failed">No aprobado</option>
                <option value="pending">Pendiente de decisión</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={4} placeholder="Observaciones de la entrevista..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mover estado de postulación a</label>
              <select value={form.moveApplicationStatus} onChange={e => setForm({ ...form, moveApplicationStatus: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3">
                <option value="">No cambiar</option>
                <option value="shortlisted">Preseleccionado</option>
                <option value="hired">Contratado</option>
                <option value="rejected">Descartado</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar resultado'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Filter,
  Link as LinkIcon,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Video,
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { interviews, jobs } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

type InterviewRow = {
  id: string;
  date: string;
  status: string;
  type?: string;
  modality?: string;
  location?: string;
  meetingUrl?: string;
  candidate?: { id?: string; fullName?: string; city?: string };
  job?: { id?: string; title?: string };
  application?: { id?: string; job?: { id?: string; title?: string } };
};

type Summary = Record<string, { value?: number; trend?: number }>;

const statusLabel: Record<string, string> = {
  pending_confirmation: 'Pendiente de confirmacion',
  confirmed: 'Confirmada',
  rescheduled: 'Reagendada',
  scheduled: 'Programada',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
};

const statusStyle: Record<string, string> = {
  pending_confirmation: 'bg-[#FFF5E6] text-[#F59E0B]',
  confirmed: 'bg-[#EAF8EF] text-[#16A34A]',
  rescheduled: 'bg-[#EAF2FF] text-[#0B5CFF]',
  scheduled: 'bg-[#F1F5F9] text-[#475569]',
  completed: 'bg-[#F5EAFE] text-[#A855F7]',
  cancelled: 'bg-[#FEECEC] text-[#EF4444]',
};

export default function InterviewsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [jobId, setJobId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [headerActionsOpen, setHeaderActionsOpen] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InterviewRow | null>(null);
  const [resultTarget, setResultTarget] = useState<InterviewRow | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['company-interviews-summary'],
    queryFn: () => interviews.getSummary().then((res) => res.data as Summary),
  });

  const { data: companyJobs } = useQuery({
    queryKey: ['jobs-company-for-interviews'],
    queryFn: () => jobs.getCompanyJobs({ page: 1, limit: 100 }).then((res) => res.data.items ?? []),
  });

  const { data: listData, isPending } = useQuery({
    queryKey: ['company-interviews-list', search, status, jobId, startDate, endDate],
    queryFn: () =>
      interviews
        .getByCompany({
          page: 1,
          limit: 50,
          ...(status ? { status } : {}),
          ...(jobId ? { jobId } : {}),
          ...(search ? { search } : {}),
          ...(startDate ? { dateFrom: startDate } : {}),
          ...(endDate ? { dateTo: endDate } : {}),
        })
        .then((res) => res.data),
  });

  const rows = useMemo<InterviewRow[]>(() => {
    const data = listData;
    const source: InterviewRow[] = Array.isArray(data)
      ? (data as InterviewRow[])
      : Array.isArray(data?.items)
      ? (data.items as InterviewRow[])
      : [];
    const term = search.trim().toLowerCase();
    return source.filter((row) => {
      const candidateName = String(row.candidate?.fullName ?? '').toLowerCase();
      const jobTitle = String(row.job?.title ?? row.application?.job?.title ?? '').toLowerCase();
      const location = String(row.location ?? row.meetingUrl ?? '').toLowerCase();
      const matchesTerm = term ? candidateName.includes(term) || jobTitle.includes(term) || location.includes(term) : true;
      const matchesStatus = status ? row.status === status : true;
      const matchesPending = onlyPending ? row.status === 'pending_confirmation' : true;
      const job = String(row.job?.id ?? row.application?.job?.id ?? '');
      const matchesJob = jobId ? job === jobId : true;
      return matchesTerm && matchesStatus && matchesPending && matchesJob;
    });
  }, [listData, search, status, onlyPending, jobId]);

  const exportRows = () => {
    const headers = ['Candidato', 'Vacante', 'Fecha', 'Estado', 'Modalidad', 'Ubicación'];
    const csvLines = rows.map((row) => {
      const cols = [
        row.candidate?.fullName || 'Candidato',
        row.job?.title || row.application?.job?.title || 'Vacante',
        formatDate(row.date),
        statusLabel[row.status] || row.status,
        row.modality ?? row.type ?? 'presencial',
        row.location || row.meetingUrl || '-',
      ];
      return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...csvLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'entrevistas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => interviews.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-interviews-list'] });
      queryClient.invalidateQueries({ queryKey: ['company-interviews-summary'] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => interviews.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-interviews-list'] });
      setEditTarget(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) => interviews.updateStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-interviews-list'] });
      queryClient.invalidateQueries({ queryKey: ['company-interviews-summary'] });
      setMenuId(null);
    },
  });

  const remindMutation = useMutation({
    mutationFn: (id: string) => interviews.sendReminder(id),
    onSuccess: () => {
      setMenuId(null);
      setFeedback('Recordatorio enviado correctamente.');
      setTimeout(() => setFeedback(''), 2200);
    },
  });

  const resultMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => interviews.saveResult(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-interviews-list'] });
      queryClient.invalidateQueries({ queryKey: ['company-interviews-summary'] });
      setResultTarget(null);
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Entrevistas"
        subtitle="Gestiona y da seguimiento a todas las entrevistas programadas para tus vacantes."
        actions={
          <>
            <Button className="h-11" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Programar entrevista
            </Button>
            <div className="relative">
              <Button variant="outline" className="h-11" onClick={() => setHeaderActionsOpen((v) => !v)}>
                Acciones
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {headerActionsOpen && (
                <div className="absolute right-0 top-12 z-40 w-52 rounded-xl border border-[#E6ECF5] bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                    onClick={() => {
                      exportRows();
                      setHeaderActionsOpen(false);
                    }}
                  >
                    Exportar listado
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                    onClick={() => {
                      setOnlyPending((v) => !v);
                      setHeaderActionsOpen(false);
                    }}
                  >
                    {onlyPending ? 'Ver todas' : 'Ver solo pendientes'}
                  </button>
                </div>
              )}
            </div>
          </>
        }
      />

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total entrevistas" value={summary?.total?.value ?? 0} trend={summary?.total?.trend} period="mes anterior" icon={Calendar} iconBg="bg-[#F5EAFE]" iconColor="text-[#A855F7]" />
          <StatCard title="Pendientes de confirmacion" value={summary?.pending?.value ?? 0} trend={summary?.pending?.trend} period="mes anterior" icon={Clock} iconBg="bg-[#FFF5E6]" iconColor="text-[#F59E0B]" />
          <StatCard title="Confirmadas" value={summary?.confirmed?.value ?? 0} trend={summary?.confirmed?.trend} period="mes anterior" icon={CheckCircle} iconBg="bg-[#EAF8EF]" iconColor="text-[#16A34A]" />
          <StatCard title="Reprogramadas" value={summary?.rescheduled?.value ?? 0} trend={summary?.rescheduled?.trend} period="mes anterior" icon={RefreshCcw} iconBg="bg-[#EAF2FF]" iconColor="text-[#0B5CFF]" />
          <StatCard title="Finalizadas" value={summary?.completed?.value ?? 0} trend={summary?.completed?.trend} period="mes anterior" icon={Send} iconBg="bg-[#F5EAFE]" iconColor="text-[#A855F7]" />
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="relative xl:col-span-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por candidato o vacante..." className="h-11 w-full rounded-xl border border-[#E6ECF5] bg-white pl-10 pr-3 text-sm" />
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm xl:col-span-2">
                <option value="">Todos los estados</option>
                {Object.keys(statusLabel).map((key) => <option key={key} value={key}>{statusLabel[key]}</option>)}
              </select>
              <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm xl:col-span-2">
                <option value="">Todas las vacantes</option>
                {companyJobs?.map((job: { id: string; title: string }) => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
              <div className="xl:col-span-2">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
              </div>
              <div className="xl:col-span-2">
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
              </div>
              <Button variant="outline" className="h-11 xl:col-span-1" onClick={() => { setSearch(''); setStatus(''); setJobId(''); setStartDate(''); setEndDate(''); }}>
                <Filter className="h-4 w-4" />
                Limpiar
              </Button>
            </div>
            {feedback ? <p className="text-sm font-semibold text-[#16A34A]">{feedback}</p> : null}

            <div className="overflow-x-auto rounded-xl border border-[#E6ECF5]">
              <table className="w-full bg-white">
                <thead className="border-b border-[#EEF2F7] bg-[#F8FAFC]">
                  <tr>
                    {['Candidato', 'Vacante', 'Fecha', 'Hora', 'Modalidad', 'Ubicacion / Enlace', 'Estado', 'Acciones'].map((head) => (
                      <th key={head} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#64748B]">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {isPending ? (
                    <tr><td colSpan={8} className="px-4 py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" /></td></tr>
                  ) : rows.length ? (
                    rows.map((row) => {
                      const dt = new Date(row.date);
                      const modality = row.modality ?? row.type ?? 'presencial';
                      return (
                        <tr key={row.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF2FF] text-xs font-bold text-[#0B5CFF]">
                                {String(row.candidate?.fullName ?? 'C').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                {row.application?.id ? (
                                  <Link href={`/candidates/${row.application.id}`} className="text-sm font-bold text-[#0F172A] hover:text-[#0B5CFF]">
                                    {row.candidate?.fullName || 'Candidato'}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-bold text-[#0F172A]">{row.candidate?.fullName || 'Candidato'}</p>
                                )}
                                <p className="text-xs text-[#64748B]">{row.candidate?.city || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#334155]">
                            <p>{row.job?.title || row.application?.job?.title || 'Vacante'}</p>
                            <p className="text-xs font-normal text-[#64748B]">Publicada el {formatDate(String((row.job as { createdAt?: string } | undefined)?.createdAt ?? row.date))}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#334155]">
                            <p>{formatDate(row.date)}</p>
                            <p className="text-xs font-normal text-[#64748B]">{Number.isNaN(dt.getTime()) ? '--' : dt.toLocaleDateString('es-NI', { weekday: 'long' })}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#334155]">{Number.isNaN(dt.getTime()) ? '--' : dt.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#334155]">
                            <span className="inline-flex items-center gap-1">
                              {modality === 'virtual' ? <Video className="h-4 w-4 text-[#0B5CFF]" /> : <MapPin className="h-4 w-4 text-[#0B5CFF]" />} {modality === 'virtual' ? 'Virtual' : 'Presencial'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#334155]">
                            {modality === 'virtual' ? (
                              <a href={row.meetingUrl || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#0B5CFF] hover:underline">
                                <LinkIcon className="h-4 w-4" />
                                {row.meetingUrl || 'Sin enlace'}
                              </a>
                            ) : (
                              row.location || '-'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', statusStyle[row.status] || 'bg-[#F1F5F9] text-[#475569]')}>
                              {statusLabel[row.status] || row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => setEditTarget(row)} className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]" title="Editar"><Edit className="h-4 w-4" /></button>
                              <button type="button" onClick={() => remindMutation.mutate(row.id)} className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]" title="Recordatorio"><Send className="h-4 w-4" /></button>
                              <button type="button" onClick={() => setResultTarget(row)} className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]" title="Resultado"><Download className="h-4 w-4" /></button>
                              <div className="relative">
                                <button type="button" onClick={() => setMenuId(menuId === row.id ? null : row.id)} className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]" title="Estado"><MoreHorizontal className="h-4 w-4" /></button>
                                {menuId === row.id && (
                                  <div className="absolute right-0 top-10 z-40 w-48 rounded-xl border border-[#E6ECF5] bg-white py-1 shadow-lg">
                                    {['pending_confirmation', 'confirmed', 'rescheduled', 'completed', 'cancelled'].map((next) => (
                                      <button key={next} type="button" onClick={() => updateStatusMutation.mutate({ id: row.id, nextStatus: next })} className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">{statusLabel[next]}</button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={8} className="px-4 py-16 text-center"><p className="text-base font-semibold text-[#0F172A]">No hay entrevistas</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {createOpen && <InterviewFormModal title="Programar entrevista" onClose={() => setCreateOpen(false)} onSubmit={(payload) => createMutation.mutate(payload)} loading={createMutation.isPending} />}
      {editTarget && <InterviewFormModal title="Editar entrevista" interview={editTarget} onClose={() => setEditTarget(null)} onSubmit={(payload) => updateMutation.mutate({ id: editTarget.id, payload })} loading={updateMutation.isPending} />}
      {resultTarget && <ResultModal row={resultTarget} onClose={() => setResultTarget(null)} onSubmit={(payload) => resultMutation.mutate({ id: resultTarget.id, payload })} loading={resultMutation.isPending} />}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function InterviewFormModal({
  title,
  interview,
  onClose,
  onSubmit,
  loading,
}: {
  title: string;
  interview?: InterviewRow;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [date, setDate] = useState(interview?.date ? new Date(interview.date).toISOString().slice(0, 16) : '');
  const [type, setType] = useState(interview?.modality ?? interview?.type ?? 'presencial');
  const [location, setLocation] = useState(interview?.location ?? '');
  const [meetingUrl, setMeetingUrl] = useState(interview?.meetingUrl ?? '');

  return (
    <ModalShell title={title} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ date, type, location, meetingUrl }); }}>
        <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required />
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm">
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
        </select>
        {type === 'virtual' ? (
          <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="Enlace de videollamada" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
        ) : (
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ubicacion" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function ResultModal({ row, onClose, onSubmit, loading }: { row: InterviewRow; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => void; loading: boolean }) {
  const [result, setResult] = useState('passed');
  const [notes, setNotes] = useState('');
  const [moveApplicationStatus, setMoveApplicationStatus] = useState('');

  return (
    <ModalShell title="Registrar resultado" onClose={onClose}>
      <p className="mb-3 text-sm text-[#475569]">{row.candidate?.fullName || 'Candidato'} - {row.job?.title || row.application?.job?.title || 'Vacante'}</p>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ result, notes, moveApplicationStatus }); }}>
        <select value={result} onChange={(e) => setResult(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm">
          <option value="passed">Aprobado</option>
          <option value="failed">No aprobado</option>
          <option value="pending">Pendiente</option>
        </select>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-xl border border-[#E6ECF5] px-3 py-2 text-sm" placeholder="Notas" />
        <select value={moveApplicationStatus} onChange={(e) => setMoveApplicationStatus(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm">
          <option value="">No cambiar estado de postulacion</option>
          <option value="preselected">Preseleccionado</option>
          <option value="hired">Contratado</option>
          <option value="rejected">Descartado</option>
        </select>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar resultado'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

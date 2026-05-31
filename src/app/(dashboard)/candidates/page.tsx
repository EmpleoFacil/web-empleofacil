'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  Download,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Search,
  StickyNote,
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { applications, interviews, jobs, messages } from '@/lib/api';
import { cn, formatDate, getStatusLabel } from '@/lib/utils';

type ViewMode = 'table' | 'pipeline';

type AppStatus = 'applied' | 'reviewing' | 'preselected' | 'interview_scheduled' | 'rejected' | string;

type PipelineApplication = {
  id: string;
  status: AppStatus;
  appliedAt: string;
  candidate: {
    id: string;
    fullName: string;
    city?: string | null;
    email?: string | null;
  };
  job: {
    id: string;
    title: string;
    city?: string | null;
  };
};

type PipelineResponse = Record<string, PipelineApplication[]>;

type TableResponse = {
  items?: PipelineApplication[];
  applications?: PipelineApplication[];
  total?: number;
  page?: number;
  totalPages?: number;
};

type SummaryResponse = Record<string, { value?: number }>;

type CompanyJob = { id: string; title: string };

type ColumnConfig = {
  key: string;
  label: string;
  accent: string;
  aliases: string[];
};

const columns: ColumnConfig[] = [
  { key: 'applied', label: 'Nuevos', accent: 'border-[#0B5CFF] text-[#0B5CFF]', aliases: ['new'] },
  { key: 'reviewing', label: 'En revision', accent: 'border-[#0B5CFF] text-[#0B5CFF]', aliases: ['in_review'] },
  { key: 'preselected', label: 'Preseleccionados', accent: 'border-[#16A34A] text-[#16A34A]', aliases: ['shortlisted'] },
  {
    key: 'interview_scheduled',
    label: 'Entrevista',
    accent: 'border-[#F59E0B] text-[#F59E0B]',
    aliases: ['interview_confirmed', 'interview'],
  },
  { key: 'rejected', label: 'Descartados', accent: 'border-[#EF4444] text-[#EF4444]', aliases: ['discarded'] },
];

function getColumnItems(data: PipelineResponse | undefined, column: ColumnConfig): PipelineApplication[] {
  if (!data) return [];
  if (Array.isArray(data[column.key])) return data[column.key];
  for (const alias of column.aliases) {
    if (Array.isArray(data[alias])) return data[alias];
  }
  return [];
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export default function CandidatesPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<PipelineApplication | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewType, setInterviewType] = useState('presencial');

  const { data: summary } = useQuery({
    queryKey: ['applications-company-summary'],
    queryFn: () => applications.getSummary().then((res) => res.data as SummaryResponse),
  });

  const { data: companyJobs } = useQuery({
    queryKey: ['jobs-company-filter'],
    queryFn: () => jobs.getCompanyJobs({ page: 1, limit: 100 }).then((res) => (res.data.items ?? []) as CompanyJob[]),
  });

  const { data: pipelineData, isPending: pipelineLoading } = useQuery({
    queryKey: ['applications-company-pipeline', jobId],
    queryFn: () => applications.getPipeline({ ...(jobId ? { jobId } : {}) }).then((res) => res.data as PipelineResponse),
    enabled: viewMode === 'pipeline',
  });

  const { data: tableData, isPending: tableLoading } = useQuery({
    queryKey: ['applications-company-table', jobId, status, search],
    queryFn: () =>
      applications
        .getByCompany({ page: 1, limit: 50, ...(jobId ? { jobId } : {}), ...(status ? { status } : {}), ...(search ? { search } : {}) })
        .then((res) => res.data as TableResponse),
    enabled: viewMode === 'table',
  });

  const filteredPipeline = useMemo(() => {
    if (!pipelineData) return {} as PipelineResponse;
    const term = search.trim().toLowerCase();

    const out: PipelineResponse = {};
    for (const column of columns) {
      let items = getColumnItems(pipelineData, column);
      if (jobId) items = items.filter((item) => item.job?.id === jobId);
      if (term) {
        items = items.filter((item) => {
          const bag = `${item.candidate?.fullName ?? ''} ${item.job?.title ?? ''} ${item.candidate?.city ?? ''}`.toLowerCase();
          return bag.includes(term);
        });
      }
      out[column.key] = items;
    }

    return out;
  }, [pipelineData, jobId, search]);

  const tableItems = useMemo(() => {
    const source = tableData?.items ?? tableData?.applications ?? [];
    const term = search.trim().toLowerCase();

    return source.filter((item) => {
      const passStatus = status ? item.status === status : true;
      const passJob = jobId ? item.job?.id === jobId : true;
      const passSearch = term
        ? `${item.candidate?.fullName ?? ''} ${item.job?.title ?? ''} ${item.candidate?.city ?? ''}`.toLowerCase().includes(term)
        : true;
      return passStatus && passJob && passSearch;
    });
  }, [tableData, status, jobId, search]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) => applications.updateStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications-company-summary'] });
      queryClient.invalidateQueries({ queryKey: ['applications-company-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['applications-company-table'] });
      setActiveMenu(null);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => applications.addNote(id, content),
    onSuccess: () => {
      setNoteModalOpen(false);
      setNoteText('');
      setSelectedApplication(null);
    },
  });

  const createInterviewMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => interviews.create(payload),
    onSuccess: () => {
      setScheduleModalOpen(false);
      setInterviewDate('');
      setInterviewType('presencial');
      setSelectedApplication(null);
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => messages.create(payload),
    onSuccess: () => {
      setMessageModalOpen(false);
      setMessageTitle('');
      setMessageBody('');
      setSelectedApplication(null);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await applications.getExport({ ...(jobId ? { jobId } : {}), ...(status ? { status } : {}) });
      const raw = res.data;

      if (raw instanceof Blob) {
        downloadBlob(raw, 'candidatos-postulaciones.csv');
        return;
      }

      if (typeof raw === 'string') {
        downloadBlob(new Blob([raw], { type: 'text/csv;charset=utf-8' }), 'candidatos-postulaciones.csv');
        return;
      }

      const rows = Array.isArray(raw) ? raw : [];
      const csv = [
        'Candidato,Vacante,Ciudad,Estado,Fecha',
        ...rows.map((row: Record<string, unknown>) => {
          const candidate = (row.candidate as Record<string, unknown> | undefined)?.fullName ?? '';
          const job = (row.job as Record<string, unknown> | undefined)?.title ?? '';
          const city = (row.candidate as Record<string, unknown> | undefined)?.city ?? '';
          const st = String(row.status ?? '');
          const applied = String(row.appliedAt ?? row.createdAt ?? '');
          return `${candidate},${job},${city},${st},${applied}`;
        }),
      ].join('\n');

      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'candidatos-postulaciones.csv');
    },
  });

  const openAction = (action: 'note' | 'schedule' | 'message', app: PipelineApplication) => {
    setSelectedApplication(app);
    setActiveMenu(null);
    if (action === 'note') setNoteModalOpen(true);
    if (action === 'schedule') setScheduleModalOpen(true);
    if (action === 'message') {
      setMessageTitle(`Seguimiento: ${app.job?.title ?? 'Postulacion'}`);
      setMessageBody('');
      setMessageModalOpen(true);
    }
  };

  const viewToggle = (
    <div className="flex items-center rounded-xl border border-[#E6ECF5] bg-white p-1">
      <button
        type="button"
        onClick={() => setViewMode('table')}
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-semibold transition-colors',
          viewMode === 'table' ? 'bg-[#F1F5F9] text-[#0F172A]' : 'text-[#64748B] hover:text-[#334155]'
        )}
      >
        <List className="h-4 w-4" />
        Tabla
      </button>
      <button
        type="button"
        onClick={() => setViewMode('pipeline')}
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-semibold transition-colors',
          viewMode === 'pipeline' ? 'bg-[#0B5CFF] text-white' : 'text-[#64748B] hover:text-[#334155]'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Pipeline
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Candidatos / postulaciones"
        subtitle="Administra los candidatos que se han postulado a tus vacantes."
        actions={
          <>
            {viewToggle}
            <Button variant="outline" className="h-11" onClick={() => exportMutation.mutate()}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" className="h-11">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </>
        }
      />

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#334155]">Vacante</label>
            <select
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#E6ECF5] bg-white px-4 text-sm font-semibold text-[#334155] outline-none focus:border-[#0B5CFF]"
            >
              <option value="">Todas las vacantes</option>
              {companyJobs?.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#334155]">Estado</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#E6ECF5] bg-white px-4 text-sm font-semibold text-[#334155] outline-none focus:border-[#0B5CFF]"
            >
              <option value="">Todos los estados</option>
              {columns.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#334155]">Buscar</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar candidato..."
                className="h-12 w-full rounded-xl border border-[#E6ECF5] bg-white pl-11 pr-4 text-sm font-medium text-[#334155] outline-none focus:border-[#0B5CFF]"
              />
            </div>
          </div>
        </div>

        {viewMode === 'pipeline' ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((column) => {
              const items = filteredPipeline[column.key] ?? [];
              return (
                <div key={column.key} className="min-w-[270px] flex-1">
                  <Card className={cn('border-t-[4px]', column.accent)}>
                    <CardContent className="p-3">
                      <div className="mb-3 flex items-center justify-between px-2 pt-1">
                        <h3 className={cn('text-[33px] font-bold leading-8', column.accent.split(' ')[1])}>
                          <span className="text-lg font-bold">{column.label}</span>
                        </h3>
                        <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-sm font-bold text-[#64748B]">
                          {items.length}
                        </span>
                      </div>

                      {pipelineLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="h-28 animate-pulse rounded-xl bg-[#F1F5F9]" />
                          ))}
                        </div>
                      ) : items.length ? (
                        <div className="space-y-3">
                          {items.map((application) => (
                            <div key={application.id} className="rounded-xl border border-[#E6ECF5] bg-white p-3">
                              <div className="mb-3 flex items-start justify-between gap-2">
                                <Link href={`/candidates/${application.candidate.id}`} className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-[#0F172A] hover:text-[#0B5CFF]">
                                    {application.candidate.fullName}
                                  </p>
                                  <p className="truncate text-sm font-medium text-[#64748B]">{application.job.title}</p>
                                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#64748B]">
                                    <MapPin className="h-3 w-3" />
                                    {application.candidate.city || application.job.city || 'Sin ciudad'}
                                  </p>
                                </Link>

                                <div className="relative">
                                  <button
                                    type="button"
                                    className="rounded-md p-1 text-[#64748B] hover:bg-[#F8FAFC]"
                                    onClick={() => setActiveMenu(activeMenu === application.id ? null : application.id)}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>

                                  {activeMenu === application.id && (
                                    <div className="absolute right-0 top-8 z-30 w-56 rounded-xl border border-[#E6ECF5] bg-white py-1 shadow-lg">
                                      <p className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Cambiar estado</p>
                                      {columns.map((targetColumn) => (
                                        <button
                                          key={targetColumn.key}
                                          type="button"
                                          onClick={() =>
                                            updateStatusMutation.mutate({ id: application.id, nextStatus: targetColumn.key })
                                          }
                                          className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                                        >
                                          {targetColumn.label}
                                        </button>
                                      ))}
                                      <div className="my-1 border-t border-[#EEF2F7]" />
                                      <button
                                        type="button"
                                        onClick={() => openAction('note', application)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                                      >
                                        <StickyNote className="h-4 w-4" />
                                        Anadir nota
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openAction('schedule', application)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                                      >
                                        <Calendar className="h-4 w-4" />
                                        Programar entrevista
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openAction('message', application)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                        Enviar mensaje
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <p className="text-sm font-semibold text-[#64748B]">{formatDate(application.appliedAt)}</p>
                            </div>
                          ))}
                          <button type="button" className="w-full py-2 text-sm font-bold text-[#0B5CFF] hover:text-[#004BDD]">
                            + Ver mas
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#E6ECF5] py-12 text-center text-sm font-medium text-[#94A3B8]">
                          Sin candidatos
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {tableLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" />
                </div>
              ) : tableItems.length ? (
                <table className="w-full">
                  <thead className="border-b border-[#EEF2F7] bg-[#F8FAFC]">
                    <tr>
                      {['Candidato', 'Vacante', 'Estado', 'Fecha', 'Acciones'].map((head) => (
                        <th key={head} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#64748B]">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F7]">
                    {tableItems.map((application) => (
                      <tr key={application.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-5 py-4">
                          <Link href={`/candidates/${application.candidate.id}`} className="text-sm font-bold text-[#0F172A] hover:text-[#0B5CFF]">
                            {application.candidate.fullName}
                          </Link>
                          <p className="mt-0.5 text-xs text-[#64748B]">{application.candidate.city || 'Sin ciudad'}</p>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-[#334155]">{application.job.title}</td>
                        <td className="px-5 py-4">
                          <Badge variant={getStatusBadgeVariant(application.status)}>{getStatusLabel(application.status)}</Badge>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-[#64748B]">{formatDate(application.appliedAt)}</td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setActiveMenu(activeMenu === application.id ? null : application.id)}
                            className="rounded-lg border border-[#E6ECF5] p-2 text-[#64748B] hover:bg-[#F8FAFC]"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-base font-semibold text-[#0F172A]">No hay postulaciones</p>
                  <p className="mt-1 text-sm text-[#64748B]">Cuando lleguen candidatos, apareceran aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {noteModalOpen && selectedApplication && (
        <SimpleModal
          title="Anadir nota interna"
          onClose={() => {
            setNoteModalOpen(false);
            setSelectedApplication(null);
            setNoteText('');
          }}
          footer={
            <Button
              onClick={() => addNoteMutation.mutate({ id: selectedApplication.id, content: noteText })}
              disabled={!noteText.trim() || addNoteMutation.isPending}
            >
              Guardar nota
            </Button>
          }
        >
          <textarea
            rows={5}
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Escribe una nota para el equipo..."
            className="w-full rounded-xl border border-[#E6ECF5] px-3 py-2 text-sm outline-none focus:border-[#0B5CFF]"
          />
        </SimpleModal>
      )}

      {scheduleModalOpen && selectedApplication && (
        <SimpleModal
          title="Programar entrevista"
          onClose={() => {
            setScheduleModalOpen(false);
            setSelectedApplication(null);
          }}
          footer={
            <Button
              onClick={() =>
                createInterviewMutation.mutate({
                  applicationId: selectedApplication.id,
                  candidateId: selectedApplication.candidate.id,
                  jobId: selectedApplication.job.id,
                  date: interviewDate,
                  type: interviewType,
                })
              }
              disabled={!interviewDate || createInterviewMutation.isPending}
            >
              Crear entrevista
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3">
            <input
              type="datetime-local"
              value={interviewDate}
              onChange={(event) => setInterviewDate(event.target.value)}
              className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm outline-none focus:border-[#0B5CFF]"
            />
            <select
              value={interviewType}
              onChange={(event) => setInterviewType(event.target.value)}
              className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm outline-none focus:border-[#0B5CFF]"
            >
              <option value="presencial">Presencial</option>
              <option value="video">Videoentrevista</option>
            </select>
          </div>
        </SimpleModal>
      )}

      {messageModalOpen && selectedApplication && (
        <SimpleModal
          title="Enviar mensaje"
          onClose={() => {
            setMessageModalOpen(false);
            setSelectedApplication(null);
          }}
          footer={
            <Button
              onClick={() =>
                createMessageMutation.mutate({
                  applicationId: selectedApplication.id,
                  candidateId: selectedApplication.candidate.id,
                  title: messageTitle,
                  body: messageBody,
                  status: 'sent',
                })
              }
              disabled={!messageTitle.trim() || !messageBody.trim() || createMessageMutation.isPending}
            >
              Enviar
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              value={messageTitle}
              onChange={(event) => setMessageTitle(event.target.value)}
              placeholder="Asunto"
              className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm outline-none focus:border-[#0B5CFF]"
            />
            <textarea
              rows={6}
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder="Mensaje"
              className="rounded-xl border border-[#E6ECF5] px-3 py-2 text-sm outline-none focus:border-[#0B5CFF]"
            />
          </div>
        </SimpleModal>
      )}

      {summary ? <div className="hidden" aria-hidden>{JSON.stringify(summary)}</div> : null}
    </div>
  );
}

function SimpleModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
          <button type="button" className="rounded-lg px-2 py-1 text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC]" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-[#EEF2F7] px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {footer}
        </div>
      </div>
    </div>
  );
}

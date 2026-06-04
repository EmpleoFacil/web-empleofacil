'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  Ellipsis,
  History,
  Mail,
  MapPin,
  Medal,
  NotebookPen,
  Phone,
  Plus,
  Send,
  Star,
  UserRound,
  Video,
  Download,
  Eye,
  FileText,
  X,
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { applications, candidates, documents, interviews, messages } from '@/lib/api';
import { cn, formatDate, formatDateTime, getDisplayName, getStatusLabel, labelizeDocumentType, isPdfUrl } from '@/lib/utils';
import { DocumentPreviewModal } from '@/components/ui/document-preview-modal';

type Tab = 'resumen' | 'documentos' | 'historial' | 'entrevistas' | 'evaluaciones';
type NoteRecord = Record<string, unknown>;
type NoteOverride = {
  content: string;
  editedAt: string;
  editorName: string;
};
type CreatedNoteOverride = {
  authorName: string;
  createdAt: string;
};

const statusOptions = [
  { value: 'applied', label: 'Nuevo' },
  { value: 'reviewing', label: 'En revision' },
  { value: 'preselected', label: 'Preseleccionado' },
  { value: 'interview_scheduled', label: 'Entrevista' },
  { value: 'hired', label: 'Contratado' },
  { value: 'rejected', label: 'Descartado' },
];

export default function CandidateDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const applicationId = String(params.id ?? '');

  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteMenuId, setNoteMenuId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [prefillNote, setPrefillNote] = useState('');
  const [editedNoteOverrides, setEditedNoteOverrides] = useState<Record<string, NoteOverride>>({});
  const [createdNoteOverrides, setCreatedNoteOverrides] = useState<Record<string, CreatedNoteOverride>>({});
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const { data: application, isPending: applicationLoading } = useQuery({
    queryKey: ['candidate-application-detail', applicationId],
    queryFn: () => applications.getById(applicationId).then((res) => res.data as Record<string, unknown>),
    enabled: !!applicationId,
  });

  const candidateId =
    String((application?.candidateId as string | undefined) ?? (application?.candidate as { id?: string } | undefined)?.id ?? '');

  const { data: candidate, isPending: candidateLoading } = useQuery({
    queryKey: ['candidate-profile-detail', candidateId],
    queryFn: () => candidates.getById(candidateId).then((res) => res.data as Record<string, unknown>),
    enabled: !!candidateId,
  });

  const { data: docs } = useQuery({
    queryKey: ['candidate-docs', candidateId],
    queryFn: () => documents.getByCandidate(candidateId).then((res) => res.data as Array<Record<string, unknown>>),
    enabled: !!candidateId,
    select: (data) => {
      if (!Array.isArray(data)) return [];
      const sortedDocs = [...data].sort((a, b) => {
        const dateA = new Date(String(a.uploadedAt ?? a.createdAt ?? 0)).getTime();
        const dateB = new Date(String(b.uploadedAt ?? b.createdAt ?? 0)).getTime();
        return dateB - dateA;
      });
      const seenTypes = new Set<string>();
      return sortedDocs.filter((doc) => {
        const type = String(doc.type ?? 'unknown');
        if (seenTypes.has(type)) return false;
        seenTypes.add(type);
        return true;
      });
    },
  });

  const { data: candidateMessages } = useQuery({
    queryKey: ['candidate-messages', candidateId],
    queryFn: () => messages.getByCompany({ candidateId, limit: 8, page: 1 }).then((res) => res.data),
    enabled: !!candidateId,
  });

  const { data: candidateInterviews } = useQuery({
    queryKey: ['candidate-interviews', candidateId, applicationId],
    queryFn: () => interviews.getByCompany().then((res) => res.data),
    enabled: !!candidateId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => applications.updateStatus(applicationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-application-detail', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['applications-company-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['applications-company-table'] });
      setStatusMenuOpen(false);
    },
  });

  const createInterviewMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => interviews.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-interviews', candidateId, applicationId] });
      setScheduleOpen(false);
    },
  });

  const createMessageMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => messages.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-messages', candidateId] });
      setMessageOpen(false);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => applications.addNote(applicationId, content),
    onSuccess: (response) => {
      const note = response.data as Record<string, unknown> | undefined;
      const noteId = String(note?.id ?? '');
      if (noteId) {
        const authorName = user?.email ? getDisplayName(user.email) : 'Usuario';
        setCreatedNoteOverrides((current) => ({
          ...current,
          [noteId]: {
            authorName,
            createdAt: new Date().toISOString(),
          },
        }));
      }
      queryClient.invalidateQueries({ queryKey: ['candidate-application-detail', applicationId] });
      setEditingNoteId(null);
      setPrefillNote('');
      setNoteOpen(false);
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      applications.updateNote(applicationId, noteId, content),
    onSuccess: (_, { noteId, content }) => {
      const editorName = user?.email ? getDisplayName(user.email) : 'Usuario';
      setEditedNoteOverrides((current) => ({
        ...current,
        [noteId]: {
          content,
          editedAt: new Date().toISOString(),
          editorName,
        },
      }));
      queryClient.invalidateQueries({ queryKey: ['candidate-application-detail', applicationId] });
      setEditingNoteId(null);
      setPrefillNote('');
      setNoteOpen(false);
    },
    onError: () => {
      window.alert('Editar notas requiere soporte del backend para actualizar la nota existente.');
    },
  });

  const notes = useMemo(() => {
    const arr = (application?.notes as Array<NoteRecord> | undefined) ?? [];
    return Array.isArray(arr) ? arr : [];
  }, [application]);

  const currentUserName = user?.email ? getDisplayName(user.email) : 'Usuario';

  const appTimeline = useMemo(() => {
    const arr = (application?.timeline as Array<Record<string, unknown>> | undefined) ?? [];
    if (Array.isArray(arr) && arr.length) return arr;
    return [
      {
        status: 'Postulacion recibida',
        description: 'El candidato aplico a la vacante.',
        date: (application?.appliedAt as string | undefined) ?? (application?.createdAt as string | undefined),
        actor: 'Sistema',
      },
    ];
  }, [application]);

  const availabilityLabel = useMemo(() => {
    const raw = String(candidate?.availability ?? '').toLowerCase();
    if (raw === 'immediate') return 'Inmediata';
    if (raw === 'two_weeks') return 'En dos semanas';
    if (raw === 'one_month') return 'En un mes';
    if (raw === 'part_time') return 'Medio tiempo';
    return String(candidate?.availability ?? 'N/A');
  }, [candidate?.availability]);

  const messagesItems = useMemo(() => {
    if (Array.isArray(candidateMessages)) return candidateMessages;
    if (Array.isArray((candidateMessages as Record<string, unknown> | undefined)?.items)) {
      return (candidateMessages as { items: Array<Record<string, unknown>> }).items;
    }
    return [] as Array<Record<string, unknown>>;
  }, [candidateMessages]);

  const interviewsItems = useMemo(() => {
    const source = Array.isArray(candidateInterviews)
      ? candidateInterviews
      : Array.isArray((candidateInterviews as Record<string, unknown> | undefined)?.items)
      ? (candidateInterviews as { items: Array<Record<string, unknown>> }).items
      : [];

    return source.filter((interview) => {
      const iCandidateId =
        String((interview.candidate as { id?: string } | undefined)?.id ?? '') ||
        String(interview.candidateId ?? '');
      const iApplicationId =
        String((interview.application as { id?: string } | undefined)?.id ?? '') ||
        String(interview.applicationId ?? '');

      const candidateMatch = candidateId ? iCandidateId === candidateId : true;
      const applicationMatch = applicationId ? iApplicationId === applicationId : true;
      return candidateMatch || applicationMatch;
    });
  }, [candidateInterviews, candidateId, applicationId]);

  if (applicationLoading || candidateLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-8">
        <p className="text-sm font-semibold text-[#64748B]">No se encontro la postulacion.</p>
      </div>
    );
  }

  const candidateName = String((candidate?.fullName as string | undefined) ?? ((application.candidate as { fullName?: string } | undefined)?.fullName ?? 'Candidato'));
  const candidateEmail = String((candidate?.user as { email?: string } | undefined)?.email ?? (candidate?.email as string | undefined) ?? '');
  const candidatePhone = String((candidate?.phone as string | undefined) ?? '');
  const candidateCity = String((candidate?.city as string | undefined) ?? ((application.candidate as { city?: string } | undefined)?.city ?? ''));
  const jobTitle = String((application?.job as { title?: string } | undefined)?.title ?? 'Vacante');
  const applicationStatus = String((application?.status as string | undefined) ?? 'applied');

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'resumen', label: 'Resumen', icon: UserRound },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'historial', label: 'Historial', icon: History },
    { id: 'entrevistas', label: 'Entrevistas', icon: Video },
    { id: 'evaluaciones', label: 'Evaluaciones', icon: Medal },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Detalle de candidato"
        subtitle="Revisa el perfil completo y la postulacion del candidato."
        actions={
          <>
            <div className="relative">
              <Button variant="outline" className="h-11" onClick={() => setStatusMenuOpen((prev) => !prev)}>
                Cambiar estado
                <ChevronDown className="h-4 w-4" />
              </Button>
              {statusMenuOpen && (
                <div className="absolute right-0 top-12 z-40 w-52 rounded-xl border border-[#E6ECF5] bg-white py-1 shadow-lg">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateStatusMutation.mutate(option.value)}
                      className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button className="h-11" onClick={() => setScheduleOpen(true)}>
              <Calendar className="h-4 w-4" />
              Programar entrevista
            </Button>
            <Button variant="outline" className="h-11" onClick={() => setMessageOpen(true)}>
              <Send className="h-4 w-4" />
              Enviar mensaje
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-6">
        <p className="text-sm font-semibold text-[#64748B]">
          <Link href="/candidates" className="text-[#0B5CFF] hover:text-[#004BDD]">
            Candidatos
          </Link>{' '}
          › Detalle de candidato
        </p>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start gap-5">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#EAF2FF] text-3xl font-bold text-[#0B5CFF]">
                    {candidateName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-[280px] flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-[40px] font-bold leading-10 text-[#0F172A]">{candidateName}</h2>
                      <Badge variant={getStatusBadgeVariant(applicationStatus)}>{getStatusLabel(applicationStatus)}</Badge>
                    </div>
                    <p className="text-lg font-medium text-[#475569]">Postulo para: {jobTitle}</p>
                    <p className="text-sm text-[#64748B]">Postulado el: {formatDate(String(application.appliedAt ?? application.createdAt ?? ''))}</p>

                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-[#475569] md:grid-cols-3">
                      <p className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{candidateCity || 'Sin ciudad'}</p>
                      <p className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{candidatePhone || 'Sin telefono'}</p>
                      <p className="inline-flex items-center gap-1"><Mail className="h-4 w-4" />{candidateEmail || 'Sin correo'}</p>
                    </div>
                  </div>

                  <div className="grid min-w-[220px] grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <span className="text-[#64748B]">Experiencia</span>
                    <span className="font-semibold text-[#0F172A]">{String(candidate?.yearsExperience ?? 0)} años</span>
                    <span className="text-[#64748B]">Educacion</span>
                    <span className="font-semibold text-[#0F172A]">{String(candidate?.educationLevel ?? 'N/A')}</span>
                    <span className="text-[#64748B]">Salario esperado</span>
                    <span className="font-semibold text-[#0F172A]">{String(candidate?.expectedSalary ?? 'N/A')}</span>
                    <span className="text-[#64748B]">Disponibilidad</span>
                    <span className="font-semibold text-[#0F172A]">{availabilityLabel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="border-b border-[#E6ECF5]">
              <nav className="flex flex-wrap gap-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'border-b-2 pb-3 text-sm font-semibold transition-colors',
                      activeTab === tab.id ? 'border-[#0B5CFF] text-[#0B5CFF]' : 'border-transparent text-[#64748B] hover:text-[#334155]'
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === 'resumen' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardContent className="p-5">
                    <h3 className="mb-3 text-lg font-bold text-[#0F172A]">Sobre {candidateName.split(' ')[0]}</h3>
                    <p className="text-sm text-[#475569]">{String(candidate?.bio ?? 'Sin descripcion disponible.')}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {((candidate?.skills as string[] | undefined) ?? []).slice(0, 6).map((skill) => (
                        <span key={skill} className="rounded-full bg-[#EAF2FF] px-3 py-1 text-xs font-semibold text-[#0B5CFF]">{skill}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#0F172A]">Documentos</h3>
                    </div>
                    <div className="space-y-2">
                      {(docs ?? []).slice(0, 3).map((doc) => (
                        <div key={String(doc.id)} className="flex items-center justify-between rounded-lg border border-[#E6ECF5] px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#0F172A]">{labelizeDocumentType(String(doc.type ?? 'documento'))}</p>
                            <p className="text-xs text-[#64748B]">Subido el {formatDate(String(doc.uploadedAt ?? doc.createdAt ?? ''))}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="success">Verificado</Badge>
                            <button
                              type="button"
                              onClick={() => {
                                const url = String(doc.fileUrl ?? '');
                                if (url) setPreviewDoc({ url, title: labelizeDocumentType(String(doc.type ?? 'documento')) });
                              }}
                              disabled={!doc.fileUrl}
                              className="rounded border border-[#E6ECF5] p-1 hover:bg-[#F8FAFC] disabled:opacity-40"
                              title="Previsualizar"
                            >
                              <Eye className="h-4 w-4 text-[#64748B]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const url = String(doc.fileUrl ?? '');
                                if (url) window.open(url, '_blank');
                              }}
                              disabled={!doc.fileUrl}
                              className="rounded border border-[#E6ECF5] p-1 hover:bg-[#F8FAFC] disabled:opacity-40"
                              title="Descargar"
                            >
                              <Download className="h-4 w-4 text-[#64748B]" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {!docs?.length && <p className="text-sm text-[#64748B]">Sin documentos.</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardContent className="space-y-4 p-5">
                    <h3 className="text-lg font-bold text-[#0F172A]">Historial de postulación</h3>
                    {appTimeline.map((item, index) => (
                      <div key={`resumen-${String(item.date)}-${index}`} className="flex gap-3">
                        <div className="flex w-8 shrink-0 justify-center">
                          {index === 0 ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16A34A] text-white"><Star className="h-4 w-4" /></div>
                          ) : index === 1 ? (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B5CFF] text-white"><UserRound className="h-4 w-4" /></div>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#64748B] text-white"><Send className="h-4 w-4" /></div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{String(item.status ?? 'Evento')}</p>
                          <p className="text-sm text-[#475569]">{String(item.description ?? '')}</p>
                          <p className="text-xs text-[#64748B]">{formatDateTime(String(item.date ?? ''))} - {String(item.actor ?? item.user ?? 'Sistema')}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'documentos' && (
              <Card>
                <CardContent className="space-y-3 p-5">
                  {(docs ?? []).map((doc) => (
                    <div key={String(doc.id)} className="flex items-center justify-between rounded-xl border border-[#E6ECF5] p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-[#94A3B8]" />
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{labelizeDocumentType(String(doc.type ?? 'documento'))}</p>
                          <p className="text-xs text-[#64748B]">{formatDate(String(doc.uploadedAt ?? doc.createdAt ?? ''))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Verificado</Badge>
                        <button
                          type="button"
                          onClick={() => {
                            const url = String(doc.fileUrl ?? '');
                            if (url) setPreviewDoc({ url, title: labelizeDocumentType(String(doc.type ?? 'documento')) });
                          }}
                          disabled={!doc.fileUrl}
                          className="rounded border border-[#E6ECF5] p-1 hover:bg-[#F8FAFC] disabled:opacity-40"
                          title="Previsualizar"
                        >
                          <Eye className="h-4 w-4 text-[#64748B]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = String(doc.fileUrl ?? '');
                            if (url) window.open(url, '_blank');
                          }}
                          disabled={!doc.fileUrl}
                          className="rounded border border-[#E6ECF5] p-1 hover:bg-[#F8FAFC] disabled:opacity-40"
                          title="Descargar"
                        >
                          <Download className="h-4 w-4 text-[#64748B]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === 'historial' && (
              <Card>
                <CardContent className="space-y-4 p-5">
                  <h3 className="text-lg font-bold text-[#0F172A]">Historial de postulacion</h3>
                  {appTimeline.map((item, index) => (
                    <div key={`${String(item.date)}-${index}`} className="flex gap-3">
                      <div className="flex w-8 shrink-0 justify-center">
                        {index === 0 ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16A34A] text-white"><Star className="h-4 w-4" /></div>
                        ) : index === 1 ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B5CFF] text-white"><UserRound className="h-4 w-4" /></div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#64748B] text-white"><Send className="h-4 w-4" /></div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{String(item.status ?? 'Evento')}</p>
                        <p className="text-sm text-[#475569]">{String(item.description ?? '')}</p>
                        <p className="text-xs text-[#64748B]">{formatDateTime(String(item.date ?? ''))} - {String(item.actor ?? item.user ?? 'Sistema')}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === 'entrevistas' && (
              <Card>
                <CardContent className="space-y-3 p-5">
                  <h3 className="text-lg font-bold text-[#0F172A]">Entrevistas</h3>
                  {interviewsItems.length ? (
                    interviewsItems.map((interview) => (
                      <div key={String(interview.id)} className="rounded-xl border border-[#E6ECF5] p-3">
                        <p className="text-sm font-semibold text-[#0F172A]">{formatDateTime(String(interview.date ?? ''))}</p>
                        <p className="text-xs text-[#64748B]">Estado: {String(interview.status ?? '-')}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#64748B]">No hay entrevistas registradas.</p>
                  )}
                  <Button className="h-10" onClick={() => setScheduleOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Programar entrevista
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'evaluaciones' && (
              <Card>
                <CardContent className="p-5 text-sm text-[#64748B]">No hay evaluaciones registradas.</CardContent>
              </Card>
            )}
          </div>

          <div className="xl:col-span-4 space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#0F172A]">Notas internas</h3>
                  <Button variant="outline" size="sm" onClick={() => { setEditingNoteId(null); setPrefillNote(''); setNoteOpen(true); }}>
                    <Plus className="h-4 w-4" />
                    Añadir nota
                  </Button>
                </div>

                {notes.length ? (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={String(note.id)} className="rounded-xl border border-[#F3E8B5] bg-[#FFFBEA] p-3">
                        <p className="inline-flex items-start gap-2 text-sm text-[#334155]">
                          <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
                          {getNoteContent(note, editedNoteOverrides)}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-[#64748B]">
                          <p>
                            {formatNoteMeta(note, editedNoteOverrides, createdNoteOverrides, currentUserName)}
                          </p>
                          <button type="button" className="rounded border border-[#E6ECF5] p-1 text-[#64748B]" onClick={() => setNoteMenuId(noteMenuId === String(note.id) ? null : String(note.id))}>
                            <Ellipsis className="h-4 w-4" />
                          </button>
                        </div>
                        {noteMenuId === String(note.id) && (
                          <div className="mt-2 rounded-lg border border-[#E6ECF5] bg-white py-1">
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-xs font-medium text-[#334155] hover:bg-[#F8FAFC]"
                              onClick={() => {
                                setEditingNoteId(String(note.id));
                                setPrefillNote(getNoteContent(note, editedNoteOverrides));
                                setNoteOpen(true);
                                setNoteMenuId(null);
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-xs font-medium text-[#334155] hover:bg-[#F8FAFC]"
                              onClick={() => {
                                addNoteMutation.mutate(String(note.content ?? note.note ?? note.text ?? note.message ?? ''));
                                setNoteMenuId(null);
                              }}
                            >
                              Duplicar
                            </button>
                            <button
                              type="button"
                              className="block w-full px-3 py-2 text-left text-xs font-medium text-[#EF4444] hover:bg-[#FEF2F2]"
                              onClick={() => {
                                window.alert('Eliminar nota no está disponible en el backend actual.');
                                setNoteMenuId(null);
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#64748B]">Sin notas internas.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#0F172A]">Mensajes recientes</h3>
                  <Link href="/messages" className="text-sm font-bold text-[#0B5CFF] hover:text-[#004BDD]">Ver todos</Link>
                </div>

                <div className="space-y-3">
                  {messagesItems.slice(0, 4).map((msg) => (
                    <div key={String(msg.id)} className="rounded-xl border border-[#E6ECF5] p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B5CFF] text-xs font-bold text-white">
                          {String((msg.sender as { name?: string } | undefined)?.name ?? 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#0F172A]">{String(msg.title ?? msg.subject ?? 'Mensaje')}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-[#64748B]">{String(msg.body ?? '')}</p>
                          <p className="mt-2 text-xs text-[#94A3B8]">{formatDateTime(String(msg.sentAt ?? msg.createdAt ?? ''))}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!messagesItems.length && <p className="text-sm text-[#64748B]">Sin mensajes recientes.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {scheduleOpen && (
        <ScheduleInterviewModal
          applicationId={applicationId}
          onClose={() => setScheduleOpen(false)}
          onSubmit={(payload) => createInterviewMutation.mutate(payload)}
          loading={createInterviewMutation.isPending}
        />
      )}

      {messageOpen && (
        <SendMessageModal
          candidateId={candidateId}
          applicationId={applicationId}
          onClose={() => setMessageOpen(false)}
          onSubmit={(payload) => createMessageMutation.mutate(payload)}
          loading={createMessageMutation.isPending}
        />
      )}

      {noteOpen && (
        <AddNoteModal
          key={editingNoteId ?? 'new'}
          onClose={() => setNoteOpen(false)}
          onSubmit={(content) => {
            if (editingNoteId) {
              updateNoteMutation.mutate({ noteId: editingNoteId, content });
              return;
            }
            addNoteMutation.mutate(content);
          }}
          loading={addNoteMutation.isPending || updateNoteMutation.isPending}
          initialValue={prefillNote}
          title={editingNoteId ? 'Editar nota' : 'Añadir nota'}
          submitLabel={editingNoteId ? 'Guardar cambios' : 'Guardar'}
        />
      )}

      {previewDoc && (
        <DocumentPreviewModal
          url={previewDoc.url}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}

/* ── Modales ── */

function ModalShell({ title, onClose, children, maxWidth }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4">
      <div className={cn('w-full rounded-2xl bg-white', maxWidth ?? 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}


/* ── Helpers de notas ── */

function getFirstNonEmpty(values: Array<unknown>): string | null {
  const match = values.find((value) => String(value ?? '').trim());
  return match ? String(match).trim() : null;
}

function getNoteContent(note: NoteRecord, overrides: Record<string, NoteOverride>): string {
  const noteId = String(note.id ?? '');
  return overrides[noteId]?.content ?? String(note.content ?? note.note ?? note.text ?? note.message ?? 'Sin contenido');
}

function getNoteCreatedAt(note: NoteRecord): string {
  return String(note.createdAt ?? note.created_at ?? note.date ?? '');
}

function getNoteEditedAt(note: NoteRecord, overrides: Record<string, NoteOverride>): string {
  const noteId = String(note.id ?? '');
  return overrides[noteId]?.editedAt ?? String(note.editedAt ?? note.updatedAt ?? note.updated_at ?? '');
}

function getNoteAuthorName(
  note: NoteRecord,
  createdOverrides: Record<string, CreatedNoteOverride>,
  currentUserName: string
): string {
  const noteId = String(note.id ?? '');
  return (
    createdOverrides[noteId]?.authorName ??
    getFirstNonEmpty([
      (note.author as { name?: string } | undefined)?.name,
      (note.author as { email?: string } | undefined)?.email,
      (note.createdBy as { name?: string; email?: string } | undefined)?.name,
      (note.createdBy as { name?: string; email?: string } | undefined)?.email,
      (note.user as { name?: string; email?: string } | undefined)?.name,
      (note.user as { name?: string; email?: string } | undefined)?.email,
      note.authorName,
      note.createdByName,
    ]) ??
    currentUserName
  );
}

function getNoteEditorName(
  note: NoteRecord,
  overrides: Record<string, NoteOverride>,
  currentUserName: string
): string {
  const noteId = String(note.id ?? '');
  return (
    overrides[noteId]?.editorName ??
    getFirstNonEmpty([
      (note.editedBy as { name?: string; email?: string } | undefined)?.name,
      (note.editedBy as { name?: string; email?: string } | undefined)?.email,
      (note.updatedBy as { name?: string; email?: string } | undefined)?.name,
      (note.updatedBy as { name?: string; email?: string } | undefined)?.email,
      note.editedByName,
      note.updatedByName,
    ]) ??
    currentUserName
  );
}

function isEditedNote(note: NoteRecord, overrides: Record<string, NoteOverride>): boolean {
  const createdAt = getNoteCreatedAt(note);
  const editedAt = getNoteEditedAt(note, overrides);
  if (!editedAt) return false;
  if (!createdAt) return true;
  return editedAt !== createdAt;
}

function formatNoteMeta(
  note: NoteRecord,
  overrides: Record<string, NoteOverride>,
  createdOverrides: Record<string, CreatedNoteOverride>,
  currentUserName: string
): string {
  if (isEditedNote(note, overrides)) {
    return `Editada por ${getNoteEditorName(note, overrides, currentUserName)} - ${formatDateTime(getNoteEditedAt(note, overrides))}`;
  }

  const noteId = String(note.id ?? '');
  const createdAt = createdOverrides[noteId]?.createdAt ?? getNoteCreatedAt(note);
  return `${getNoteAuthorName(note, createdOverrides, currentUserName)} - ${formatDateTime(createdAt)}`;
}

/* ── Modales adicionales ── */

function ScheduleInterviewModal({
  applicationId,
  onClose,
  onSubmit,
  loading,
}: {
  applicationId: string;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const initialSchedule = getInitialInterviewSchedule();
  const [datePart, setDatePart] = useState(initialSchedule.date);
  const [timePart, setTimePart] = useState(initialSchedule.time);
  const [type, setType] = useState<'presencial' | 'virtual'>('presencial');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const scheduleValue = buildInterviewDateTime(datePart, timePart);
  const quickDates = getQuickInterviewDates();
  const quickTimes = ['09:00', '10:30', '12:00', '14:00', '16:30'];

  return (
    <ModalShell title="Programar entrevista" onClose={onClose} maxWidth="max-w-2xl">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            applicationId,
            date: scheduleValue,
            type,
            ...(type === 'presencial'
              ? { location: location.trim() }
              : { meetingUrl: meetingUrl.trim() }),
          });
        }}
      >
        <div className="rounded-2xl border border-[#E6ECF5] bg-[linear-gradient(135deg,#F8FBFF_0%,#FFFFFF_62%)] p-4">
          <p className="text-sm font-semibold text-[#0F172A]">Fecha y hora</p>
          <p className="mt-1 text-xs text-[#64748B]">Separa el día de la hora para programar más rápido y evitar errores.</p>

          <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#334155]">Día</span>
              <input
                type="date"
                value={datePart}
                min={quickDates[0]?.value}
                onChange={(event) => setDatePart(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#D9E4F2] bg-white px-4 text-sm font-medium text-[#0F172A] outline-none transition focus:border-[#0B5CFF] focus:ring-4 focus:ring-[#EAF2FF]"
                required
              />
              <div className="flex flex-wrap gap-2">
                {quickDates.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDatePart(option.value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]',
                      datePart === option.value
                        ? 'border-[#0B5CFF] bg-[#EAF2FF] text-[#0B5CFF]'
                        : 'border-[#D9E4F2] bg-white text-[#64748B] hover:border-[#BFDBFE] hover:text-[#0F172A]'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[#334155]">Hora</span>
              <input
                type="time"
                value={timePart}
                onChange={(event) => setTimePart(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#D9E4F2] bg-white px-4 text-sm font-medium text-[#0F172A] outline-none transition focus:border-[#0B5CFF] focus:ring-4 focus:ring-[#EAF2FF]"
                required
              />
              <div className="flex flex-wrap gap-2">
                {quickTimes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTimePart(option)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]',
                      timePart === option
                        ? 'border-[#0B5CFF] bg-[#EAF2FF] text-[#0B5CFF]'
                        : 'border-[#D9E4F2] bg-white text-[#64748B] hover:border-[#BFDBFE] hover:text-[#0F172A]'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] px-4 py-3 text-sm text-[#334155]">
            <span className="font-semibold text-[#0F172A]">Programación seleccionada:</span>{' '}
            {datePart && timePart ? formatDateTime(scheduleValue) : 'Completa la fecha y la hora.'}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-[#334155]">Modalidad</p>
            <p className="mt-1 text-xs text-[#64748B]">Elige cómo se realizará la entrevista.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { value: 'presencial', label: 'Presencial', hint: 'Usa una ubicación física.' },
              { value: 'virtual', label: 'Virtual', hint: 'Comparte un enlace de videollamada.' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value as 'presencial' | 'virtual')}
                className={cn(
                  'rounded-2xl border px-4 py-4 text-left transition active:scale-[0.99]',
                  type === option.value
                    ? 'border-[#0B5CFF] bg-[#EAF2FF] shadow-[0_10px_24px_rgba(11,92,255,0.08)]'
                    : 'border-[#E6ECF5] bg-white hover:border-[#BFDBFE] hover:bg-[#F8FBFF]'
                )}
              >
                <p className="text-sm font-semibold text-[#0F172A]">{option.label}</p>
                <p className="mt-1 text-xs text-[#64748B]">{option.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {type === 'presencial' ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#334155]">Ubicación</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ej. Oficina central, sala 2"
              className="h-12 w-full rounded-xl border border-[#D9E4F2] bg-white px-4 text-sm text-[#0F172A] outline-none transition focus:border-[#0B5CFF] focus:ring-4 focus:ring-[#EAF2FF]"
              required
            />
          </label>
        ) : (
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-[#334155]">Enlace</span>
            <input
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="Ej. https://meet.google.com/..."
              className="h-12 w-full rounded-xl border border-[#D9E4F2] bg-white px-4 text-sm text-[#0F172A] outline-none transition focus:border-[#0B5CFF] focus:ring-4 focus:ring-[#EAF2FF]"
              required
            />
          </label>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Programar'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function getInitialInterviewSchedule() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  const minutes = now.getMinutes();
  const roundedMinutes = minutes <= 30 ? 30 : 0;
  if (roundedMinutes === 0) {
    now.setHours(now.getHours() + 1);
  }
  now.setMinutes(roundedMinutes, 0, 0);

  return {
    date: now.toISOString().slice(0, 10),
    time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  };
}

function getQuickInterviewDates() {
  const labels = ['Hoy', 'Mañana', 'En 2 días'];
  return labels.map((label, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      label,
      value: date.toISOString().slice(0, 10),
    };
  });
}

function buildInterviewDateTime(datePart: string, timePart: string) {
  return `${datePart}T${timePart}`;
}

function SendMessageModal({
  candidateId,
  applicationId,
  onClose,
  onSubmit,
  loading,
}: {
  candidateId: string;
  applicationId: string;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const candidateAvailable = !!candidateId;

  return (
    <ModalShell title="Enviar mensaje" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!candidateId) return;
          onSubmit({ candidateId, applicationId, title, body, type: 'general_message' });
        }}
      >
        {!candidateAvailable ? (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
            No se pudo obtener el candidato para enviar este mensaje.
          </div>
        ) : null}
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Asunto" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required />
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="Mensaje" className="w-full rounded-xl border border-[#E6ECF5] px-3 py-2 text-sm" required />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading || !candidateAvailable}>{loading ? 'Enviando...' : 'Enviar'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function AddNoteModal({
  onClose,
  onSubmit,
  loading,
  initialValue = '',
  title = 'Añadir nota',
  submitLabel = 'Guardar',
}: {
  onClose: () => void;
  onSubmit: (content: string) => void;
  loading: boolean;
  initialValue?: string;
  title?: string;
  submitLabel?: string;
}) {
  const [content, setContent] = useState(initialValue);

  return (
    <ModalShell title={title} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(content);
        }}
      >
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} placeholder="Nota interna" className="w-full rounded-xl border border-[#E6ECF5] px-3 py-2 text-sm" required />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : submitLabel}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

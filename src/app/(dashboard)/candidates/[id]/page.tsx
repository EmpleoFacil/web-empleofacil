'use client';

import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { applications, candidates, documents, interviews, messages } from '@/lib/api';
import { cn, formatDate, formatDateTime, getStatusLabel } from '@/lib/utils';

type Tab = 'resumen' | 'documentos' | 'historial' | 'entrevistas' | 'evaluaciones';

const statusOptions = [
  { value: 'applied', label: 'Nuevo' },
  { value: 'reviewing', label: 'En revision' },
  { value: 'preselected', label: 'Preseleccionado' },
  { value: 'interview_scheduled', label: 'Entrevista' },
  { value: 'hired', label: 'Contratado' },
  { value: 'rejected', label: 'Descartado' },
];

function labelizeDocumentType(value: string): string {
  const map: Record<string, string> = {
    police_record: 'Récord de policía',
    cv: 'Currículum vitae',
    resume: 'Currículum vitae',
    id_front: 'Cédula frontal',
    id_back: 'Cédula reverso',
    certificate: 'Certificado',
    diploma: 'Diploma',
  };
  if (map[value]) return map[value];
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CandidateDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const applicationId = String(params.id ?? '');

  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteMenuId, setNoteMenuId] = useState<string | null>(null);
  const [prefillNote, setPrefillNote] = useState('');

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-application-detail', applicationId] });
      setNoteOpen(false);
    },
  });

  const notes = useMemo(() => {
    const arr = (application?.notes as Array<Record<string, unknown>> | undefined) ?? [];
    return Array.isArray(arr) ? arr : [];
  }, [application]);

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
                            <button type="button" className="rounded border border-[#E6ECF5] p-1"><Eye className="h-4 w-4 text-[#64748B]" /></button>
                            <button type="button" className="rounded border border-[#E6ECF5] p-1"><Download className="h-4 w-4 text-[#64748B]" /></button>
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
                        <button type="button" className="rounded border border-[#E6ECF5] p-1"><Download className="h-4 w-4 text-[#64748B]" /></button>
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
                  <Button variant="outline" size="sm" onClick={() => { setPrefillNote(''); setNoteOpen(true); }}>
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
                          {String(note.content ?? note.note ?? note.text ?? note.message ?? 'Sin contenido')}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-[#64748B]">
                          <p>
                            {(() => {
                              const authorCandidates = [
                                (note.author as { name?: string } | undefined)?.name,
                                (note.createdBy as { name?: string; email?: string } | undefined)?.name,
                                (note.createdBy as { name?: string; email?: string } | undefined)?.email,
                                (note.user as { name?: string; email?: string } | undefined)?.name,
                                (note.user as { name?: string; email?: string } | undefined)?.email,
                                String(note.authorName ?? note.createdByName ?? ''),
                              ];
                              const author = authorCandidates.find((v) => String(v ?? '').trim()) || 'Equipo';
                              return author;
                            })()}{' '}
                            - {formatDateTime(String(note.createdAt ?? note.created_at ?? note.date ?? ''))}
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
                                setPrefillNote(String(note.content ?? note.note ?? note.text ?? note.message ?? ''));
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
          candidateId={candidateId}
          jobId={String((application.job as { id?: string } | undefined)?.id ?? '')}
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
          onClose={() => setNoteOpen(false)}
          onSubmit={(content) => addNoteMutation.mutate(content)}
          loading={addNoteMutation.isPending}
          initialValue={prefillNote}
        />
      )}
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

function ScheduleInterviewModal({
  applicationId,
  candidateId,
  jobId,
  onClose,
  onSubmit,
  loading,
}: {
  applicationId: string;
  candidateId: string;
  jobId: string;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [date, setDate] = useState('');
  const [type, setType] = useState('presencial');
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');

  return (
    <ModalShell title="Programar entrevista" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ applicationId, candidateId, jobId, date, type, location, meetingUrl });
        }}
      >
        <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required />
        <select value={type} onChange={(event) => setType(event.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm">
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
        </select>
        {type === 'presencial' ? (
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ubicacion" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
        ) : (
          <input value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="Enlace" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Programar'}</Button>
        </div>
      </form>
    </ModalShell>
  );
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

function AddNoteModal({ onClose, onSubmit, loading, initialValue = '' }: { onClose: () => void; onSubmit: (content: string) => void; loading: boolean; initialValue?: string }) {
  const [content, setContent] = useState(initialValue);

  return (
    <ModalShell title="Añadir nota" onClose={onClose}>
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
          <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

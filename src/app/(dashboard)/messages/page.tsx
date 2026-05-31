'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronDown,
  Filter,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';

type MessageStatus = 'sent' | 'responded' | 'read' | 'draft' | string;

type CompanyMessage = {
  id: string;
  title: string;
  body: string;
  type?: string | null;
  status: MessageStatus;
  sentAt?: string | null;
  createdAt?: string;
  candidate: { id: string; fullName: string; email?: string | null };
  applicationId?: string | null;
  application?: { id?: string; job?: { id?: string; title?: string | null; city?: string | null } };
  responses?: { id: string; body: string; responseType?: string; createdAt: string }[];
};

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  type?: string;
};

type ApplicationOption = {
  id: string;
  candidate: { id: string; fullName: string };
  job: { id: string; title: string };
};

const statusTabs = [
  { id: 'all', label: 'Todos' },
  { id: 'sent', label: 'Pendientes' },
  { id: 'responded', label: 'Respondidos' },
  { id: 'read', label: 'Enviados' },
  { id: 'draft', label: 'Borradores' },
];

const statusTone: Record<string, string> = {
  sent: 'bg-[#FFF5E6] text-[#D97706]',
  responded: 'bg-[#EAF8EF] text-emerald-700',
  read: 'bg-[#EAF2FF] text-[#0B5CFF]',
  draft: 'bg-[#F1F5F9] text-[#334155]',
};

const statusLabel: Record<string, string> = {
  sent: 'Pendiente',
  responded: 'Respondido',
  read: 'Enviado',
  draft: 'Borrador',
};

const typeLabel: Record<string, string> = {
  interview_invitation: 'Invitacion a entrevista',
  document_request: 'Solicitud de documentos',
  status_update: 'Actualizacion de postulacion',
  interview_reminder: 'Recordatorio de entrevista',
  thank_you_note: 'Agradecimiento',
  general_message: 'Mensaje general',
};

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [seedMessage, setSeedMessage] = useState<Partial<NewMessageSeed>>({});

  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages-company'],
    queryFn: () => api.get('/messages/company').then((res) => res.data),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['message-templates'],
    queryFn: () => api.get('/messages/templates').then((res) => res.data),
  });

  const { data: applicationsData } = useQuery({
    queryKey: ['applications-for-messages'],
    queryFn: () => api.get('/applications/company', { params: { page: 1, limit: 300 } }).then((res) => res.data),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/messages/${id}/resend`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages-company'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/messages/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages-company'] }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/messages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages-company'] });
      setShowNewModal(false);
      setSeedMessage({});
    },
  });

  const allMessages = useMemo<CompanyMessage[]>(() => {
    if (Array.isArray(messagesData)) return messagesData;
    if (Array.isArray(messagesData?.items)) return messagesData.items;
    return [];
  }, [messagesData]);

  const templates = useMemo<Template[]>(() => {
    if (Array.isArray(templatesData)) return templatesData;
    if (Array.isArray(templatesData?.items)) return templatesData.items;
    return [];
  }, [templatesData]);

  const applicationOptions = useMemo<ApplicationOption[]>(() => {
    const items = Array.isArray(applicationsData?.applications)
      ? applicationsData.applications
      : Array.isArray(applicationsData)
      ? applicationsData
      : [];

    return items
      .filter((app: ApplicationOption) => app?.id && app?.candidate?.id && app?.job?.id)
      .map((app: ApplicationOption) => ({
        id: app.id,
        candidate: { id: app.candidate.id, fullName: app.candidate.fullName },
        job: { id: app.job.id, title: app.job.title },
      }));
  }, [applicationsData]);

  const counts = useMemo(() => {
    return {
      all: allMessages.length,
      sent: allMessages.filter((m) => m.status === 'sent').length,
      responded: allMessages.filter((m) => m.status === 'responded').length,
      read: allMessages.filter((m) => m.status === 'read').length,
      draft: allMessages.filter((m) => m.status === 'draft').length,
    };
  }, [allMessages]);

  const filteredMessages = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allMessages.filter((message) => {
      const matchesStatus = activeTab === 'all' ? true : message.status === activeTab;
      if (!matchesStatus) return false;

      if (!term) return true;
      const haystack = [
        message.candidate?.fullName,
        message.candidate?.email,
        message.title,
        message.body,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [allMessages, activeTab, search]);

  const effectiveSelectedMessageId =
    selectedMessageId && filteredMessages.some((m) => m.id === selectedMessageId)
      ? selectedMessageId
      : filteredMessages[0]?.id || null;

  const selectedMessage = useMemo(
    () => filteredMessages.find((m) => m.id === effectiveSelectedMessageId) || null,
    [filteredMessages, effectiveSelectedMessageId]
  );

  const openReplyComposer = () => {
    if (!selectedMessage) return;

    setSeedMessage({
      candidateId: selectedMessage.candidate.id,
      applicationId: selectedMessage.applicationId || selectedMessage.application?.id || '',
      title: `Re: ${selectedMessage.title}`,
    });
    setShowNewModal(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Mensajes"
        subtitle="Comunícate de manera estructurada con los candidatos y gestiona todas tus comunicaciones."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowTemplates(true)}>
              Plantillas de mensaje
            </Button>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4" />
              Nuevo mensaje
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {statusTabs.map((tab) => {
              const count = counts[tab.id as keyof typeof counts] || 0;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-blue-300 bg-[#EAF2FF] text-[#0B5CFF]'
                      : 'border-[#E6ECF5] bg-white text-[#475569] hover:bg-[#F1F5F9]'
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-xs', isActive ? 'bg-[#EAF2FF] text-[#0B5CFF]' : 'bg-[#F1F5F9] text-[#64748B]')}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-4">
            <CardHeader className="flex-col items-stretch gap-3 border-b border-[#EEF2F7]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar mensaje o candidato..."
                  className="h-10 w-full rounded-lg border border-[#E6ECF5] bg-white pl-9 pr-3 text-sm text-[#334155] placeholder:text-[#94A3B8] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                />
              </div>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#E6ECF5] bg-white px-3 text-sm font-medium text-[#475569] hover:bg-[#F1F5F9]">
                <Filter className="h-4 w-4" />
                Filtros
              </button>
            </CardHeader>

            <CardContent className="max-h-[650px] overflow-y-auto p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : filteredMessages.length ? (
                <div className="divide-y divide-[#EEF2F7]">
                  {filteredMessages.map((message) => {
                    const selected = message.id === effectiveSelectedMessageId;
                    const tone = statusTone[message.status] || 'bg-[#F1F5F9] text-[#334155]';
                    const when = message.sentAt || message.createdAt || '';

                    return (
                      <button
                        key={message.id}
                        onClick={() => setSelectedMessageId(message.id)}
                        className={cn(
                          'w-full border-l-2 px-4 py-3 text-left transition-colors',
                          selected ? 'border-l-blue-600 bg-[#EAF2FF]/70' : 'border-l-transparent hover:bg-[#F8FAFC]'
                        )}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6ECF5] text-xs font-semibold text-[#334155]">
                              {message.candidate?.fullName?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#0F172A]">{message.candidate?.fullName || 'Candidato'}</p>
                              <p className="truncate text-xs text-[#64748B]">{message.application?.job?.title || 'Sin vacante vinculada'}</p>
                            </div>
                          </div>
                          <p className="shrink-0 text-[11px] text-[#94A3B8]">{when ? formatDateTime(when) : ''}</p>
                        </div>

                        <p className="truncate text-sm font-medium text-[#1E293B]">{message.title}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="line-clamp-1 text-xs text-[#64748B]">{message.body}</p>
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', tone)}>
                            {statusLabel[message.status] || message.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-14 text-center">
                  <Mail className="mx-auto h-10 w-10 text-[#CBD5E1]" />
                  <p className="mt-3 text-sm text-[#64748B]">No hay mensajes para este filtro.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-5">
            {selectedMessage ? (
              <>
                <CardHeader>
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2FF] px-2 py-1 text-[11px] font-semibold text-[#0B5CFF]">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {typeLabel[selectedMessage.type || 'general_message'] || 'Mensaje'}
                      </span>
                      <span className={cn('rounded-full px-2 py-1 text-[11px] font-semibold', statusTone[selectedMessage.status] || 'bg-[#F1F5F9] text-[#334155]')}>
                        {statusLabel[selectedMessage.status] || selectedMessage.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8]">{formatDateTime(selectedMessage.sentAt || selectedMessage.createdAt || new Date().toISOString())}</p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6ECF5] text-sm font-semibold text-[#334155]">
                      {selectedMessage.candidate?.fullName?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">{selectedMessage.candidate?.fullName || 'Candidato'}</p>
                      <p className="truncate text-xs text-[#64748B]">{selectedMessage.application?.job?.title || 'Sin vacante vinculada'}</p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-[#E6ECF5] bg-white p-4">
                    <p className="text-xs text-[#94A3B8]">
                      Para: {selectedMessage.candidate?.email || selectedMessage.candidate?.fullName || 'Candidato'}
                    </p>
                    <h3 className="text-lg font-semibold text-[#0F172A]">{selectedMessage.title}</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#334155]">{selectedMessage.body}</p>
                  </div>

                  {selectedMessage.responses?.length ? (
                    <div className="space-y-3 rounded-lg border border-[#B8E6C8] bg-emerald-50/60 p-4">
                      <p className="text-sm font-semibold text-[#15803D]">Respuestas del candidato</p>
                      {selectedMessage.responses.map((response) => (
                        <div key={response.id} className="rounded-md border border-[#B8E6C8] bg-white p-3">
                          <p className="text-sm text-[#334155]">{response.body}</p>
                          <p className="mt-1 text-[11px] text-[#94A3B8]">{formatDateTime(response.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-[#DCEBFF] bg-[#EAF2FF]/70 p-3 text-sm text-[#475569]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0B5CFF]">Nota interna</p>
                    <p className="mt-1">Mantener seguimiento en maximo 24 horas para mejorar conversion de respuesta.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-[#EEF2F7] pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendMutation.mutate(selectedMessage.id)}
                      disabled={resendMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reenviar
                    </Button>

                    <StatusMenu
                      currentStatus={selectedMessage.status}
                      onChange={(nextStatus) => updateStatusMutation.mutate({ id: selectedMessage.id, status: nextStatus })}
                      disabled={updateStatusMutation.isPending}
                    />

                    <Button size="sm" onClick={openReplyComposer}>
                      <Send className="h-4 w-4" />
                      Responder al candidato
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex h-full min-h-[500px] items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-[#CBD5E1]" />
                  <p className="mt-3 text-sm text-[#64748B]">Selecciona un mensaje para ver el detalle.</p>
                </div>
              </CardContent>
            )}
          </Card>

          <div className="space-y-4 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plantillas de mensaje</CardTitle>
                <button onClick={() => setShowTemplates(true)} className="text-sm font-semibold text-[#0B5CFF] hover:text-[#0B5CFF]">
                  Ver todas
                </button>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {templates.slice(0, 5).map((template) => (
                  <div key={template.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E6ECF5] bg-[#F8FAFC] p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">{template.name}</p>
                      <p className="truncate text-xs text-[#64748B]">{template.subject}</p>
                    </div>
                    <button className="rounded-md border border-[#DCEBFF] bg-white px-2 py-1 text-xs font-semibold text-[#0B5CFF] hover:bg-[#EAF2FF]">
                      Usar
                    </button>
                  </div>
                ))}

                {!templates.length && <p className="text-sm text-[#64748B]">No hay plantillas disponibles.</p>}

                <button
                  onClick={() => setShowTemplates(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#E6ECF5] bg-white px-3 py-2 text-sm font-medium text-[#475569] hover:bg-[#F1F5F9]"
                >
                  <Plus className="h-4 w-4" />
                  Nueva plantilla
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consejos de comunicacion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4">
                {[
                  'Se claro y conciso en tus mensajes.',
                  'Personaliza el mensaje con el nombre del candidato.',
                  'Indica los proximos pasos y tiempos estimados.',
                  'Usa plantillas para mantener consistencia.',
                ].map((tip) => (
                  <p key={tip} className="flex items-start gap-2 text-sm text-[#475569]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {tip}
                  </p>
                ))}
                <button className="pt-1 text-sm font-semibold text-[#0B5CFF] hover:text-[#0B5CFF]">Ver guia completa</button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showNewModal && (
        <NewMessageModal
          templates={templates}
          applications={applicationOptions}
          initial={seedMessage}
          onClose={() => {
            setShowNewModal(false);
            setSeedMessage({});
          }}
          onSubmit={(payload) => sendMessageMutation.mutate(payload)}
          isLoading={sendMessageMutation.isPending}
        />
      )}

      {showTemplates && <TemplatesDrawer templates={templates} onClose={() => setShowTemplates(false)} />}
    </div>
  );
}

type NewMessageSeed = {
  candidateId: string;
  applicationId: string;
  title: string;
};

function StatusMenu({
  currentStatus,
  onChange,
  disabled,
}: {
  currentStatus: string;
  onChange: (status: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#E6ECF5] bg-white px-3 text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9] disabled:opacity-50"
      >
        Cambiar estado
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-20 min-w-[160px] rounded-lg border border-[#E6ECF5] bg-white py-1 shadow-lg">
          {['sent', 'responded', 'read', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => {
                onChange(status);
                setOpen(false);
              }}
              className={cn(
                'block w-full px-3 py-2 text-left text-xs font-medium hover:bg-[#F8FAFC]',
                currentStatus === status ? 'text-[#0B5CFF]' : 'text-[#475569]'
              )}
            >
              {statusLabel[status] || status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewMessageModal({
  templates,
  applications,
  initial,
  onClose,
  onSubmit,
  isLoading,
}: {
  templates: Template[];
  applications: ApplicationOption[];
  initial?: Partial<NewMessageSeed>;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}) {
  const [selectedApplicationId, setSelectedApplicationId] = useState(initial?.applicationId || '');
  const [form, setForm] = useState({
    candidateId: initial?.candidateId || '',
    applicationId: initial?.applicationId || '',
    type: 'general_message',
    title: initial?.title || '',
    body: '',
  });

  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    setForm((prev) => ({
      ...prev,
      title: template.subject,
      body: template.body,
      type: template.type || prev.type,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4">
      <div className="w-full max-w-2xl rounded-[18px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E6ECF5] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Nuevo mensaje</h2>
            <p className="text-xs text-[#64748B]">Selecciona una postulacion y envia un mensaje al candidato.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-[#64748B] hover:bg-[#F1F5F9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          className="space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Postulacion</label>
              <select
                value={selectedApplicationId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedApplicationId(nextId);

                  const selected = applications.find((item) => item.id === nextId);
                  if (!selected) return;

                  setForm((prev) => ({
                    ...prev,
                    applicationId: selected.id,
                    candidateId: selected.candidate.id,
                    title: prev.title || `Seguimiento: ${selected.job.title}`,
                  }));
                }}
                className="h-10 w-full rounded-lg border border-[#D1D9E6] px-3 text-sm text-[#334155] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                required
              >
                <option value="">Selecciona una postulacion</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.candidate.fullName} - {app.job.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-10 w-full rounded-lg border border-[#D1D9E6] px-3 text-sm text-[#334155] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
              >
                <option value="general_message">General</option>
                <option value="interview_invitation">Invitacion entrevista</option>
                <option value="document_request">Solicitud documentos</option>
                <option value="status_update">Actualizacion postulacion</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#334155]">Asunto</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-10 w-full rounded-lg border border-[#D1D9E6] px-3 text-sm text-[#334155] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#334155]">Mensaje</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={7}
              className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm text-[#334155] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
              required
            />
          </div>

          {templates.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#334155]">Aplicar plantilla</label>
              <select
                onChange={(e) => applyTemplate(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#D1D9E6] px-3 text-sm text-[#334155] focus:border-[#0B5CFF] focus:outline-none focus:ring-2 focus:ring-[#EAF2FF]"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecciona una plantilla
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[#EEF2F7] pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar mensaje'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplatesDrawer({ templates, onClose }: { templates: Template[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', subject: '', body: '', type: 'general_message' });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/messages/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      setForm({ name: '', subject: '', body: '', type: 'general_message' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/messages/templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['message-templates'] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#E6ECF5] bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Plantillas de mensaje</h2>
            <p className="text-xs text-[#64748B]">Crea y administra textos reutilizables.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-[#64748B] hover:bg-[#F1F5F9]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
          >
            <p className="text-sm font-semibold text-[#0F172A]">Nueva plantilla</p>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre"
              className="h-10 w-full rounded-lg border border-[#D1D9E6] px-3 text-sm"
              required
            />
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Asunto"
              className="h-10 w-full rounded-lg border border-[#D1D9E6] px-3 text-sm"
              required
            />
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={4}
              placeholder="Contenido..."
              className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2 text-sm"
              required
            />
            <Button className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar plantilla'}
            </Button>
          </form>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#0F172A]">Plantillas existentes</p>
            {templates.length ? (
              templates.map((template) => (
                <div key={template.id} className="rounded-lg border border-[#E6ECF5] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">{template.name}</p>
                      <p className="truncate text-xs text-[#64748B]">{template.subject}</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(template.id)}
                      className="rounded-md border border-[#F5C6C6] px-2 py-1 text-xs font-semibold text-[#EF4444] hover:bg-rose-50"
                    >
                      Eliminar
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-[#475569]">{template.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#64748B]">No hay plantillas.</p>
            )}
          </div>

          <div className="rounded-lg border border-[#E6ECF5] bg-[#F8FAFC] p-3">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[#475569]">
              <Sparkles className="h-3.5 w-3.5" />
              Sugerencia
            </p>
            <p className="mt-1 text-sm text-[#475569]">
              Mantener una plantilla por etapa mejora la consistencia de comunicacion en todo el equipo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

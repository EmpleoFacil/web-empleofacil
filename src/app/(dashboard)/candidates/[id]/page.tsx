'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Calendar, Mail, MessageSquare, FileText, Clock, Star,
  MapPin, Phone, Briefcase, GraduationCap, DollarSign, CheckCircle,
  ChevronDown, Send, Plus, Download, MoreHorizontal, Eye
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, getStatusLabel, cn } from '@/lib/utils';

type TabType = 'resumen' | 'documentos' | 'historial' | 'entrevistas' | 'evaluaciones';

const statusOptions = [
  { value: 'new', label: 'Nuevo', color: 'text-[#0B5CFF]' },
  { value: 'reviewing', label: 'En revisión', color: 'text-[#F59E0B]' },
  { value: 'shortlisted', label: 'Preseleccionado', color: 'text-[#A855F7]' },
  { value: 'interview', label: 'Entrevista', color: 'text-[#4F46E5]' },
  { value: 'hired', label: 'Contratado', color: 'text-[#16A34A]' },
  { value: 'rejected', label: 'Descartado', color: 'text-[#EF4444]' },
];

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const applicationId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  const { data: application, isLoading } = useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => api.get(`/applications/${applicationId}`).then(res => res.data),
  });

  const { data: documents } = useQuery({
    queryKey: ['candidate-documents', application?.candidateId],
    queryFn: () => api.get(`/documents/candidate/${application?.candidateId}`).then(res => res.data),
    enabled: !!application?.candidateId,
  });

  const { data: messages } = useQuery({
    queryKey: ['candidate-messages', application?.candidateId],
    queryFn: () => api.get('/messages/company', { params: { candidateId: application?.candidateId } }).then(res => res.data),
    enabled: !!application?.candidateId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/applications/${applicationId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setShowStatusMenu(false);
    },
  });

  const createInterviewMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      const { modality, ...rest } = data as Record<string, unknown>;
      return api.post('/interviews', { ...rest, type: modality });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setShowInterviewModal(false);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/messages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-messages'] });
      setShowMessageModal(false);
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => api.post(`/applications/${applicationId}/notes`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setShowNoteModal(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const candidate = application?.candidate;
  const job = application?.job;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'historial', label: 'Historial' },
    { id: 'entrevistas', label: 'Entrevistas' },
    { id: 'evaluaciones', label: 'Evaluaciones' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Detalle de candidato" subtitle="Revisa el perfil completo y la postulación del candidato." />

      <div className="p-6">
        {/* Breadcrumb & Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/candidates" className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#334155]">
            <ArrowLeft className="h-4 w-4" />
            Candidatos
          </Link>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Button variant="outline" onClick={() => setShowStatusMenu(!showStatusMenu)}>
                Cambiar estado
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              {showStatusMenu && (
                <div className="absolute right-0 top-12 z-10 w-48 rounded-lg border border-[#E6ECF5] bg-white shadow-lg py-1">
                  {statusOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateStatusMutation.mutate(opt.value)}
                      className={cn('flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-[#F1F5F9]', opt.color)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={() => setShowInterviewModal(true)}>
              <Calendar className="h-4 w-4 mr-2" />
              Programar entrevista
            </Button>
            <Button variant="outline" onClick={() => setShowMessageModal(true)}>
              <Send className="h-4 w-4 mr-2" />
              Enviar mensaje
            </Button>
          </div>
        </div>

        {/* Candidate Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="h-20 w-20 rounded-full bg-[#EAF2FF] flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-[#0B5CFF]">{candidate?.fullName?.charAt(0)}</span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-[#0F172A]">{candidate?.fullName}</h2>
                  <Badge variant={getStatusBadgeVariant(application?.status)}>
                    {getStatusLabel(application?.status)}
                  </Badge>
                </div>
                <p className="text-[#475569] mb-1">Postuló para: <span className="font-medium">{job?.title}</span></p>
                <p className="text-sm text-[#64748B]">Postulado el: {formatDate(application?.appliedAt)}</p>

                <div className="flex items-center gap-6 mt-4 text-sm text-[#64748B]">
                  {candidate?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {candidate.city}
                    </span>
                  )}
                  {candidate?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {candidate.phone}
                    </span>
                  )}
                  {candidate?.user?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {candidate.user.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right space-y-2">
                <div className="text-sm text-[#64748B]">Experiencia</div>
                <div className="font-semibold">{candidate?.yearsExperience || 0} años</div>
                <div className="text-sm text-[#64748B] mt-4">Educación</div>
                <div className="font-semibold">{candidate?.educationLevel || 'N/A'}</div>
                <div className="text-sm text-[#64748B] mt-4">Salario esperado</div>
                <div className="font-semibold">C$ {candidate?.expectedSalary?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="border-b border-[#E6ECF5] mb-6">
          <nav className="flex gap-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'pb-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-600 text-[#0B5CFF]'
                    : 'border-transparent text-[#64748B] hover:text-[#334155]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'resumen' && (
              <>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Sobre {candidate?.fullName?.split(' ')[0]}</h3>
                    <p className="text-[#475569]">{candidate?.bio || 'Sin descripción disponible.'}</p>

                    {candidate?.skills && candidate.skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {candidate.skills.map((skill: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-[#EAF2FF] text-[#0B5CFF] rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#0F172A]">Documentos</h3>
                      <Link href="#" className="text-sm text-[#0B5CFF] hover:underline">Ver todos</Link>
                    </div>
                    <div className="space-y-3">
                      {documents?.slice(0, 3).map((doc: { id: string; type: string; status: string; uploadedAt: string }) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-[#94A3B8]" />
                            <div>
                              <p className="font-medium text-[#0F172A]">{doc.type}</p>
                              <p className="text-xs text-[#64748B]">Subido el {formatDate(doc.uploadedAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}>
                              {doc.status === 'approved' ? 'Verificado' : doc.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </Badge>
                            <button className="p-1 hover:bg-[#E6ECF5] rounded"><Eye className="h-4 w-4 text-[#64748B]" /></button>
                            <button className="p-1 hover:bg-[#E6ECF5] rounded"><Download className="h-4 w-4 text-[#64748B]" /></button>
                          </div>
                        </div>
                      )) || <p className="text-[#64748B] text-sm">Sin documentos</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Historial de postulación</h3>
                    <div className="space-y-4">
                      {application?.timeline?.map((event: { status: string; date: string; user?: string; description?: string }, i: number) => (
                        <div key={i} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'h-3 w-3 rounded-full',
                              i === 0 ? 'bg-green-500' : 'bg-gray-300'
                            )} />
                            {i < (application.timeline?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-gray-200" />}
                          </div>
                          <div className="pb-4">
                            <p className="font-medium text-[#0F172A]">{event.status}</p>
                            <p className="text-sm text-[#64748B]">{event.description}</p>
                            <p className="text-xs text-[#94A3B8] mt-1">{formatDate(event.date)} - {event.user}</p>
                          </div>
                        </div>
                      )) || (
                        <div className="flex gap-4">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <div>
                            <p className="font-medium text-[#0F172A]">Postulación recibida</p>
                            <p className="text-xs text-[#94A3B8]">{formatDate(application?.appliedAt)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'documentos' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Documentos del candidato</h3>
                  <div className="space-y-3">
                    {documents?.map((doc: { id: string; type: string; status: string; uploadedAt: string; fileUrl?: string }) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border border-[#E6ECF5] rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-6 w-6 text-[#94A3B8]" />
                          <div>
                            <p className="font-medium text-[#0F172A]">{doc.type}</p>
                            <p className="text-sm text-[#64748B]">Subido el {formatDate(doc.uploadedAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}>
                            {doc.status === 'approved' ? 'Verificado' : doc.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )) || <p className="text-[#64748B]">No hay documentos disponibles</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'historial' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Historial completo</h3>
                  <p className="text-[#64748B]">Historial de cambios y actividad del candidato.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === 'entrevistas' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Entrevistas programadas</h3>
                  <p className="text-[#64748B]">No hay entrevistas programadas para este candidato.</p>
                  <Button className="mt-4" onClick={() => setShowInterviewModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Programar entrevista
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'evaluaciones' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Evaluaciones</h3>
                  <p className="text-[#64748B]">No hay evaluaciones registradas.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0F172A]">Notas internas</h3>
                  <button onClick={() => setShowNoteModal(true)} className="text-[#0B5CFF] text-sm hover:underline flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    Añadir nota
                  </button>
                </div>
                <div className="space-y-3">
                  {application?.notes?.map((note: { id: string; content: string; createdAt: string; author?: { name?: string } }) => (
                    <div key={note.id} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                      <p className="text-sm text-[#334155]">{note.content}</p>
                      <p className="text-xs text-[#64748B] mt-1">{note.author?.name} - {formatDate(note.createdAt)}</p>
                    </div>
                  )) || <p className="text-sm text-[#64748B]">Sin notas</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0F172A]">Mensajes recientes</h3>
                  <Link href="/messages" className="text-[#0B5CFF] text-sm hover:underline">Ver todos</Link>
                </div>
                <div className="space-y-3">
                  {messages?.slice(0, 3).map((msg: { id: string; title: string; body: string; sentAt: string; status: string }) => (
                    <div key={msg.id} className="p-3 bg-[#F8FAFC] rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm text-[#0F172A]">{msg.title}</p>
                        <Badge variant={msg.status === 'responded' ? 'success' : 'default'} className="text-xs">
                          {msg.status === 'responded' ? 'Respondido' : 'Enviado'}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#64748B] line-clamp-2">{msg.body}</p>
                      <p className="text-xs text-[#94A3B8] mt-1">{formatDate(msg.sentAt)}</p>
                    </div>
                  )) || <p className="text-sm text-[#64748B]">Sin mensajes</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Interview Modal */}
      {showInterviewModal && (
        <Modal title="Programar entrevista" onClose={() => setShowInterviewModal(false)}>
          <InterviewForm
            applicationId={applicationId}
            onSubmit={(data) => createInterviewMutation.mutate({ ...data, applicationId })}
            isLoading={createInterviewMutation.isPending}
          />
        </Modal>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <Modal title="Enviar mensaje" onClose={() => setShowMessageModal(false)}>
          <MessageForm
            candidateId={application?.candidateId}
            applicationId={applicationId}
            onSubmit={(data) => sendMessageMutation.mutate({ ...data, candidateId: application?.candidateId, applicationId })}
            isLoading={sendMessageMutation.isPending}
          />
        </Modal>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <Modal title="Añadir nota" onClose={() => setShowNoteModal(false)}>
          <NoteForm
            onSubmit={(content) => addNoteMutation.mutate(content)}
            isLoading={addNoteMutation.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50">
      <div className="w-full max-w-lg rounded-[18px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E6ECF5] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569]">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function InterviewForm({ applicationId, onSubmit, isLoading }: { applicationId: string; onSubmit: (data: Record<string, unknown>) => void; isLoading: boolean }) {
  const [form, setForm] = useState({ date: '', type: 'presencial', location: '', meetingUrl: '', notesForCandidate: '' });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#334155] mb-1">Fecha y hora</label>
        <input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#334155] mb-1">Modalidad</label>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3">
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
        </select>
      </div>
      {form.type === 'presencial' ? (
        <div>
          <label className="block text-sm font-medium text-[#334155] mb-1">Ubicación</label>
          <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" placeholder="Dirección de la entrevista" />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-[#334155] mb-1">Enlace de videollamada</label>
          <input type="url" value={form.meetingUrl} onChange={e => setForm({ ...form, meetingUrl: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" placeholder="https://meet.google.com/..." />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-[#334155] mb-1">Notas para el candidato</label>
        <textarea value={form.notesForCandidate} onChange={e => setForm({ ...form, notesForCandidate: e.target.value })} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2" rows={3} placeholder="Instrucciones adicionales..." />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Programar'}</Button>
      </div>
    </form>
  );
}

function MessageForm({ candidateId, applicationId, onSubmit, isLoading }: { candidateId: string; applicationId: string; onSubmit: (data: Record<string, unknown>) => void; isLoading: boolean }) {
  const [form, setForm] = useState({ title: '', body: '', type: 'general' });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#334155] mb-1">Asunto</label>
        <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#334155] mb-1">Mensaje</label>
        <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2" rows={5} required />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Enviando...' : 'Enviar mensaje'}</Button>
      </div>
    </form>
  );
}

function NoteForm({ onSubmit, isLoading }: { onSubmit: (content: string) => void; isLoading: boolean }) {
  const [content, setContent] = useState('');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(content); }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#334155] mb-1">Nota</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2" rows={4} placeholder="Escribe una nota interna..." required />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar nota'}</Button>
      </div>
    </form>
  );
}

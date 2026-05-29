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
  { value: 'new', label: 'Nuevo', color: 'text-blue-600' },
  { value: 'reviewing', label: 'En revisión', color: 'text-yellow-600' },
  { value: 'shortlisted', label: 'Preseleccionado', color: 'text-purple-600' },
  { value: 'interview', label: 'Entrevista', color: 'text-indigo-600' },
  { value: 'hired', label: 'Contratado', color: 'text-green-600' },
  { value: 'rejected', label: 'Descartado', color: 'text-red-600' },
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
    mutationFn: (data: Record<string, unknown>) => api.post('/interviews', data),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      <Header title="Detalle de candidato" subtitle="Revisa el perfil completo y la postulación del candidato." />

      <div className="p-6">
        {/* Breadcrumb & Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/candidates" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
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
                <div className="absolute right-0 top-12 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                  {statusOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateStatusMutation.mutate(opt.value)}
                      className={cn('flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100', opt.color)}
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
              <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-blue-600">{candidate?.fullName?.charAt(0)}</span>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{candidate?.fullName}</h2>
                  <Badge variant={getStatusBadgeVariant(application?.status)}>
                    {getStatusLabel(application?.status)}
                  </Badge>
                </div>
                <p className="text-gray-600 mb-1">Postuló para: <span className="font-medium">{job?.title}</span></p>
                <p className="text-sm text-gray-500">Postulado el: {formatDate(application?.appliedAt)}</p>

                <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
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
                <div className="text-sm text-gray-500">Experiencia</div>
                <div className="font-semibold">{candidate?.yearsExperience || 0} años</div>
                <div className="text-sm text-gray-500 mt-4">Educación</div>
                <div className="font-semibold">{candidate?.educationLevel || 'N/A'}</div>
                <div className="text-sm text-gray-500 mt-4">Salario esperado</div>
                <div className="font-semibold">C$ {candidate?.expectedSalary?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'pb-4 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sobre {candidate?.fullName?.split(' ')[0]}</h3>
                    <p className="text-gray-600">{candidate?.bio || 'Sin descripción disponible.'}</p>

                    {candidate?.skills && candidate.skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {candidate.skills.map((skill: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
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
                      <h3 className="text-lg font-semibold text-gray-900">Documentos</h3>
                      <Link href="#" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
                    </div>
                    <div className="space-y-3">
                      {documents?.slice(0, 3).map((doc: { id: string; type: string; status: string; uploadedAt: string }) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{doc.type}</p>
                              <p className="text-xs text-gray-500">Subido el {formatDate(doc.uploadedAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}>
                              {doc.status === 'approved' ? 'Verificado' : doc.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </Badge>
                            <button className="p-1 hover:bg-gray-200 rounded"><Eye className="h-4 w-4 text-gray-500" /></button>
                            <button className="p-1 hover:bg-gray-200 rounded"><Download className="h-4 w-4 text-gray-500" /></button>
                          </div>
                        </div>
                      )) || <p className="text-gray-500 text-sm">Sin documentos</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de postulación</h3>
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
                            <p className="font-medium text-gray-900">{event.status}</p>
                            <p className="text-sm text-gray-500">{event.description}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(event.date)} - {event.user}</p>
                          </div>
                        </div>
                      )) || (
                        <div className="flex gap-4">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <div>
                            <p className="font-medium text-gray-900">Postulación recibida</p>
                            <p className="text-xs text-gray-400">{formatDate(application?.appliedAt)}</p>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentos del candidato</h3>
                  <div className="space-y-3">
                    {documents?.map((doc: { id: string; type: string; status: string; uploadedAt: string; fileUrl?: string }) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-6 w-6 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.type}</p>
                            <p className="text-sm text-gray-500">Subido el {formatDate(doc.uploadedAt)}</p>
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
                    )) || <p className="text-gray-500">No hay documentos disponibles</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'historial' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial completo</h3>
                  <p className="text-gray-500">Historial de cambios y actividad del candidato.</p>
                </CardContent>
              </Card>
            )}

            {activeTab === 'entrevistas' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Entrevistas programadas</h3>
                  <p className="text-gray-500">No hay entrevistas programadas para este candidato.</p>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluaciones</h3>
                  <p className="text-gray-500">No hay evaluaciones registradas.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Notas internas</h3>
                  <button onClick={() => setShowNoteModal(true)} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    Añadir nota
                  </button>
                </div>
                <div className="space-y-3">
                  {application?.notes?.map((note: { id: string; content: string; createdAt: string; author?: { name?: string } }) => (
                    <div key={note.id} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                      <p className="text-sm text-gray-700">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-1">{note.author?.name} - {formatDate(note.createdAt)}</p>
                    </div>
                  )) || <p className="text-sm text-gray-500">Sin notas</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Mensajes recientes</h3>
                  <Link href="/messages" className="text-blue-600 text-sm hover:underline">Ver todos</Link>
                </div>
                <div className="space-y-3">
                  {messages?.slice(0, 3).map((msg: { id: string; title: string; body: string; sentAt: string; status: string }) => (
                    <div key={msg.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm text-gray-900">{msg.title}</p>
                        <Badge variant={msg.status === 'responded' ? 'success' : 'secondary'} className="text-xs">
                          {msg.status === 'responded' ? 'Respondido' : 'Enviado'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{msg.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(msg.sentAt)}</p>
                    </div>
                  )) || <p className="text-sm text-gray-500">Sin mensajes</p>}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora</label>
        <input type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad</label>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3">
          <option value="presencial">Presencial</option>
          <option value="virtual">Virtual</option>
        </select>
      </div>
      {form.type === 'presencial' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
          <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" placeholder="Dirección de la entrevista" />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Enlace de videollamada</label>
          <input type="url" value={form.meetingUrl} onChange={e => setForm({ ...form, meetingUrl: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" placeholder="https://meet.google.com/..." />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas para el candidato</label>
        <textarea value={form.notesForCandidate} onChange={e => setForm({ ...form, notesForCandidate: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={3} placeholder="Instrucciones adicionales..." />
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
        <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
        <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={5} required />
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={4} placeholder="Escribe una nota interna..." required />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar nota'}</Button>
      </div>
    </form>
  );
}

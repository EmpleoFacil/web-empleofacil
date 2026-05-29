'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Search, Filter, Plus, Send, RefreshCw, MoreHorizontal,
  MessageSquare, Clock, CheckCircle, FileText, ChevronDown, X, Edit, Trash
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface Message {
  id: string;
  title: string;
  body: string;
  type: string;
  status: string;
  sentAt: string;
  readAt?: string;
  respondedAt?: string;
  candidate: { id: string; fullName: string };
  application?: { job: { title: string } };
  responses?: { id: string; body: string; responseType: string; createdAt: string }[];
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
}

const statusTabs = [
  { id: 'all', label: 'Todos' },
  { id: 'sent', label: 'Pendientes' },
  { id: 'responded', label: 'Respondidos' },
  { id: 'read', label: 'Enviados' },
  { id: 'draft', label: 'Borradores' },
];

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', activeTab, search],
    queryFn: () => api.get('/messages/company', { params: { status: activeTab !== 'all' ? activeTab : undefined, search } }).then(res => res.data),
  });

  const { data: templates } = useQuery({
    queryKey: ['message-templates'],
    queryFn: () => api.get('/messages/templates').then(res => res.data),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/messages/${id}/resend`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/messages/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/messages', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setShowNewModal(false);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded': return 'bg-green-100 text-green-700';
      case 'read': return 'bg-blue-100 text-blue-700';
      case 'sent': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'responded': return 'Respondido';
      case 'read': return 'Enviado';
      case 'sent': return 'Pendiente';
      case 'draft': return 'Borrador';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Mensajes" subtitle="Comunícate de manera estructurada con los candidatos y gestiona todas tus comunicaciones." />

      <div className="p-6">
        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                )}
              >
                {tab.label}
                {tab.id !== 'all' && messages && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                    {messages.filter((m: Message) => m.status === tab.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowTemplates(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Plantillas de mensaje
            </Button>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo mensaje
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar mensaje o candidato..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  </div>
                ) : messages?.length ? (
                  <div className="divide-y divide-gray-100">
                    {messages.map((msg: Message) => (
                      <button
                        key={msg.id}
                        onClick={() => setSelectedMessage(msg)}
                        className={cn(
                          'w-full p-4 text-left hover:bg-gray-50 transition-colors',
                          selectedMessage?.id === msg.id && 'bg-blue-50'
                        )}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-blue-600">{msg.candidate.fullName.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{msg.candidate.fullName}</p>
                              <p className="text-xs text-gray-500">{msg.application?.job?.title}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(msg.sentAt)}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-2">{msg.title}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500 line-clamp-1">{msg.body}</p>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(msg.status))}>
                            {getStatusLabel(msg.status)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Mail className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-gray-500">No hay mensajes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              {selectedMessage ? (
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(selectedMessage.status))}>
                      {getStatusLabel(selectedMessage.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-lg font-medium text-blue-600">{selectedMessage.candidate.fullName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedMessage.candidate.fullName}</p>
                      <p className="text-sm text-gray-500">{selectedMessage.application?.job?.title}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-400 mb-2">Para: {selectedMessage.candidate.fullName}</p>
                    <h3 className="font-semibold text-gray-900 mb-3">{selectedMessage.title}</h3>
                    <div className="prose prose-sm text-gray-600">
                      <p>{selectedMessage.body}</p>
                    </div>
                  </div>

                  {selectedMessage.responses && selectedMessage.responses.length > 0 && (
                    <div className="border-t border-gray-100 mt-6 pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Respuestas</p>
                      {selectedMessage.responses.map(resp => (
                        <div key={resp.id} className="bg-green-50 p-3 rounded-lg mb-2">
                          <p className="text-sm text-gray-700">{resp.body}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(resp.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
                    <Button variant="outline" size="sm" onClick={() => resendMutation.mutate(selectedMessage.id)}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reenviar
                    </Button>
                    <Button size="sm">
                      <Send className="h-4 w-4 mr-1" />
                      Responder al candidato
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-6 flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <MessageSquare className="mx-auto h-12 w-12 mb-2" />
                    <p>Selecciona un mensaje para ver el detalle</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Templates Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Plantillas de mensaje</h3>
                <button className="text-blue-600 text-sm hover:underline">Ver todas</button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {templates?.slice(0, 5).map((tpl: Template) => (
                  <div key={tpl.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{tpl.name}</p>
                      <p className="text-xs text-gray-500">{tpl.subject}</p>
                    </div>
                    <Button variant="outline" size="sm">Usar</Button>
                  </div>
                )) || <p className="text-sm text-gray-500">Sin plantillas</p>}

                <button
                  onClick={() => setShowTemplates(true)}
                  className="w-full py-2 text-blue-600 text-sm hover:underline flex items-center justify-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Nueva plantilla
                </button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardContent className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Consejos de comunicación</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    Sé claro y conciso en tus mensajes.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    Personaliza el mensaje con el nombre del candidato.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    Indica los próximos pasos y tiempos estimados.
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    Usa plantillas para mantener la consistencia.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewModal && (
        <NewMessageModal
          templates={templates}
          onClose={() => setShowNewModal(false)}
          onSubmit={(data) => sendMessageMutation.mutate(data)}
          isLoading={sendMessageMutation.isPending}
        />
      )}

      {/* Templates Drawer */}
      {showTemplates && (
        <TemplatesDrawer
          templates={templates}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}

function NewMessageModal({ templates, onClose, onSubmit, isLoading }: { templates: Template[]; onClose: () => void; onSubmit: (data: Record<string, unknown>) => void; isLoading: boolean }) {
  const [form, setForm] = useState({ candidateId: '', title: '', body: '', type: 'general' });

  const applyTemplate = (tpl: Template) => {
    setForm({ ...form, title: tpl.subject, body: tpl.body });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo mensaje</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Candidato</label>
              <input type="text" value={form.candidateId} onChange={e => setForm({ ...form, candidateId: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" placeholder="Buscar candidato..." required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={6} required />
            </div>
            {templates?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usar plantilla</label>
                <select onChange={e => { const t = templates.find((t: Template) => t.id === e.target.value); if (t) applyTemplate(t); }} className="w-full h-10 rounded-lg border border-gray-300 px-3">
                  <option value="">Seleccionar plantilla...</option>
                  {templates.map((t: Template) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Enviando...' : 'Enviar mensaje'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TemplatesDrawer({ templates, onClose }: { templates: Template[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', type: 'general' });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/messages/templates', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['message-templates'] }); setForm({ name: '', subject: '', body: '', type: 'general' }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => api.patch(`/messages/templates/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['message-templates'] }); setEditingTemplate(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/messages/templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['message-templates'] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Plantillas de mensaje</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Nueva plantilla</h3>
            <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre de la plantilla" className="w-full h-10 rounded-lg border border-gray-300 px-3" required />
              <input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Asunto" className="w-full h-10 rounded-lg border border-gray-300 px-3" required />
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Contenido del mensaje..." className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={4} required />
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Crear plantilla'}
              </Button>
            </form>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Plantillas existentes</h3>
            <div className="space-y-3">
              {templates?.map((tpl: Template) => (
                <div key={tpl.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{tpl.name}</p>
                      <p className="text-sm text-gray-500">{tpl.subject}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingTemplate(tpl)} className="p-1 hover:bg-gray-100 rounded"><Edit className="h-4 w-4 text-gray-500" /></button>
                      <button onClick={() => deleteMutation.mutate(tpl.id)} className="p-1 hover:bg-gray-100 rounded"><Trash className="h-4 w-4 text-red-500" /></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{tpl.body}</p>
                </div>
              )) || <p className="text-gray-500">No hay plantillas</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

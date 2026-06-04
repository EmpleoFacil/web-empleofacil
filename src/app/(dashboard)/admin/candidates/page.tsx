'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { candidates } from '@/lib/api';
import { cn, formatDateTime, getStatusLabel, labelizeDocumentType, formatDate } from '@/lib/utils';
import { DocumentPreviewModal } from '@/components/ui/document-preview-modal';

type CandidateRow = {
  id: string;
  fullName: string;
  city?: string | null;
  status: string;
  user?: { email?: string };
  desiredRole?: string;
  updatedAt?: string;
  createdAt?: string;
  _count?: { applications?: number; documents?: number };
};

type ListResponse = {
  candidates?: CandidateRow[];
  items?: CandidateRow[];
  total?: number;
  page?: number;
  totalPages?: number;
  pagination?: { total?: number; page?: number; pages?: number };
};

type DrawerMode = 'detail' | 'documents' | 'applications' | null;

function toArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray((payload as Record<string, unknown> | undefined)?.items)) {
    return ((payload as Record<string, unknown>).items as T[]) ?? [];
  }
  if (Array.isArray((payload as Record<string, unknown> | undefined)?.documents)) {
    return ((payload as Record<string, unknown>).documents as T[]) ?? [];
  }
  if (Array.isArray((payload as Record<string, unknown> | undefined)?.applications)) {
    return ((payload as Record<string, unknown>).applications as T[]) ?? [];
  }
  return [];
}

function downloadBlob(blob: Blob, name: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function AdminCandidatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');
  const [profile, setProfile] = useState('');
  const [page, setPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerCandidateId, setDrawerCandidateId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['admin-candidates-summary'],
    queryFn: () => candidates.getSummary().then((res) => res.data as Record<string, { value?: number; trend?: number }>),
  });

  const { data: listData, isPending } = useQuery({
    queryKey: ['admin-candidates-list', search, status, city, page],
    queryFn: () =>
      candidates
        .getList({ page, limit: 10, ...(search ? { search } : {}), ...(status ? { status } : {}), ...(city ? { city } : {}) })
        .then((res) => res.data as ListResponse),
  });

  const rawRows = useMemo(() => listData?.candidates ?? listData?.items ?? [], [listData]);

  const cityOptions = useMemo(() => {
    return Array.from(new Set(rawRows.map((row) => row.city).filter(Boolean) as string[])).sort();
  }, [rawRows]);

  const profileOptions = useMemo(() => {
    return Array.from(new Set(rawRows.map((row) => row.desiredRole).filter(Boolean) as string[])).sort();
  }, [rawRows]);

  const rows = useMemo(() => {
    if (!profile) return rawRows;
    const needle = profile.toLowerCase();
    return rawRows.filter((row) => `${row.desiredRole ?? ''}`.toLowerCase() === needle);
  }, [rawRows, profile]);

  const total = listData?.pagination?.total ?? listData?.total ?? rows.length;
  const totalPages = listData?.pagination?.pages ?? listData?.totalPages ?? 1;

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) => candidates.updateStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-candidates-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-candidates-summary'] });
      setActiveMenu(null);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await candidates.getExport({ ...(search ? { search } : {}), ...(status ? { status } : {}), ...(city ? { city } : {}) });
      const raw = res.data;
      if (raw instanceof Blob) {
        downloadBlob(raw, 'candidatos-globales.csv');
        return;
      }
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
      downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), 'candidatos-globales.csv');
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Candidatos globales"
        subtitle="Administra la base general de candidatos registrados."
        actions={
          <>
            <Button variant="outline" className="h-11">Filtros guardados</Button>
            <Button className="h-11" onClick={() => exportMutation.mutate()}>
              <Download className="h-4 w-4" />
              Exportar candidatos
            </Button>
          </>
        }
      />

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total candidatos" value={summary?.total?.value ?? 0} trend={summary?.total?.trend} period="mes anterior" icon={Users} iconBg="bg-[#EAF2FF]" iconColor="text-[#0B5CFF]" />
          <StatCard title="Perfiles completos" value={summary?.complete?.value ?? 0} trend={summary?.complete?.trend} period="mes anterior" icon={FileText} iconBg="bg-[#EAF8EF]" iconColor="text-[#16A34A]" />
          <StatCard title="Documentos pendientes" value={summary?.pendingDocs?.value ?? 0} trend={summary?.pendingDocs?.trend} period="mes anterior" icon={FileText} iconBg="bg-[#FFF5E6]" iconColor="text-[#F59E0B]" />
          <StatCard title="Candidatos activos" value={summary?.active?.value ?? 0} trend={summary?.active?.trend} period="mes anterior" icon={UserCheck} iconBg="bg-[#F5EAFE]" iconColor="text-[#A855F7]" />
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="relative xl:col-span-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por nombre, correo o perfil buscado..."
                  className="h-11 w-full rounded-xl border border-[#E6ECF5] bg-white pl-10 pr-3 text-sm"
                />
              </div>

              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm xl:col-span-2">
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="reviewing">En revisión</option>
                <option value="paused">Pausado</option>
                <option value="inactive">Inactivo</option>
              </select>

              <select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm xl:col-span-2">
                <option value="">Todas las ciudades</option>
                {cityOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>

              <select value={profile} onChange={(e) => setProfile(e.target.value)} className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm xl:col-span-2">
                <option value="">Todos los perfiles</option>
                {profileOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>

              <Button variant="outline" className="h-11 xl:col-span-2" onClick={() => { setSearch(''); setStatus(''); setCity(''); setProfile(''); setPage(1); }}>
                Limpiar
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E6ECF5]">
              <table className="w-full bg-white">
                <thead className="border-b border-[#EEF2F7] bg-[#F8FAFC]">
                  <tr>
                    {['Nombre', 'Ciudad', 'Perfil buscado', 'Estado', 'Documentos', 'Postulaciones', 'Última actividad', 'Acciones'].map((head) => (
                      <th key={head} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#64748B]">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {isPending ? (
                    <tr><td colSpan={8} className="px-4 py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" /></td></tr>
                  ) : rows.length ? (
                    rows.map((row) => {
                      const docsCount = row._count?.documents ?? 0;
                      const appsCount = row._count?.applications ?? 0;
                      const docsColor = docsCount >= 4 ? 'text-[#16A34A]' : docsCount >= 2 ? 'text-[#F59E0B]' : 'text-[#EF4444]';
                      return (
                        <tr key={row.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF2FF] text-xs font-bold text-[#0B5CFF]">{row.fullName?.charAt(0).toUpperCase()}</div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#0F172A]">{row.fullName}</p>
                                <p className="truncate text-xs text-[#64748B]">{row.user?.email || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-[#334155]">{row.city || '-'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-[#334155]">{row.desiredRole || '-'}</td>
                          <td className="px-4 py-3"><Badge variant={getStatusBadgeVariant(row.status)}>{getStatusLabel(row.status)}</Badge></td>
                          <td className={cn('px-4 py-3 text-sm font-bold', docsColor)}><span className="inline-flex items-center gap-1"><Check className="h-4 w-4" /> {docsCount} / 4</span></td>
                          <td className="px-4 py-3 text-sm font-bold text-[#0F172A]">{appsCount}</td>
                          <td className="px-4 py-3 text-sm text-[#334155]">{formatDateTime(row.updatedAt || row.createdAt || '')}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <IconBtn title="Ver detalle" onClick={() => openDrawer(row.id, 'detail', setDrawerCandidateId, setDrawerMode)}><Eye className="h-4 w-4" /></IconBtn>
                              <IconBtn title="Ver documentos" onClick={() => openDrawer(row.id, 'documents', setDrawerCandidateId, setDrawerMode)}><FileText className="h-4 w-4" /></IconBtn>
                              <IconBtn title="Ver postulaciones" onClick={() => openDrawer(row.id, 'applications', setDrawerCandidateId, setDrawerMode)}><Download className="h-4 w-4" /></IconBtn>
                              <div className="relative">
                                <IconBtn title="Más" onClick={() => setActiveMenu(activeMenu === row.id ? null : row.id)}><MoreHorizontal className="h-4 w-4" /></IconBtn>
                                {activeMenu === row.id && (
                                  <div className="absolute right-0 top-10 z-40 w-44 rounded-xl border border-[#E6ECF5] bg-white py-1 shadow-lg">
                                    <button type="button" onClick={() => updateStatusMutation.mutate({ id: row.id, nextStatus: 'active' })} className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Marcar Activo</button>
                                    <button type="button" onClick={() => updateStatusMutation.mutate({ id: row.id, nextStatus: 'reviewing' })} className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">En revisión</button>
                                    <button type="button" onClick={() => updateStatusMutation.mutate({ id: row.id, nextStatus: 'paused' })} className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Pausar</button>
                                    <button type="button" onClick={() => updateStatusMutation.mutate({ id: row.id, nextStatus: 'inactive' })} className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Inactivar</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-[#64748B]">No hay candidatos para estos filtros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#64748B]">Mostrando {rows.length ? (page - 1) * 10 + 1 : 0} a {Math.min(page * 10, total)} de {total} candidatos</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                <span className="text-sm font-bold text-[#334155]">{page}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {drawerCandidateId && drawerMode && (
        <CandidateDrawer
          candidateId={drawerCandidateId}
          mode={drawerMode}
          onClose={() => {
            setDrawerCandidateId(null);
            setDrawerMode(null);
          }}
          onPreviewDoc={setPreviewDoc}
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

function openDrawer(
  candidateId: string,
  mode: Exclude<DrawerMode, null>,
  setId: (id: string) => void,
  setMode: (mode: DrawerMode) => void
) {
  setId(candidateId);
  setMode(mode);
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]">
      {children}
    </button>
  );
}

function CandidateDrawer({
  candidateId,
  mode,
  onClose,
  onPreviewDoc,
}: {
  candidateId: string;
  mode: Exclude<DrawerMode, null>;
  onClose: () => void;
  onPreviewDoc: (doc: { url: string; title: string }) => void;
}) {
  const { data: detail, isPending: detailLoading } = useQuery({
    queryKey: ['candidate-drawer-detail', candidateId],
    queryFn: () => candidates.getById(candidateId).then((res) => res.data),
    enabled: mode === 'detail',
  });

  const { data: docsData, isPending: docsLoading } = useQuery({
    queryKey: ['candidate-drawer-docs', candidateId],
    queryFn: () => candidates.getDocuments(candidateId).then((res) => res.data),
    enabled: mode === 'documents',
  });

  const { data: appsData, isPending: appsLoading } = useQuery({
    queryKey: ['candidate-drawer-apps', candidateId],
    queryFn: () => candidates.getApplications(candidateId).then((res) => res.data),
    enabled: mode === 'applications',
  });

  const docs = useMemo(() => {
    const rawDocs = toArray<Record<string, unknown>>(docsData);
    const sortedDocs = [...rawDocs].sort((a, b) => {
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
  }, [docsData]);

  const apps = toArray<Record<string, unknown>>(appsData);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-[#0F172A]/35" onClick={onClose} aria-label="Cerrar" />
      <div className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EEF2F7] bg-white px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">
            {mode === 'detail' && 'Detalle candidato'}
            {mode === 'documents' && 'Documentos candidato'}
            {mode === 'applications' && 'Postulaciones candidato'}
          </h3>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>

        <div className="space-y-3 p-5">
          {mode === 'detail' && (
            detailLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-[#F1F5F9]" />
            ) : (
              <div className="space-y-3 rounded-xl border border-[#E6ECF5] p-4">
                <p className="text-lg font-bold text-[#0F172A]">{String((detail as Record<string, unknown>)?.fullName ?? 'Candidato')}</p>
                <p className="text-sm text-[#334155]">Correo: {String((detail as Record<string, unknown>)?.email ?? ((detail as Record<string, unknown>)?.user as Record<string, unknown> | undefined)?.email ?? '-')}</p>
                <p className="text-sm text-[#334155]">Ciudad: {String((detail as Record<string, unknown>)?.city ?? '-')}</p>
                <p className="text-sm text-[#334155]">Estado: {getStatusLabel(String((detail as Record<string, unknown>)?.status ?? ''))}</p>
                <p className="text-sm text-[#334155]">Perfil buscado: {String((detail as Record<string, unknown>)?.desiredRole ?? '-')}</p>
              </div>
            )
          )}

          {mode === 'documents' && (
            docsLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-[#F1F5F9]" />
            ) : docs.length ? (
              docs.map((doc, index) => (
                <div key={String(doc.id ?? index)} className="flex items-center justify-between rounded-xl border border-[#E6ECF5] p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[#94A3B8]" />
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {labelizeDocumentType(String(doc.type ?? doc.name ?? 'Documento'))}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Subido el {formatDate(String(doc.uploadedAt ?? doc.createdAt ?? ''))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={doc.status === 'verified' ? 'success' : 'default'}>
                      {String(doc.status ?? 'uploaded')}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => {
                        const url = String(doc.fileUrl ?? doc.url ?? '');
                        if (url) onPreviewDoc({ url, title: labelizeDocumentType(String(doc.type ?? doc.name ?? 'Documento')) });
                      }}
                      disabled={!doc.fileUrl && !doc.url}
                      className="rounded border border-[#E6ECF5] p-1.5 hover:bg-[#F8FAFC] disabled:opacity-40"
                      title="Previsualizar"
                    >
                      <Eye className="h-4 w-4 text-[#64748B]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = String(doc.fileUrl ?? doc.url ?? '');
                        if (url) window.open(url, '_blank');
                      }}
                      disabled={!doc.fileUrl && !doc.url}
                      className="rounded border border-[#E6ECF5] p-1.5 hover:bg-[#F8FAFC] disabled:opacity-40"
                      title="Descargar"
                    >
                      <Download className="h-4 w-4 text-[#64748B]" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#64748B]">Sin documentos.</p>
            )
          )}

          {mode === 'applications' && (
            appsLoading ? (
              <div className="h-24 animate-pulse rounded-xl bg-[#F1F5F9]" />
            ) : apps.length ? (
              apps.map((app, index) => (
                <div key={String(app.id ?? index)} className="rounded-xl border border-[#E6ECF5] p-3">
                  <p className="text-sm font-semibold text-[#0F172A]">{String((app.job as Record<string, unknown> | undefined)?.title ?? 'Vacante')}</p>
                  <p className="text-xs text-[#64748B]">Estado: {getStatusLabel(String(app.status ?? ''))}</p>
                  <p className="text-xs text-[#64748B]">Fecha: {formatDateTime(String(app.appliedAt ?? app.createdAt ?? ''))}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#64748B]">Sin postulaciones.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

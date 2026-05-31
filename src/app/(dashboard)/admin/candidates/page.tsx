'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Search,
  UserCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { candidates } from '@/lib/api';
import { cn, formatDateTime, getStatusLabel } from '@/lib/utils';

type CandidateRow = {
  id: string;
  fullName: string;
  city?: string | null;
  status: string;
  profileCompletion?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: { email?: string };
  _count?: {
    applications?: number;
    documents?: number;
  };
  desiredRole?: string;
};

type ListResponse = {
  candidates?: CandidateRow[];
  items?: CandidateRow[];
  total?: number;
  page?: number;
  totalPages?: number;
  pagination?: { total?: number; pages?: number; page?: number };
};

type DetailResponse = Record<string, unknown>;

type DrawerMode = 'detail' | 'documents' | 'applications' | null;

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export default function AdminCandidatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');
  const [profile, setProfile] = useState('');
  const [page, setPage] = useState(1);
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);
  const [drawerCandidateId, setDrawerCandidateId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);

  const { data: summary } = useQuery({
    queryKey: ['admin-candidates-summary'],
    queryFn: () => candidates.getSummary().then((res) => res.data as Record<string, { value?: number; trend?: number }>),
  });

  const { data: listData, isPending } = useQuery({
    queryKey: ['admin-candidates-list', search, status, city, profile, page],
    queryFn: () =>
      candidates
        .getList({ page, limit: 10, ...(search ? { search } : {}), ...(status ? { status } : {}), ...(city ? { city } : {}) })
        .then((res) => res.data as ListResponse),
  });

  const rows = useMemo(() => {
    const source = listData?.candidates ?? listData?.items ?? [];
    if (!profile) return source;
    return source.filter((row) => `${row.desiredRole ?? ''}`.toLowerCase().includes(profile.toLowerCase()));
  }, [listData, profile]);

  const total = listData?.pagination?.total ?? listData?.total ?? rows.length;
  const totalPages = listData?.pagination?.pages ?? listData?.totalPages ?? 1;

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) => candidates.updateStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-candidates-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-candidates-summary'] });
      setActiveRowMenu(null);
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

      if (typeof raw === 'string') {
        downloadBlob(new Blob([raw], { type: 'text/csv;charset=utf-8' }), 'candidatos-globales.csv');
        return;
      }

      const arr = Array.isArray(raw) ? raw : [];
      const csv = [
        'Nombre,Email,Ciudad,Estado,Postulaciones,Documentos',
        ...arr.map((row: Record<string, unknown>) => {
          const fullName = String(row.fullName ?? '');
          const email = String((row.user as Record<string, unknown> | undefined)?.email ?? '');
          const rowCity = String(row.city ?? '');
          const rowStatus = String(row.status ?? '');
          const apps = String((row._count as Record<string, unknown> | undefined)?.applications ?? 0);
          const docs = String((row._count as Record<string, unknown> | undefined)?.documents ?? 0);
          return `${fullName},${email},${rowCity},${rowStatus},${apps},${docs}`;
        }),
      ].join('\n');

      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'candidatos-globales.csv');
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Candidatos globales"
        subtitle="Administra la base general de candidatos registrados."
        actions={
          <>
            <Button variant="outline" className="h-11">
              <Filter className="h-4 w-4" />
              Filtros guardados
            </Button>
            <Button className="h-11" onClick={() => exportMutation.mutate()}>
              <Download className="h-4 w-4" />
              Exportar candidatos
              <ChevronDown className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total candidatos"
            value={summary?.total?.value ?? 0}
            trend={summary?.total?.trend}
            period="mes anterior"
            icon={Users}
            iconBg="bg-[#EAF2FF]"
            iconColor="text-[#0B5CFF]"
          />
          <StatCard
            title="Perfiles completos"
            value={summary?.complete?.value ?? 0}
            trend={summary?.complete?.trend}
            period="mes anterior"
            icon={FileText}
            iconBg="bg-[#EAF8EF]"
            iconColor="text-[#16A34A]"
          />
          <StatCard
            title="Documentos pendientes"
            value={summary?.pendingDocs?.value ?? 0}
            trend={summary?.pendingDocs?.trend}
            period="mes anterior"
            icon={FileText}
            iconBg="bg-[#FFF5E6]"
            iconColor="text-[#F59E0B]"
          />
          <StatCard
            title="Candidatos activos"
            value={summary?.active?.value ?? 0}
            trend={summary?.active?.trend}
            period="mes anterior"
            icon={UserCheck}
            iconBg="bg-[#F5EAFE]"
            iconColor="text-[#A855F7]"
          />
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="relative xl:col-span-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por nombre, correo o perfil buscado..."
                  className="h-11 w-full rounded-xl border border-[#E6ECF5] bg-white pl-10 pr-4 text-sm font-medium text-[#334155] outline-none focus:border-[#0B5CFF]"
                />
              </div>

              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-[#E6ECF5] bg-white px-3 text-sm font-semibold text-[#334155] outline-none focus:border-[#0B5CFF] xl:col-span-2"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="reviewing">En revision</option>
                <option value="paused">Pausado</option>
                <option value="inactive">Inactivo</option>
              </select>

              <input
                type="text"
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setPage(1);
                }}
                placeholder="Todas las ciudades"
                className="h-11 rounded-xl border border-[#E6ECF5] bg-white px-3 text-sm font-semibold text-[#334155] outline-none focus:border-[#0B5CFF] xl:col-span-2"
              />

              <input
                type="text"
                value={profile}
                onChange={(event) => setProfile(event.target.value)}
                placeholder="Todos los perfiles"
                className="h-11 rounded-xl border border-[#E6ECF5] bg-white px-3 text-sm font-semibold text-[#334155] outline-none focus:border-[#0B5CFF] xl:col-span-2"
              />

              <Button variant="outline" className="h-11 xl:col-span-2">
                <Filter className="h-4 w-4" />
                Mas filtros
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E6ECF5]">
              <table className="w-full bg-white">
                <thead className="border-b border-[#EEF2F7] bg-[#F8FAFC]">
                  <tr>
                    {['Nombre', 'Ciudad', 'Perfil buscado', 'Estado', 'Documentos', 'Postulaciones', 'Ultima actividad', 'Acciones'].map((head) => (
                      <th key={head} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#64748B]">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EEF2F7]">
                  {isPending ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" />
                      </td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((row) => {
                      const docs = row._count?.documents ?? 0;
                      const apps = row._count?.applications ?? 0;
                      const docsClass = docs >= 4 ? 'text-[#16A34A]' : docs >= 2 ? 'text-[#F59E0B]' : 'text-[#EF4444]';

                      return (
                        <tr key={row.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF2FF] text-xs font-bold text-[#0B5CFF]">
                                {row.fullName?.charAt(0)?.toUpperCase() || 'C'}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#0F172A]">{row.fullName}</p>
                                <p className="truncate text-xs text-[#64748B]">{row.user?.email || '-'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-sm font-medium text-[#334155]">{row.city || '-'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-[#334155]">{row.desiredRole || '-'}</td>
                          <td className="px-4 py-3">
                            <Badge variant={getStatusBadgeVariant(row.status)}>{getStatusLabel(row.status)}</Badge>
                          </td>
                          <td className={cn('px-4 py-3 text-sm font-bold', docsClass)}>
                            <span className="inline-flex items-center gap-1">
                              <Check className="h-4 w-4" /> {docs} / 4
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-[#0F172A]">{apps}</td>
                          <td className="px-4 py-3 text-sm text-[#334155]">{formatDateTime(row.updatedAt || row.createdAt || new Date())}</td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <ActionIcon title="Ver detalle" onClick={() => openDrawer(row.id, 'detail', setDrawerCandidateId, setDrawerMode)}>
                                <Eye className="h-4 w-4" />
                              </ActionIcon>

                              <div className="relative">
                                <ActionIcon title="Cambiar estado" onClick={() => setActiveRowMenu(activeRowMenu === row.id ? null : row.id)}>
                                  <UserRound className="h-4 w-4" />
                                </ActionIcon>

                                {activeRowMenu === row.id && (
                                  <div className="absolute right-0 top-10 z-40 w-44 rounded-xl border border-[#E6ECF5] bg-white py-1 shadow-lg">
                                    {['active', 'reviewing', 'paused', 'inactive'].map((opt) => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => statusMutation.mutate({ id: row.id, nextStatus: opt })}
                                        className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                                      >
                                        {getStatusLabel(opt)}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <ActionIcon title="Ver documentos" onClick={() => openDrawer(row.id, 'documents', setDrawerCandidateId, setDrawerMode)}>
                                <FileText className="h-4 w-4" />
                              </ActionIcon>

                              <ActionIcon title="Ver postulaciones" onClick={() => openDrawer(row.id, 'applications', setDrawerCandidateId, setDrawerMode)}>
                                <Download className="h-4 w-4" />
                              </ActionIcon>

                              <ActionIcon title="Mas acciones" onClick={() => setActiveRowMenu(activeRowMenu === `${row.id}-more` ? null : `${row.id}-more`)}>
                                <MoreHorizontal className="h-4 w-4" />
                              </ActionIcon>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <p className="text-base font-semibold text-[#0F172A]">No hay candidatos</p>
                        <p className="mt-1 text-sm text-[#64748B]">Ajusta filtros e intenta de nuevo.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2">
              <p className="text-sm font-medium text-[#64748B]">
                Mostrando {rows.length ? (page - 1) * 10 + 1 : 0} a {Math.min(page * 10, total)} de {total} candidatos
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Anterior
                </Button>
                <span className="text-sm font-bold text-[#334155]">{page}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {drawerCandidateId && drawerMode && (
        <CandidateDrawer candidateId={drawerCandidateId} mode={drawerMode} onClose={() => { setDrawerCandidateId(null); setDrawerMode(null); }} />
      )}
    </div>
  );
}

function openDrawer(
  id: string,
  mode: Exclude<DrawerMode, null>,
  setId: (id: string) => void,
  setMode: (mode: DrawerMode) => void
) {
  setId(id);
  setMode(mode);
}

function ActionIcon({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]"
    >
      {children}
    </button>
  );
}

function CandidateDrawer({ candidateId, mode, onClose }: { candidateId: string; mode: Exclude<DrawerMode, null>; onClose: () => void }) {
  const { data: detail, isPending: detailLoading } = useQuery({
    queryKey: ['admin-candidate-detail', candidateId],
    queryFn: () => candidates.getById(candidateId).then((res) => res.data as DetailResponse),
    enabled: mode === 'detail',
  });

  const { data: docs, isPending: docsLoading } = useQuery({
    queryKey: ['admin-candidate-docs', candidateId],
    queryFn: () => candidates.getDocuments(candidateId).then((res) => res.data as Array<Record<string, unknown>>),
    enabled: mode === 'documents',
  });

  const { data: apps, isPending: appsLoading } = useQuery({
    queryKey: ['admin-candidate-apps', candidateId],
    queryFn: () => candidates.getApplications(candidateId).then((res) => res.data as Array<Record<string, unknown>>),
    enabled: mode === 'applications',
  });

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
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="space-y-3 p-5">
          {mode === 'detail' && (
            <>
              {detailLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-[#F1F5F9]" />
              ) : (
                <pre className="overflow-auto rounded-xl border border-[#E6ECF5] bg-[#F8FAFC] p-4 text-xs text-[#334155]">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              )}
            </>
          )}

          {mode === 'documents' && (
            <>
              {docsLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-[#F1F5F9]" />
              ) : Array.isArray(docs) && docs.length ? (
                docs.map((doc, index) => (
                  <div key={String(doc.id ?? index)} className="rounded-xl border border-[#E6ECF5] p-3 text-sm text-[#334155]">
                    <p className="font-semibold text-[#0F172A]">{String(doc.type ?? 'Documento')}</p>
                    <p className="text-xs text-[#64748B]">Estado: {String(doc.status ?? 'pending')}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium text-[#64748B]">Sin documentos.</p>
              )}
            </>
          )}

          {mode === 'applications' && (
            <>
              {appsLoading ? (
                <div className="h-24 animate-pulse rounded-xl bg-[#F1F5F9]" />
              ) : Array.isArray(apps) && apps.length ? (
                apps.map((application, index) => (
                  <div key={String(application.id ?? index)} className="rounded-xl border border-[#E6ECF5] p-3 text-sm text-[#334155]">
                    <p className="font-semibold text-[#0F172A]">{String((application.job as Record<string, unknown> | undefined)?.title ?? 'Vacante')}</p>
                    <p className="text-xs text-[#64748B]">Estado: {String(application.status ?? '-')}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium text-[#64748B]">Sin postulaciones.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

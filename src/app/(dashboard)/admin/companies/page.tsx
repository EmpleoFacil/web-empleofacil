'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle,
  Clock,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  XCircle,
  Edit,
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { billing, companies } from '@/lib/api';
import { formatDateTime, getStatusLabel } from '@/lib/utils';

type CompanyRow = {
  id: string;
  name: string;
  email?: string;
  city?: string;
  status: string;
  plan?: { id?: string; name?: string };
  _count?: { jobs?: number; users?: number };
  updatedAt?: string;
};

type Plan = { id: string; name: string };

type ListResponse = {
  companies?: CompanyRow[];
  items?: CompanyRow[];
  total?: number;
  page?: number;
  totalPages?: number;
  pagination?: { total?: number; pages?: number; page?: number };
};

export default function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CompanyRow | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['admin-companies-summary'],
    queryFn: () => companies.getAdminSummary().then((res) => res.data as Record<string, { value?: number; trend?: number }>),
  });

  const { data: plans } = useQuery({
    queryKey: ['billing-plans-for-companies'],
    queryFn: () => billing.getPlans().then((res) => (Array.isArray(res.data) ? res.data : res.data.items ?? []) as Plan[]),
  });

  const { data: listData, isPending } = useQuery({
    queryKey: ['admin-companies-list', search, status, planId, city, page],
    queryFn: () =>
      companies
        .getAdminList({ page, limit: 10, ...(search ? { search } : {}), ...(status ? { status } : {}), ...(planId ? { planId } : {}), ...(city ? { city } : {}) })
        .then((res) => res.data as ListResponse),
  });

  const rows = useMemo(() => listData?.companies ?? listData?.items ?? [], [listData]);
  const total = listData?.pagination?.total ?? listData?.total ?? rows.length;
  const totalPages = listData?.pagination?.pages ?? listData?.totalPages ?? 1;

  const cityOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.city).filter(Boolean) as string[])).sort(), [rows]);

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => companies.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies-summary'] });
      setCreateOpen(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => companies.updateAdmin(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies-list'] });
      setEditTarget(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) => companies.updateStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies-summary'] });
      setMenuId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companies.deleteAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies-summary'] });
      setMenuId(null);
    },
    onError: () => {
      window.alert('No fue posible eliminar la empresa seleccionada.');
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Empresas"
        subtitle="Administra las empresas registradas en la plataforma."
        actions={
          <>
            <Button className="h-11" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva empresa
            </Button>
          </>
        }
      />

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Empresas activas" value={summary?.active?.value ?? 0} trend={summary?.active?.trend} period="mes anterior" icon={CheckCircle} iconBg="bg-[#EAF8EF]" iconColor="text-[#16A34A]" />
          <StatCard title="Empresas suspendidas" value={summary?.suspended?.value ?? 0} trend={summary?.suspended?.trend} period="mes anterior" icon={XCircle} iconBg="bg-[#FFF5E6]" iconColor="text-[#F59E0B]" />
          <StatCard title="Por aprobar" value={summary?.pending?.value ?? 0} trend={summary?.pending?.trend} period="mes anterior" icon={Clock} iconBg="bg-[#EAF2FF]" iconColor="text-[#0B5CFF]" />
          <StatCard title="Total empresas" value={summary?.total?.value ?? 0} trend={summary?.total?.trend} period="mes anterior" icon={Building2} iconBg="bg-[#F5EAFE]" iconColor="text-[#A855F7]" />
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
              <div className="relative xl:col-span-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por empresa..." className="h-11 w-full rounded-xl border border-[#E6ECF5] bg-white pl-10 pr-3 text-sm" />
              </div>
              <select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm xl:col-span-2">
                <option value="">Todas las ciudades</option>
                {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={planId} onChange={(e) => { setPlanId(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm xl:col-span-2">
                <option value="">Todos los planes</option>
                {(plans ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm xl:col-span-2">
                <option value="">Todos los estados</option>
                <option value="active">Activa</option>
                <option value="suspended">Suspendida</option>
                <option value="pending_approval">Por aprobar</option>
                <option value="inactive">Inactiva</option>
              </select>
              <Button variant="outline" className="h-11 xl:col-span-1" disabled={!search && !city && !planId && !status} onClick={() => { setSearch(''); setCity(''); setPlanId(''); setStatus(''); setPage(1); }}>
                Limpiar
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E6ECF5]">
              <table className="w-full bg-white">
                <thead className="border-b border-[#EEF2F7] bg-[#F8FAFC]">
                  <tr>
                    {['Empresa', 'Ciudad', 'Plan', 'Vacantes activas', 'Estado', 'Último acceso', 'Acciones'].map((head) => (
                      <th key={head} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#64748B]">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {isPending ? (
                    <tr><td colSpan={7} className="px-4 py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" /></td></tr>
                  ) : rows.length ? (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF2FF] text-xs font-bold text-[#0B5CFF]">{row.name.charAt(0).toUpperCase()}</div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#0F172A]">{row.name}</p>
                              <p className="truncate text-xs text-[#64748B]">{row.email || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#334155]">{row.city || '-'}</td>
                        <td className="px-4 py-3"><Badge variant={row.plan?.name?.toLowerCase().includes('empresarial') ? 'purple' : row.plan?.name?.toLowerCase().includes('profesional') ? 'info' : 'default'}>{row.plan?.name || 'Sin plan'}</Badge></td>
                        <td className="px-4 py-3 text-sm font-bold text-[#0F172A]">{row._count?.jobs ?? 0}</td>
                        <td className="px-4 py-3"><Badge variant={getStatusBadgeVariant(row.status)}>{getStatusLabel(row.status)}</Badge></td>
                        <td className="px-4 py-3 text-sm text-[#334155]">{formatDateTime(row.updatedAt || '')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/companies/${row.id}`} className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]" title="Ver detalle"><Eye className="h-4 w-4" /></Link>
                            <button type="button" onClick={() => setEditTarget(row)} className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]" title="Editar"><Edit className="h-4 w-4" /></button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm(`¿Eliminar empresa "${row.name}"?`)) return;
                                deleteMutation.mutate(row.id);
                              }}
                              className="rounded-lg border border-[#FEE2E2] p-2 text-[#EF4444] hover:bg-[#FEF2F2]"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <div className="relative">
                              <button type="button" onClick={() => setMenuId(menuId === row.id ? null : row.id)} className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]" title="Más"><MoreHorizontal className="h-4 w-4" /></button>
                              {menuId === row.id && (
                                <div className="absolute right-0 top-10 z-40 w-44 rounded-xl border border-[#E6ECF5] bg-white py-1 shadow-lg">
                                  {row.status === 'pending_approval' ? (
                                    <button type="button" onClick={() => statusMutation.mutate({ id: row.id, nextStatus: 'active' })} className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Aprobar</button>
                                  ) : null}
                                  {row.status === 'active' ? (
                                    <button type="button" onClick={() => statusMutation.mutate({ id: row.id, nextStatus: 'suspended' })} className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Suspender</button>
                                  ) : null}
                                  {row.status === 'suspended' ? (
                                    <button type="button" onClick={() => statusMutation.mutate({ id: row.id, nextStatus: 'active' })} className="block w-full px-3 py-2 text-left text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]">Reactivar</button>
                                  ) : null}
                                  <button type="button" onClick={() => deleteMutation.mutate(row.id)} className="block w-full px-3 py-2 text-left text-sm font-medium text-[#EF4444] hover:bg-[#FEF2F2]">Eliminar</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-[#64748B]">No hay empresas para estos filtros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#64748B]">Mostrando {rows.length ? (page - 1) * 10 + 1 : 0} a {Math.min(page * 10, total)} de {total} empresas</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                <span className="text-sm font-bold text-[#334155]">{page}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {createOpen && <CompanyModal title="Nueva empresa" plans={plans ?? []} onClose={() => setCreateOpen(false)} onSubmit={(payload) => createMutation.mutate(payload)} loading={createMutation.isPending} />}
      {editTarget && <CompanyModal title="Editar empresa" company={editTarget} plans={plans ?? []} onClose={() => setEditTarget(null)} onSubmit={(payload) => editMutation.mutate({ id: editTarget.id, payload })} loading={editMutation.isPending} />}
    </div>
  );
}

function CompanyModal({
  title,
  company,
  plans,
  onClose,
  onSubmit,
  loading,
}: {
  title: string;
  company?: CompanyRow;
  plans: Plan[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(company?.name ?? '');
  const [email, setEmail] = useState(company?.email ?? '');
  const [city, setCity] = useState(company?.city ?? '');
  const [selectedPlanId, setSelectedPlanId] = useState(company?.plan?.id ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
        <form
          className="space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name, email, city, planId: selectedPlanId || undefined });
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la empresa" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo corporativo" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
          <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm">
            <option value="">Sin plan</option>
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

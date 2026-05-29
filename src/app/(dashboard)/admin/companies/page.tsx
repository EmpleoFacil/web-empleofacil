'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Search, Filter, Plus, Eye, Edit, Trash, MoreHorizontal,
  CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
  email?: string;
  city?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  plan?: { id: string; name: string };
  _count?: { jobs: number; users: number };
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  active: 'Activa',
  suspended: 'Suspendida',
  pending_approval: 'Por aprobar',
  inactive: 'Inactiva',
};

const planColors: Record<string, string> = {
  basico: 'bg-gray-100 text-gray-700',
  profesional: 'bg-blue-100 text-blue-700',
  empresarial: 'bg-purple-100 text-purple-700',
};

export default function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', planId: '', search: '', page: 1 });
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['companies-summary'],
    queryFn: () => api.get('/companies/admin/summary').then(res => res.data),
  });

  const { data: companiesData, isLoading } = useQuery({
    queryKey: ['admin-companies', filters],
    queryFn: () => api.get('/companies/admin/list', { params: filters }).then(res => res.data),
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/billing/plans').then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies-summary'] });
      setShowNewModal(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/companies/admin/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies-summary'] });
      setActiveMenu(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/admin/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies-summary'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) => api.patch(`/companies/admin/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setEditingCompany(null);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Empresas" subtitle="Administra las empresas registradas en la plataforma." />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Empresas activas"
            value={summary?.active?.value ?? 0}
            trend={summary?.active?.trend}
            period="mes anterior"
            icon={CheckCircle}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            title="Empresas suspendidas"
            value={summary?.suspended?.value ?? 0}
            icon={XCircle}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <StatCard
            title="Por aprobar"
            value={summary?.pending?.value ?? 0}
            icon={Clock}
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
          />
          <StatCard
            title="Total empresas"
            value={summary?.total?.value ?? 0}
            trend={summary?.total?.trend}
            period="mes anterior"
            icon={Building2}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por empresa..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="h-10 w-full rounded-lg border border-gray-300 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <select
                value={filters.planId}
                onChange={(e) => setFilters({ ...filters, planId: e.target.value, page: 1 })}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              >
                <option value="">Todos los planes</option>
                {plans?.map((plan: { id: string; name: string }) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
              >
                <option value="">Todos los estados</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <Button variant="ghost" size="sm" onClick={() => setFilters({ status: '', planId: '', search: '', page: 1 })}>
                Limpiar
              </Button>
            </div>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva empresa
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : companiesData?.companies?.length ? (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Empresa</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Ciudad</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Plan</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Vacantes activas</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Estado</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Último acceso</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {companiesData.companies.map((company: Company) => (
                      <tr key={company.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">{company.name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{company.name}</p>
                              <p className="text-sm text-gray-500">{company.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{company.city || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={cn('px-2 py-1 rounded text-xs font-medium', planColors[company.plan?.name?.toLowerCase() || 'basico'] || 'bg-gray-100 text-gray-700')}>
                            {company.plan?.name || 'Sin plan'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-center">{company._count?.jobs ?? 0}</td>
                        <td className="px-6 py-4">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColors[company.status] || 'bg-gray-100 text-gray-700')}>
                            {statusLabels[company.status] || company.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(company.updatedAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/companies/${company.id}`} className="p-2 rounded-lg hover:bg-gray-100" title="Ver detalle">
                              <Eye className="h-4 w-4 text-gray-500" />
                            </Link>
                            <button onClick={() => setEditingCompany(company)} className="p-2 rounded-lg hover:bg-gray-100" title="Editar">
                              <Edit className="h-4 w-4 text-gray-500" />
                            </button>
                            <div className="relative">
                              <button onClick={() => setActiveMenu(activeMenu === company.id ? null : company.id)} className="p-2 rounded-lg hover:bg-gray-100">
                                <MoreHorizontal className="h-4 w-4 text-gray-500" />
                              </button>
                              {activeMenu === company.id && (
                                <div className="absolute right-0 top-10 z-10 w-48 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                                  {company.status === 'pending_approval' && (
                                    <button onClick={() => updateStatusMutation.mutate({ id: company.id, status: 'active' })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100">
                                      <CheckCircle className="h-4 w-4" /> Aprobar
                                    </button>
                                  )}
                                  {company.status === 'active' && (
                                    <button onClick={() => updateStatusMutation.mutate({ id: company.id, status: 'suspended' })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-gray-100">
                                      <XCircle className="h-4 w-4" /> Suspender
                                    </button>
                                  )}
                                  {company.status === 'suspended' && (
                                    <button onClick={() => updateStatusMutation.mutate({ id: company.id, status: 'active' })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-gray-100">
                                      <CheckCircle className="h-4 w-4" /> Reactivar
                                    </button>
                                  )}
                                  <button onClick={() => { if (confirm('¿Eliminar esta empresa?')) deleteMutation.mutate(company.id); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                                    <Trash className="h-4 w-4" /> Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Mostrando {((filters.page - 1) * 10) + 1} a {Math.min(filters.page * 10, companiesData.total)} de {companiesData.total} empresas
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page <= 1}
                      onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{filters.page}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page >= companiesData.totalPages}
                      onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-lg font-medium text-gray-900">No hay empresas</p>
                <p className="mt-1 text-sm text-gray-500">Crea la primera empresa para comenzar</p>
                <Button className="mt-4" onClick={() => setShowNewModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva empresa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Company Modal */}
      {showNewModal && (
        <CompanyModal
          title="Nueva empresa"
          plans={plans}
          onClose={() => setShowNewModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <CompanyModal
          title="Editar empresa"
          company={editingCompany}
          plans={plans}
          onClose={() => setEditingCompany(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingCompany.id, ...data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function CompanyModal({ title, company, plans, onClose, onSubmit, isLoading }: {
  title: string;
  company?: Company;
  plans?: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    name: company?.name || '',
    email: company?.email || '',
    city: company?.city || '',
    planId: company?.plan?.id || '',
    status: company?.status || 'active',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3">
                <option value="">Sin plan</option>
                {plans?.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </div>
            {company && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Guardando...' : 'Guardar'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

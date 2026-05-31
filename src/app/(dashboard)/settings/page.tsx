'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Users, CreditCard, Save, Plus, Edit, Trash, Upload,
  Check, X, Crown, Briefcase, Eye, ChevronDown
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CompanyUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  publicationLimit: number;
  userLimit: number;
  visibleCandidatesLimit: number;
  features?: string[];
  isActive: boolean;
}

const roleLabels: Record<string, string> = {
  company_admin: 'Administrador',
  recruiter: 'Reclutador',
  editor: 'Editor',
  viewer: 'Visor',
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const { data: company } = useQuery({
    queryKey: ['company-me'],
    queryFn: () => api.get('/companies/me').then(res => res.data),
  });

  const { data: users } = useQuery({
    queryKey: ['company-users'],
    queryFn: () => api.get('/companies/me/users').then(res => res.data),
  });

  const { data: companyPlan } = useQuery({
    queryKey: ['company-plan'],
    queryFn: () => api.get('/companies/billing/company-plan').then(res => res.data),
  });

  const { data: plans } = useQuery({
    queryKey: ['company-available-plans'],
    queryFn: () =>
      api.get('/companies/plans').then(res =>
        Array.isArray(res.data) ? res.data : (res.data.items ?? [])
      ),
  });

  const [companyForm, setCompanyForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    website: '',
  });

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        city: company.city || '',
        address: company.address || '',
        website: company.website || '',
      });
    }
  }, [company]);

  const updateCompanyMutation = useMutation({
    mutationFn: (data: typeof companyForm) => api.patch('/companies/me', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company-me'] }),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { email: string; name: string; role: string; password: string }) => 
      api.post('/companies/me/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setShowUserModal(false);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; role?: string; status?: string }) => 
      api.patch(`/companies/me/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setEditingUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/companies/me/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company-users'] }),
  });

  const updatePlanMutation = useMutation({
    mutationFn: (planId: string) => api.patch('/companies/me/plan', { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-plan'] });
      queryClient.invalidateQueries({ queryKey: ['company-me'] });
    },
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Empresa y plan" subtitle="Administra la informaciÃ³n de tu empresa, usuarios y tu plan de suscripciÃ³n." />

      <div className="p-6">
        <div className="flex justify-end mb-6">
          <Button onClick={() => updateCompanyMutation.mutate(companyForm)} disabled={updateCompanyMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateCompanyMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#64748B]" />
                <h3 className="font-semibold text-[#0F172A]">InformaciÃ³n de la empresa</h3>
              </div>
              <button className="text-[#0B5CFF] text-sm hover:underline flex items-center gap-1">
                <Edit className="h-4 w-4" />
                Editar
              </button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-start gap-6 mb-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-lg bg-[#EAF2FF] flex items-center justify-center">
                    {company?.logo ? (
                      <img src={company.logo} alt={company.name} className="h-20 w-20 rounded-lg object-cover" />
                    ) : (
                      <Building2 className="h-10 w-10 text-[#0B5CFF]" />
                    )}
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-1.5 bg-[#0B5CFF] text-white rounded-full hover:bg-blue-700">
                    <Upload className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-sm text-[#64748B]">
                  <p>Formatos: PNG, JPG</p>
                  <p>TamaÃ±o mÃ¡x.: 2MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1">Nombre de la empresa *</label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1">Correo corporativo *</label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1">TelÃ©fono *</label>
                  <input
                    type="tel"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-1">Ciudad *</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#334155] mb-1">DirecciÃ³n *</label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[#334155] mb-1">Sitio web</label>
                  <input
                    type="url"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                    placeholder="https://"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#64748B]" />
                <h3 className="font-semibold text-[#0F172A]">Usuarios de la empresa</h3>
              </div>
              <Button size="sm" onClick={() => setShowUserModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar usuario
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[#F8FAFC] border-b border-[#E6ECF5]">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#64748B]">Usuario</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#64748B]">Correo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#64748B]">Rol</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[#64748B]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {users?.map((user: CompanyUser) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-[#EAF2FF] flex items-center justify-center">
                            <span className="text-sm font-medium text-[#0B5CFF]">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-sm text-[#0F172A]">{user.name || 'Sin nombre'}</span>
                          {user.status === 'active' && <span className="h-2 w-2 rounded-full bg-[#EAF8EF]0" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === 'company_admin' ? 'info' : 'default'}>
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingUser(user)} className="p-1.5 rounded hover:bg-[#F1F5F9]">
                            <Edit className="h-4 w-4 text-[#64748B]" />
                          </button>
                          <button onClick={() => deleteUserMutation.mutate(user.id)} className="p-1.5 rounded hover:bg-[#F1F5F9]">
                            <Trash className="h-4 w-4 text-[#EF4444]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 text-xs text-[#64748B] border-t">
                Mostrando {users?.length || 0} de {companyPlan?.usage?.users?.max || 0} usuarios
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Section */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">Tu plan actual</h3>
                <Badge variant="success">Activo</Badge>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-[#EAF2FF] flex items-center justify-center">
                  <Crown className="h-6 w-6 text-[#0B5CFF]" />
                </div>
                <div>
                  <p className="font-bold text-xl text-[#0F172A]">{companyPlan?.plan?.name || 'Plan BÃ¡sico'}</p>
                  <p className="text-sm text-[#64748B]">Tu plan se renueva el {companyPlan?.renewalDate ? new Date(companyPlan.renewalDate).toLocaleDateString('es-NI') : '--'}</p>
                </div>
              </div>

              <div className="text-right mb-6">
                <p className="text-3xl font-bold text-[#0F172A]">C$ {companyPlan?.plan?.price?.toLocaleString() || '0'}<span className="text-base font-normal text-[#64748B]">/mes</span></p>
                <p className="text-sm text-[#64748B]">FacturaciÃ³n mensual</p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Publicaciones</span>
                    <span className="font-medium">{companyPlan?.usage?.jobs?.current || 0} / {companyPlan?.usage?.jobs?.max || 0}</span>
                  </div>
                  <div className="h-2 bg-[#E6ECF5] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0B5CFF] rounded-full" style={{ width: `${((companyPlan?.usage?.jobs?.current || 0) / (companyPlan?.usage?.jobs?.max || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Usuarios</span>
                    <span className="font-medium">{companyPlan?.usage?.users?.current || 0} / {companyPlan?.usage?.users?.max || 0}</span>
                  </div>
                  <div className="h-2 bg-[#E6ECF5] rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 rounded-full" style={{ width: `${((companyPlan?.usage?.users?.current || 0) / (companyPlan?.usage?.users?.max || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Visibilidad de candidatos</span>
                    <span className="font-medium">{companyPlan?.usage?.candidates?.current || 0} / {companyPlan?.usage?.candidates?.max || 0}</span>
                  </div>
                  <div className="h-2 bg-[#E6ECF5] rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${((companyPlan?.usage?.candidates?.current || 0) / (companyPlan?.usage?.candidates?.max || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 bg-[#EAF2FF] rounded-lg">
                <p className="text-sm text-[#004BDD]">Â¿Necesitas mÃ¡s capacidad? Actualiza tu plan para aumentar los lÃ­mites y seguir creciendo.</p>
                <Button variant="outline" size="sm" className="mt-2 w-full">Actualizar plan</Button>
              </div>
            </CardContent>
          </Card>

          {/* Available Plans */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-[#0F172A]">Planes disponibles</h3>
                <div className="flex items-center bg-[#F1F5F9] rounded-lg p-1">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', billingPeriod === 'monthly' ? 'bg-white shadow text-[#0F172A]' : 'text-[#64748B]')}
                  >
                    Mensual
                  </button>
                  <button
                    onClick={() => setBillingPeriod('annual')}
                    className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', billingPeriod === 'annual' ? 'bg-white shadow text-[#0F172A]' : 'text-[#64748B]')}
                  >
                    Anual <span className="text-[#16A34A]">-20%</span>
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans?.map((plan: Plan) => {
                    const isCurrentPlan = plan.id === companyPlan?.plan?.id;
                    const price = billingPeriod === 'annual' ? plan.price * 0.8 : plan.price;

                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          'p-4 rounded-[18px] border-2 transition-all',
                          isCurrentPlan ? 'border-[#0B5CFF] bg-[#EAF2FF]' : 'border-[#E6ECF5] hover:border-[#0B5CFF]'
                        )}
                      >
                        {isCurrentPlan && (
                          <Badge variant="info" className="mb-2">Actual</Badge>
                        )}
                        <h4 className="font-bold text-[#0F172A]">{plan.name}</h4>
                        <p className="text-sm text-[#64748B] mb-3">
                          {plan.name === 'BÃ¡sico' && 'Ideal para empresas que comienzan.'}
                          {plan.name === 'Profesional' && 'Para empresas en crecimiento.'}
                          {plan.name === 'Empresarial' && 'Para empresas que reclutan a gran escala.'}
                        </p>

                        <p className="text-2xl font-bold text-[#0F172A] mb-4">
                          C$ {price.toLocaleString()}<span className="text-sm font-normal text-[#64748B]">/mes</span>
                        </p>

                        <ul className="space-y-2 text-sm text-[#475569] mb-4">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#16A34A]" />
                            {plan.publicationLimit === -1 ? 'Publicaciones ilimitadas' : `${plan.publicationLimit} publicaciones por mes`}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#16A34A]" />
                            {plan.userLimit === -1 ? 'Usuarios ilimitados' : `${plan.userLimit} usuarios`}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#16A34A]" />
                            {plan.visibleCandidatesLimit === -1 ? 'Candidatos ilimitados' : `${plan.visibleCandidatesLimit} candidatos visibles`}
                          </li>
                        </ul>

                        {isCurrentPlan ? (
                          <Button variant="outline" className="w-full" disabled>Plan actual</Button>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => updatePlanMutation.mutate(plan.id)}
                            disabled={updatePlanMutation.isPending}
                          >
                            Elegir plan
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* User Modal */}
      {(showUserModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
          onSubmit={(data) => {
            if (editingUser) {
              updateUserMutation.mutate({ id: editingUser.id, ...data });
            } else {
              createUserMutation.mutate(data as { email: string; name: string; role: string; password: string });
            }
          }}
          isLoading={createUserMutation.isPending || updateUserMutation.isPending}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSubmit, isLoading }: {
  user: CompanyUser | null;
  onClose: () => void;
  onSubmit: (data: { email?: string; name?: string; role?: string; password?: string; status?: string }) => void;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    email: user?.email || '',
    name: user?.name || '',
    role: user?.role || 'recruiter',
    password: '',
    status: user?.status || 'active',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50">
      <div className="w-full max-w-md rounded-[18px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E6ECF5] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0F172A]">{user ? 'Editar usuario' : 'Agregar usuario'}</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            {!user && (
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">Correo electrÃ³nico *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Nombre</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Rol *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3">
                <option value="company_admin">Administrador</option>
                <option value="recruiter">Reclutador</option>
                <option value="editor">Editor</option>
                <option value="viewer">Visor</option>
              </select>
            </div>
            {!user && (
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">ContraseÃ±a temporal *</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required />
              </div>
            )}
            {user && (
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">Estado</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3">
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
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

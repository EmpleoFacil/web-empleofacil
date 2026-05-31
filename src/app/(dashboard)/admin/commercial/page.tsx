'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Plus, Edit, Trash, Check, Search, Download, Mail,
  Eye, Settings, DollarSign, Building2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  price: number;
  publicationLimit?: number;
  userLimit?: number;
  visibleCandidatesLimit?: number;
  isActive: boolean;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentDate?: string;
  createdAt: string;
  reference?: string;
  company: { id: string; name: string; city?: string };
  plan: { id: string; name: string };
}

interface PlatformSettings {
  showCandidatesToCompanies: boolean;
  showExpectedSalary: boolean;
  showContactInfo: boolean;
  billingPeriod: string;
  graceDays: number;
  paymentReminders: string;
  currency: string;
  limitBasico?: number;
  limitProfesional?: number;
  limitEmpresarial?: number;
}

const statusColors: Record<string, string> = {
  paid: 'bg-[#EAF8EF] text-green-700',
  pending: 'bg-[#FFF5E6] text-[#F59E0B]',
  overdue: 'bg-[#FEECEC] text-red-700',
};

const statusLabels: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  overdue: 'Vencido',
};

export default function CommercialPage() {
  const queryClient = useQueryClient();
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState({ status: '', page: 1 });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/billing/plans').then(res => res.data),
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['admin-payments', paymentFilters],
    queryFn: () => api.get('/billing/payments', { params: paymentFilters }).then(res => res.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => api.get('/billing/platform-settings').then(res => res.data),
  });

  const { data: companies } = useQuery({
    queryKey: ['companies-for-assign'],
    queryFn: () => api.get('/companies/admin/list', { params: { limit: 100 } }).then(res => res.data),
  });

  const createPlanMutation = useMutation({
    mutationFn: (data: Partial<Plan>) => api.post('/billing/plans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setShowNewPlanModal(false);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Plan>) => api.patch(`/billing/plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setEditingPlan(null);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/billing/plans/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/billing/manual-payment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setShowPaymentModal(false);
    },
  });

  const assignPlanMutation = useMutation({
    mutationFn: (data: { companyId: string; planId: string }) => api.patch('/billing/assign-plan', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies-for-assign'] });
      setShowAssignPlanModal(false);
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: PlatformSettings) => api.patch('/billing/platform-settings', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-settings'] }),
  });

  const [localSettings, setLocalSettings] = useState<PlatformSettings | null>(null);

  // Initialize local settings from fetched settings
  if (settings && !localSettings) {
    setLocalSettings(settings);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Planes, pagos y configuración comercial" subtitle="Gestiona planes, cobros y parámetros comerciales de la plataforma." />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plans Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plans */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#0F172A]">1. Planes de suscripción</h3>
                  <span className="text-xs text-[#64748B]">Crea y administra los planes disponibles en la plataforma.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setShowAssignPlanModal(true)}>
                    Asignar plan a empresa
                  </Button>
                  <Button onClick={() => setShowNewPlanModal(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                {plansLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans?.map((plan: Plan, index: number) => (
                      <div
                        key={plan.id}
                        className={cn(
                          'p-5 rounded-[18px] border-2 relative',
                          index === 1 ? 'border-[#0B5CFF] bg-[#EAF2FF]' : 'border-[#E6ECF5]'
                        )}
                      >
                        {index === 1 && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0B5CFF] text-white text-xs font-medium rounded-full">
                            MÁS POPULAR
                          </div>
                        )}
                        <h4 className="font-bold text-[#0F172A]">{plan.name}</h4>
                        <p className="text-sm text-[#64748B] mb-3">
                          {plan.name === 'Básico' && 'Ideal para empresas que comienzan.'}
                          {plan.name === 'Profesional' && 'Para empresas en crecimiento.'}
                          {plan.name === 'Empresarial' && 'Para empresas que reclutan a gran escala.'}
                        </p>
                        <p className="text-2xl font-bold text-[#0F172A] mb-4">
                          C$ {plan.price.toLocaleString()}<span className="text-sm font-normal text-[#64748B]">/mes</span>
                        </p>
                        <ul className="space-y-2 text-sm text-[#475569] mb-4">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#16A34A]" />
                            {plan.publicationLimit === -1 || !plan.publicationLimit ? 'Publicaciones ilimitadas' : `${plan.publicationLimit} publicaciones por mes`}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#16A34A]" />
                            {plan.userLimit === -1 || !plan.userLimit ? 'Usuarios ilimitados' : `${plan.userLimit} usuarios`}
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-[#16A34A]" />
                            {plan.visibleCandidatesLimit === -1 || !plan.visibleCandidatesLimit ? 'Candidatos ilimitados' : `${plan.visibleCandidatesLimit} candidatos visibles`}
                          </li>
                        </ul>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingPlan(plan)}>
                            <Edit className="h-4 w-4 mr-1" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-[#EF4444] hover:bg-red-50" onClick={() => { if (confirm('¿Eliminar este plan?')) deletePlanMutation.mutate(plan.id); }}>
                            <Trash className="h-4 w-4 mr-1" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#64748B] mt-4 flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full bg-[#E6ECF5] flex items-center justify-center text-[#64748B]">i</span>
                  Los planes pueden asignarse a las empresas desde su perfil.
                  <a href="/admin/companies" className="text-[#0B5CFF] hover:underline">Gestionar empresas →</a>
                </p>
              </CardContent>
            </Card>

            {/* Payments */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#0F172A]">2. Pagos y facturación reciente</h3>
                  <span className="text-xs text-[#64748B]">Revisa los pagos realizados y registra cobros manuales.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setShowPaymentModal(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar cobro manual
                  </Button>
                  <Button variant="outline">
                    Ver facturación completa ↗
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead className="bg-[#F8FAFC] border-b border-[#E6ECF5]">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-[#475569]">Empresa</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-[#475569]">Plan</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-[#475569]">Monto</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-[#475569]">Estado</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-[#475569]">Fecha</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-[#475569]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F7]">
                    {paymentsData?.payments?.map((payment: Payment) => (
                      <tr key={payment.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded bg-[#EAF2FF] flex items-center justify-center">
                              <span className="text-sm font-medium text-[#0B5CFF]">{payment.company.name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-[#0F172A] text-sm">{payment.company.name}</p>
                              <p className="text-xs text-[#64748B]">{payment.company.city}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={payment.plan.name === 'Empresarial' ? 'info' : payment.plan.name === 'Profesional' ? 'success' : 'default'}>
                            {payment.plan.name}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 font-medium text-[#0F172A]">
                          C$ {payment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColors[payment.status] || 'bg-[#F1F5F9] text-[#334155]')}>
                            {statusLabels[payment.status] || payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#64748B]">
                          {formatDate(payment.paymentDate || payment.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 hover:bg-[#F1F5F9] rounded" title="Ver detalle">
                              <Eye className="h-4 w-4 text-[#64748B]" />
                            </button>
                            <button className="p-1.5 hover:bg-[#F1F5F9] rounded" title="Descargar recibo">
                              <Download className="h-4 w-4 text-[#64748B]" />
                            </button>
                            {payment.status === 'pending' && (
                              <button className="p-1.5 hover:bg-[#F1F5F9] rounded" title="Enviar recordatorio">
                                <Mail className="h-4 w-4 text-[#64748B]" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-[#64748B]">No hay pagos registrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {paymentsData?.totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[#E6ECF5]">
                    <p className="text-sm text-[#64748B]">
                      Mostrando {((paymentFilters.page - 1) * 10) + 1} a {Math.min(paymentFilters.page * 10, paymentsData.total)} de {paymentsData.total} pagos
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={paymentFilters.page <= 1}
                        onClick={() => setPaymentFilters({ ...paymentFilters, page: paymentFilters.page - 1 })}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {[...Array(Math.min(5, paymentsData.totalPages))].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setPaymentFilters({ ...paymentFilters, page: i + 1 })}
                          className={cn(
                            'px-3 py-1 rounded text-sm',
                            paymentFilters.page === i + 1 ? 'bg-[#0B5CFF] text-white' : 'hover:bg-[#F1F5F9]'
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={paymentFilters.page >= paymentsData.totalPages}
                        onClick={() => setPaymentFilters({ ...paymentFilters, page: paymentFilters.page + 1 })}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assign Plan CTA */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-[#EAF2FF] flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-[#0B5CFF]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A]">Asigna un plan a una empresa</p>
                      <p className="text-sm text-[#64748B]">Cambia o asigna el plan activo de cualquier empresa.</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setShowAssignPlanModal(true)}>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar empresas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Sidebar */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-[#64748B]" />
                  <h3 className="font-semibold text-[#0F172A]">3. Configuración comercial</h3>
                </div>
                <span className="text-xs text-[#64748B]">Parámetros y reglas que aplican a toda la plataforma.</span>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                {/* Publication Limits */}
                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3">Límites de publicaciones</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-[#475569]">Límite publicaciones - Básico</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={localSettings?.limitBasico ?? 10}
                          onChange={e => setLocalSettings({ ...localSettings!, limitBasico: +e.target.value })}
                          className="flex-1 h-9 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                        />
                        <span className="text-sm text-[#64748B]">por mes</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-[#475569]">Límite publicaciones - Profesional</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={localSettings?.limitProfesional ?? 30}
                          onChange={e => setLocalSettings({ ...localSettings!, limitProfesional: +e.target.value })}
                          className="flex-1 h-9 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                        />
                        <span className="text-sm text-[#64748B]">por mes</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-[#475569]">Límite publicaciones - Empresarial</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={localSettings?.limitEmpresarial ?? 0}
                          onChange={e => setLocalSettings({ ...localSettings!, limitEmpresarial: +e.target.value })}
                          className="flex-1 h-9 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                          placeholder="0 = ilimitadas"
                        />
                        <span className="text-sm text-[#64748B]">ilimitadas</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Candidate Visibility */}
                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3">Visibilidad de candidatos</h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-[#475569]">Mostrar candidatos a empresas</span>
                      <input
                        type="checkbox"
                        checked={localSettings?.showCandidatesToCompanies ?? true}
                        onChange={e => setLocalSettings({ ...localSettings!, showCandidatesToCompanies: e.target.checked })}
                        className="h-5 w-9 rounded-full appearance-none bg-[#E6ECF5] checked:bg-[#0B5CFF] relative cursor-pointer transition-colors before:content-[''] before:absolute before:h-4 before:w-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-4"
                      />
                    </label>
                    <p className="text-xs text-[#64748B]">Permite a las empresas ver perfiles de candidatos.</p>

                    <label className="flex items-center justify-between">
                      <span className="text-sm text-[#475569]">Mostrar salario esperado</span>
                      <input
                        type="checkbox"
                        checked={localSettings?.showExpectedSalary ?? true}
                        onChange={e => setLocalSettings({ ...localSettings!, showExpectedSalary: e.target.checked })}
                        className="h-5 w-9 rounded-full appearance-none bg-[#E6ECF5] checked:bg-[#0B5CFF] relative cursor-pointer transition-colors before:content-[''] before:absolute before:h-4 before:w-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-4"
                      />
                    </label>
                    <p className="text-xs text-[#64748B]">Muestra el salario esperado en los perfiles.</p>

                    <label className="flex items-center justify-between">
                      <span className="text-sm text-[#475569]">Datos de contacto visibles</span>
                      <input
                        type="checkbox"
                        checked={localSettings?.showContactInfo ?? false}
                        onChange={e => setLocalSettings({ ...localSettings!, showContactInfo: e.target.checked })}
                        className="h-5 w-9 rounded-full appearance-none bg-[#E6ECF5] checked:bg-[#0B5CFF] relative cursor-pointer transition-colors before:content-[''] before:absolute before:h-4 before:w-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-4"
                      />
                    </label>
                    <p className="text-xs text-[#64748B]">Permite mostrar datos de contacto a empresas.</p>
                  </div>
                </div>

                {/* Commercial Rules */}
                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3">Reglas comerciales</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-[#475569]">Período de facturación</label>
                      <select
                        value={localSettings?.billingPeriod ?? 'monthly'}
                        onChange={e => setLocalSettings({ ...localSettings!, billingPeriod: e.target.value })}
                        className="w-full h-9 rounded-lg border border-[#D1D9E6] px-3 text-sm mt-1"
                      >
                        <option value="monthly">Mensual</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="annual">Anual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-[#475569]">Días de gracia por impago</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          value={localSettings?.graceDays ?? 7}
                          onChange={e => setLocalSettings({ ...localSettings!, graceDays: +e.target.value })}
                          className="flex-1 h-9 rounded-lg border border-[#D1D9E6] px-3 text-sm"
                        />
                        <span className="text-sm text-[#64748B]">días</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-[#475569]">Recordatorios de pago</label>
                      <select
                        value={localSettings?.paymentReminders ?? 'automatic'}
                        onChange={e => setLocalSettings({ ...localSettings!, paymentReminders: e.target.value })}
                        className="w-full h-9 rounded-lg border border-[#D1D9E6] px-3 text-sm mt-1"
                      >
                        <option value="automatic">Automáticos</option>
                        <option value="manual">Manuales</option>
                        <option value="disabled">Desactivados</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-[#475569]">Moneda</label>
                      <select
                        value={localSettings?.currency ?? 'NIO'}
                        onChange={e => setLocalSettings({ ...localSettings!, currency: e.target.value })}
                        className="w-full h-9 rounded-lg border border-[#D1D9E6] px-3 text-sm mt-1"
                      >
                        <option value="NIO">Córdoba Nicaragüense (C$)</option>
                        <option value="USD">Dólar Estadounidense ($)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => localSettings && updateSettingsMutation.mutate(localSettings)}
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* New/Edit Plan Modal */}
      {(showNewPlanModal || editingPlan) && (
        <PlanModal
          plan={editingPlan}
          onClose={() => { setShowNewPlanModal(false); setEditingPlan(null); }}
          onSubmit={(data) => {
            if (editingPlan) {
              updatePlanMutation.mutate({ id: editingPlan.id, ...data });
            } else {
              createPlanMutation.mutate(data);
            }
          }}
          isLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
        />
      )}

      {/* Manual Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          companies={companies?.companies}
          plans={plans}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={(data) => createPaymentMutation.mutate(data)}
          isLoading={createPaymentMutation.isPending}
        />
      )}

      {/* Assign Plan Modal */}
      {showAssignPlanModal && (
        <AssignPlanModal
          companies={companies?.companies}
          plans={plans}
          onClose={() => setShowAssignPlanModal(false)}
          onSubmit={(data) => assignPlanMutation.mutate(data)}
          isLoading={assignPlanMutation.isPending}
        />
      )}
    </div>
  );
}

function PlanModal({ plan, onClose, onSubmit, isLoading }: { plan?: Plan | null; onClose: () => void; onSubmit: (data: Partial<Plan>) => void; isLoading: boolean }) {
  const [form, setForm] = useState({
    id: plan?.id || '',
    name: plan?.name || '',
    price: plan?.price || 0,
    publicationLimit: plan?.publicationLimit || 10,
    userLimit: plan?.userLimit || 5,
    visibleCandidatesLimit: plan?.visibleCandidatesLimit || 100,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50">
      <div className="w-full max-w-md rounded-[18px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E6ECF5] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0F172A]">{plan ? 'Editar plan' : 'Nuevo plan'}</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            {!plan && (
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">ID del plan *</label>
                <input type="text" value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Nombre *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Precio mensual (C$) *</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">Publicaciones</label>
                <input type="number" value={form.publicationLimit} onChange={e => setForm({ ...form, publicationLimit: +e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">Usuarios</label>
                <input type="number" value={form.userLimit} onChange={e => setForm({ ...form, userLimit: +e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-1">Candidatos</label>
                <input type="number" value={form.visibleCandidatesLimit} onChange={e => setForm({ ...form, visibleCandidatesLimit: +e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" />
              </div>
            </div>
            <p className="text-xs text-[#64748B]">Use -1 o 0 para ilimitado.</p>
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

function PaymentModal({ companies, plans, onClose, onSubmit, isLoading }: { companies?: { id: string; name: string }[]; plans?: Plan[]; onClose: () => void; onSubmit: (data: Record<string, unknown>) => void; isLoading: boolean }) {
  const [form, setForm] = useState({ companyId: '', planId: '', amount: 0, reference: '', notes: '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50">
      <div className="w-full max-w-md rounded-[18px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E6ECF5] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0F172A]">Registrar cobro manual</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Empresa *</label>
              <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required>
                <option value="">Seleccionar empresa...</option>
                {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Plan *</label>
              <select value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required>
                <option value="">Seleccionar plan...</option>
                {plans?.map(p => <option key={p.id} value={p.id}>{p.name} - C$ {p.price.toLocaleString()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Monto (C$) *</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Referencia</label>
              <input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" placeholder="No. de transacción" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full rounded-lg border border-[#D1D9E6] px-3 py-2" rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Registrando...' : 'Registrar pago'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AssignPlanModal({ companies, plans, onClose, onSubmit, isLoading }: { companies?: { id: string; name: string; plan?: { id: string; name: string } }[]; plans?: Plan[]; onClose: () => void; onSubmit: (data: { companyId: string; planId: string }) => void; isLoading: boolean }) {
  const [form, setForm] = useState({ companyId: '', planId: '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50">
      <div className="w-full max-w-md rounded-[18px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E6ECF5] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0F172A]">Asignar plan a empresa</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#475569] text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Empresa *</label>
              <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required>
                <option value="">Seleccionar empresa...</option>
                {companies?.map(c => <option key={c.id} value={c.id}>{c.name} {c.plan ? `(${c.plan.name})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1">Nuevo plan *</label>
              <select value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })} className="w-full h-10 rounded-lg border border-[#D1D9E6] px-3" required>
                <option value="">Seleccionar plan...</option>
                {plans?.map(p => <option key={p.id} value={p.id}>{p.name} - C$ {p.price.toLocaleString()}/mes</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Asignando...' : 'Asignar plan'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

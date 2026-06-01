'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Download, Edit, Eye, Mail, Plus, Search, Trash2 } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { billing, companies } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';

type Plan = {
  id: string;
  name: string;
  price: number;
  publicationLimit?: number;
  userLimit?: number;
  visibleCandidatesLimit?: number;
  isActive?: boolean;
};

type Payment = {
  id: string;
  amount: number;
  status: string;
  createdAt?: string;
  paymentDate?: string;
  company?: { id?: string; name?: string; city?: string };
  plan?: { id?: string; name?: string };
};

type PlatformSettings = {
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
};

type CompanyOption = { id: string; name: string; plan?: { id?: string; name?: string } };

function statusBadge(status: string) {
  if (status === 'paid') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'overdue') return 'danger';
  return 'default';
}

function paymentStatusLabel(status: string) {
  if (status === 'paid') return 'Pagado';
  if (status === 'pending') return 'Pendiente';
  if (status === 'overdue') return 'Vencido';
  return status;
}

export default function CommercialPage() {
  const queryClient = useQueryClient();
  const [planModal, setPlanModal] = useState<Plan | 'new' | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<PlatformSettings | null>(null);
  const [paymentsPage, setPaymentsPage] = useState(1);

  const { data: plans } = useQuery({
    queryKey: ['commercial-plans'],
    queryFn: () => billing.getPlans().then((res) => (Array.isArray(res.data) ? res.data : res.data.items ?? []) as Plan[]),
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['commercial-payments', paymentsPage],
    queryFn: () => billing.getPayments({ page: paymentsPage, limit: 10 }).then((res) => res.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['commercial-platform-settings'],
    queryFn: () => billing.getPlatformSettings().then((res) => res.data as PlatformSettings),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['commercial-companies'],
    queryFn: () => companies.getAdminList({ page: 1, limit: 200 }).then((res) => res.data),
  });

  const companiesList: CompanyOption[] = companiesData?.companies ?? companiesData?.items ?? [];

  const effectiveSettings = settingsDraft ?? settings ?? {
    showCandidatesToCompanies: true,
    showExpectedSalary: true,
    showContactInfo: false,
    billingPeriod: 'monthly',
    graceDays: 7,
    paymentReminders: 'automatic',
    currency: 'NIO',
    limitBasico: 10,
    limitProfesional: 30,
    limitEmpresarial: 0,
  };

  const createPlanMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => billing.createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-plans'] });
      setPlanModal(null);
    },
    onError: () => {
      window.alert('No se pudo crear el plan con los datos enviados. Revisa límites y vuelve a intentar.');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => billing.updatePlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-plans'] });
      setPlanModal(null);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => billing.deletePlan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commercial-plans'] }),
  });

  const manualPaymentMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => billing.addManualPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-payments'] });
      setPaymentModalOpen(false);
    },
  });

  const assignPlanMutation = useMutation({
    mutationFn: (payload: { companyId: string; planId: string }) => billing.assignPlan(payload.companyId, payload.planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-companies'] });
      setAssignModalOpen(false);
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (payload: PlatformSettings) => billing.updatePlatformSettings(payload as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-platform-settings'] });
      setSettingsDraft(null);
    },
  });

  const paymentRows: Payment[] = paymentsData?.payments ?? paymentsData?.items ?? [];
  const paymentTotal = paymentsData?.total ?? paymentRows.length;
  const paymentTotalPages = paymentsData?.totalPages ?? 1;

  const exportPayments = () => {
    const headers = ['Empresa', 'Plan', 'Monto', 'Estado', 'Fecha'];
    const lines = paymentRows.map((payment) => {
      const cols = [
        payment.company?.name || 'Empresa',
        payment.plan?.name || '-',
        `C$ ${payment.amount.toLocaleString()}`,
        paymentStatusLabel(payment.status),
        formatDateTime(payment.paymentDate || payment.createdAt || ''),
      ];
      return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'facturacion-comercial.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header title="Planes, pagos y configuración comercial" subtitle="Gestiona planes, cobros y parámetros comerciales de la plataforma." />

      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-[#0F172A]">1. Planes de suscripción</p>
                  <p className="text-sm text-[#64748B]">Crea y administra los planes disponibles en la plataforma.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setAssignModalOpen(true)}>Asignar plan a empresa</Button>
                  <Button onClick={() => setPlanModal('new')}><Plus className="h-4 w-4" />Nuevo plan</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(plans ?? []).map((plan, index) => (
                  <div key={plan.id} className={cn('rounded-xl border p-4', index === 1 ? 'border-[#0B5CFF] bg-[#F8FBFF]' : 'border-[#E6ECF5]')}>
                    <p className="text-2xl font-bold text-[#0F172A]">{plan.name}</p>
                    <p className="text-4xl font-bold text-[#0F172A]">C$ {plan.price.toLocaleString()} <span className="text-sm font-medium text-[#64748B]">/ mes</span></p>
                    <ul className="mt-3 space-y-2 text-sm text-[#475569]">
                      <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#16A34A]" /> {(plan.publicationLimit ?? 0) > 0 ? `${plan.publicationLimit} publicaciones por mes` : 'Publicaciones ilimitadas'}</li>
                      <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#16A34A]" /> {(plan.userLimit ?? 0) > 0 ? `${plan.userLimit} usuarios` : 'Usuarios ilimitados'}</li>
                      <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#16A34A]" /> {(plan.visibleCandidatesLimit ?? 0) > 0 ? `${plan.visibleCandidatesLimit} candidatos visibles` : 'Candidatos ilimitados'}</li>
                    </ul>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setPlanModal(plan)}><Edit className="h-4 w-4" />Editar</Button>
                      <Button variant="outline" size="sm" className="flex-1 text-[#EF4444] hover:bg-[#FEF2F2]" onClick={() => deletePlanMutation.mutate(plan.id)}><Trash2 className="h-4 w-4" />Eliminar</Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-[#DCEBFF] bg-[#F8FBFF] px-4 py-3 text-sm text-[#64748B]">
                Los planes pueden asignarse a las empresas desde su perfil.{' '}
                <Link href="/admin/companies" className="font-semibold text-[#0B5CFF] hover:text-[#004BDD]">Gestionar empresas</Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
                <div>
                  <p className="text-lg font-bold text-[#0F172A]">2. Pagos y facturación reciente</p>
                  <p className="text-sm text-[#64748B]">Revisa pagos realizados y registra cobros manuales.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setPaymentModalOpen(true)}><Plus className="h-4 w-4" />Registrar cobro manual</Button>
                  <Button variant="outline" onClick={exportPayments}>Ver facturación completa</Button>
                </div>
              </div>

              <div className="overflow-x-auto border-y border-[#EEF2F7]">
                <table className="w-full bg-white">
                  <thead className="border-b border-[#EEF2F7] bg-[#F8FAFC]"><tr>{['Empresa', 'Plan', 'Monto', 'Estado', 'Fecha', 'Acciones'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#64748B]">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-[#EEF2F7]">
                    {paymentRows.map((payment) => (
                      <tr key={payment.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF2FF] text-xs font-bold text-[#0B5CFF]">
                              {String(payment.company?.name ?? 'E').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#0F172A]">{payment.company?.name || 'Empresa'}</p>
                              <p className="text-xs text-[#64748B]">{payment.company?.city || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><Badge variant={payment.plan?.name?.toLowerCase().includes('empresarial') ? 'purple' : payment.plan?.name?.toLowerCase().includes('profesional') ? 'info' : 'default'}>{payment.plan?.name || '-'}</Badge></td>
                        <td className="px-4 py-3 text-sm font-bold text-[#0F172A]">C$ {payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-3"><Badge variant={statusBadge(payment.status) as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'}>{paymentStatusLabel(payment.status)}</Badge></td>
                        <td className="px-4 py-3 text-sm text-[#334155]">{formatDateTime(payment.paymentDate || payment.createdAt || '')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <ActionBtn onClick={() => window.alert(`Pago ${payment.id}\nEmpresa: ${payment.company?.name || 'Empresa'}\nEstado: ${paymentStatusLabel(payment.status)}`)}><Eye className="h-4 w-4" /></ActionBtn>
                            <ActionBtn onClick={exportPayments}><Download className="h-4 w-4" /></ActionBtn>
                            {payment.status === 'pending' ? <ActionBtn onClick={() => window.alert('Recordatorio de pago enviado')}><Mail className="h-4 w-4" /></ActionBtn> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!paymentRows.length && <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-[#64748B]">Sin pagos registrados.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
                <p className="text-sm text-[#64748B]">Mostrando {paymentRows.length ? (paymentsPage - 1) * 10 + 1 : 0} a {Math.min(paymentsPage * 10, paymentTotal)} de {paymentTotal} pagos</p>
                <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={paymentsPage <= 1} onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}>Anterior</Button><span className="text-sm font-bold text-[#334155]">{paymentsPage}</span><Button variant="outline" size="sm" disabled={paymentsPage >= paymentTotalPages} onClick={() => setPaymentsPage((p) => p + 1)}>Siguiente</Button></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DCEBFF] bg-[#F8FBFF] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2FF] text-[#0B5CFF]">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#0F172A]">Asigna un plan a una empresa</p>
                  <p className="text-sm text-[#64748B]">Cambia o asigna el plan activo de cualquier empresa.</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setAssignModalOpen(true)}><Search className="h-4 w-4" />Buscar empresas</Button>
            </CardContent>
          </Card>
        </div>

        <Card className="xl:col-span-4 h-fit sticky top-6">
          <CardContent className="space-y-5 p-4">
            <div>
              <p className="text-lg font-bold text-[#0F172A]">3. Configuración comercial</p>
              <p className="text-sm text-[#64748B]">Parámetros y reglas aplicadas a toda la plataforma.</p>
            </div>

            <div className="space-y-3">
              <LabelInput label="Límite publicaciones - Básico" value={effectiveSettings.limitBasico ?? 10} onChange={(v) => setSettingsDraft({ ...effectiveSettings, limitBasico: v })} suffix="por mes" />
              <LabelInput label="Límite publicaciones - Profesional" value={effectiveSettings.limitProfesional ?? 30} onChange={(v) => setSettingsDraft({ ...effectiveSettings, limitProfesional: v })} suffix="por mes" />
              <LabelInput label="Límite publicaciones - Empresarial" value={effectiveSettings.limitEmpresarial ?? 0} onChange={(v) => setSettingsDraft({ ...effectiveSettings, limitEmpresarial: v })} suffix="ilimitadas" />
            </div>

            <Toggle label="Mostrar candidatos a empresas" checked={effectiveSettings.showCandidatesToCompanies} onChange={(checked) => setSettingsDraft({ ...effectiveSettings, showCandidatesToCompanies: checked })} />
            <Toggle label="Mostrar salario esperado" checked={effectiveSettings.showExpectedSalary} onChange={(checked) => setSettingsDraft({ ...effectiveSettings, showExpectedSalary: checked })} />
            <Toggle label="Datos de contacto visibles" checked={effectiveSettings.showContactInfo} onChange={(checked) => setSettingsDraft({ ...effectiveSettings, showContactInfo: checked })} />

            <div className="space-y-3">
              <SelectInput label="Periodo de facturación" value={effectiveSettings.billingPeriod} onChange={(v) => setSettingsDraft({ ...effectiveSettings, billingPeriod: v })} options={[['monthly', 'Mensual'], ['quarterly', 'Trimestral'], ['annual', 'Anual']]} />
              <LabelInput label="Días de gracia por impago" value={effectiveSettings.graceDays} onChange={(v) => setSettingsDraft({ ...effectiveSettings, graceDays: v })} suffix="días" />
              <SelectInput label="Recordatorios de pago" value={effectiveSettings.paymentReminders} onChange={(v) => setSettingsDraft({ ...effectiveSettings, paymentReminders: v })} options={[['automatic', 'Automáticos'], ['manual', 'Manuales'], ['disabled', 'Desactivados']]} />
              <SelectInput label="Moneda" value={effectiveSettings.currency} onChange={(v) => setSettingsDraft({ ...effectiveSettings, currency: v })} options={[['NIO', 'Córdoba Nicaragüense (C$)'], ['USD', 'Dólar Estadounidense ($)']]} />
            </div>

            <Button className="h-11 w-full" onClick={() => saveSettingsMutation.mutate(effectiveSettings)} disabled={saveSettingsMutation.isPending}>{saveSettingsMutation.isPending ? 'Guardando...' : 'Guardar cambios'}</Button>
          </CardContent>
        </Card>
      </div>

      {planModal && <PlanModal mode={planModal} onClose={() => setPlanModal(null)} onCreate={(payload) => createPlanMutation.mutate(payload)} onUpdate={(id, payload) => updatePlanMutation.mutate({ id, payload })} loading={createPlanMutation.isPending || updatePlanMutation.isPending} />}
      {paymentModalOpen && <PaymentModal companies={companiesList} plans={plans ?? []} onClose={() => setPaymentModalOpen(false)} onSubmit={(payload) => manualPaymentMutation.mutate(payload)} loading={manualPaymentMutation.isPending} />}
      {assignModalOpen && <AssignPlanModal companies={companiesList} plans={plans ?? []} onClose={() => setAssignModalOpen(false)} onSubmit={(payload) => assignPlanMutation.mutate(payload)} loading={assignPlanMutation.isPending} />}
    </div>
  );
}

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]">{children}</button>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-[#E6ECF5] px-3 py-2">
      <span className="text-sm font-medium text-[#334155]">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-[#0B5CFF]' : 'bg-[#CBD5E1]')}
      >
        <span
          className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')}
        />
      </button>
    </label>
  );
}

function LabelInput({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#334155]">{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-10 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
        {suffix ? <span className="text-xs text-[#64748B]">{suffix}</span> : null}
      </div>
    </div>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#334155]">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4"><h3 className="text-lg font-bold text-[#0F172A]">{title}</h3><Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function PlanModal({ mode, onClose, onCreate, onUpdate, loading }: { mode: Plan | 'new'; onClose: () => void; onCreate: (payload: Record<string, unknown>) => void; onUpdate: (id: string, payload: Record<string, unknown>) => void; loading: boolean }) {
  const isEdit = mode !== 'new';
  const [name, setName] = useState(isEdit ? mode.name : '');
  const [price, setPrice] = useState(isEdit ? String(mode.price) : '');
  const [publicationLimit, setPublicationLimit] = useState(isEdit ? String(mode.publicationLimit ?? 10) : '10');
  const [userLimit, setUserLimit] = useState(isEdit ? String(mode.userLimit ?? 5) : '5');
  const [visibleCandidatesLimit, setVisibleCandidatesLimit] = useState(isEdit ? String(mode.visibleCandidatesLimit ?? 100) : '100');

  return (
    <ModalShell title={isEdit ? 'Editar plan' : 'Nuevo plan'} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault();
        const payload = {
          name,
          price: Number(price || 0),
          publicationLimit: Number(publicationLimit || 0),
          userLimit: Number(userLimit || 0),
          visibleCandidatesLimit: Number(visibleCandidatesLimit || 0),
          activeJobs: Number(publicationLimit || 0),
          users: Number(userLimit || 0),
          visibleCandidates: Number(visibleCandidatesLimit || 0),
        };
        if (isEdit) onUpdate((mode as Plan).id, payload);
        else onCreate(payload);
      }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required />
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Precio" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required />
        <div className="grid grid-cols-3 gap-2">
          <input type="number" value={publicationLimit} onChange={(e) => setPublicationLimit(e.target.value)} placeholder="Publicaciones" className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm" />
          <input type="number" value={userLimit} onChange={(e) => setUserLimit(e.target.value)} placeholder="Usuarios" className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm" />
          <input type="number" value={visibleCandidatesLimit} onChange={(e) => setVisibleCandidatesLimit(e.target.value)} placeholder="Candidatos" className="h-11 rounded-xl border border-[#E6ECF5] px-3 text-sm" />
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button></div>
      </form>
    </ModalShell>
  );
}

function PaymentModal({ companies, plans, onClose, onSubmit, loading }: { companies: CompanyOption[]; plans: Plan[]; onClose: () => void; onSubmit: (payload: Record<string, unknown>) => void; loading: boolean }) {
  const [companyId, setCompanyId] = useState('');
  const [planId, setPlanId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  return (
    <ModalShell title="Registrar cobro manual" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ companyId, planId, amount: Number(amount || 0), reference }); }}>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required><option value="">Empresa</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required><option value="">Plan</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required />
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referencia" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
        <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Registrar'}</Button></div>
      </form>
    </ModalShell>
  );
}

function AssignPlanModal({ companies, plans, onClose, onSubmit, loading }: { companies: CompanyOption[]; plans: Plan[]; onClose: () => void; onSubmit: (payload: { companyId: string; planId: string }) => void; loading: boolean }) {
  const [companyId, setCompanyId] = useState('');
  const [planId, setPlanId] = useState('');
  return (
    <ModalShell title="Asignar plan a empresa" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ companyId, planId }); }}>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required><option value="">Empresa</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required><option value="">Plan</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <div className="flex justify-end gap-2"><Button variant="outline" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? 'Asignando...' : 'Asignar'}</Button></div>
      </form>
    </ModalShell>
  );
}

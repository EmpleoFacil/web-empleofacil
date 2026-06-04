'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Edit, Plus, Save, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { companies } from '@/lib/api';
import { cn } from '@/lib/utils';

type CompanyUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
  companyRole?: string;
  status?: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  activeJobs?: number;
  users?: number;
  visibleCandidates?: number;
  features?: string[];
};

type CompanyDraft = {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  website: string;
  logo?: string;
};

const roleLabel: Record<string, string> = {
  company_admin: 'Administrador',
  recruiter: 'Reclutador',
  editor: 'Editor',
  viewer: 'Visor',
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [companyDraft, setCompanyDraft] = useState<Partial<CompanyDraft> | null>(null);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [planModal, setPlanModal] = useState<Plan | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const [quotaModal, setQuotaModal] = useState<{ type: 'jobs' | 'users' | 'general'; title: string; message: string } | null>(null);
  const [flashPlans, setFlashPlans] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);
  const [annual, setAnnual] = useState(false);
  const [planReference, setPlanReference] = useState('');

  const { data: company } = useQuery({
    queryKey: ['company-me-profile'],
    queryFn: () => companies.getMe().then((res) => res.data),
  });

  const { data: users } = useQuery({
    queryKey: ['company-users-profile'],
    queryFn: () =>
      companies.getMyUsers().then((res) => {
        const raw = Array.isArray(res.data) ? res.data : res.data.items ?? [];
        return raw.map((u: CompanyUser & { companyRole?: string }) => ({
          ...u,
          role: u.role ?? u.companyRole ?? 'viewer',
          companyRole: u.companyRole ?? u.role ?? 'viewer',
        }));
      }),
  });

  const { data: planLimits } = useQuery({
    queryKey: ['company-plan-limits'],
    queryFn: () => companies.getPlanLimits().then((res) => res.data),
  });

  const { data: billingPlan } = useQuery({
    queryKey: ['company-billing-plan'],
    queryFn: () => companies.getBillingPlan().then((res) => res.data),
  });

  const { data: availablePlans } = useQuery({
    queryKey: ['company-available-plans'],
    queryFn: () => companies.getAvailablePlans().then((res) => (Array.isArray(res.data) ? res.data : res.data.items ?? [])),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const quotaExceeded = params.get('quotaExceeded');
    if (quotaExceeded) {
      if (quotaExceeded === 'jobs') {
        setQuotaModal({
          type: 'jobs',
          title: '¡Se acabó tu cuota de vacantes!',
          message: 'Has alcanzado el número máximo de vacantes activas permitidas por tu plan actual. Mejora tu plan para continuar publicando vacantes y encontrar talento ideal.'
        });
      } else if (quotaExceeded === 'users') {
        setQuotaModal({
          type: 'users',
          title: '¡Se acabó tu cuota de usuarios!',
          message: 'Has alcanzado el número máximo de usuarios permitidos en tu empresa. Mejora tu plan para agregar más miembros a tu equipo.'
        });
      } else {
        setQuotaModal({
          type: 'general',
          title: '¡Límite de cuota alcanzado!',
          message: 'Has alcanzado uno de los límites de capacidad en tu plan actual. Mejora tu plan para seguir creciendo.'
        });
      }
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const form = useMemo(() => {
    return {
      name: companyDraft?.name ?? company?.name ?? '',
      email: companyDraft?.email ?? company?.email ?? '',
      phone: companyDraft?.phone ?? company?.phone ?? '',
      city: companyDraft?.city ?? company?.city ?? '',
      address: companyDraft?.address ?? company?.address ?? '',
      website: companyDraft?.website ?? company?.website ?? '',
    };
  }, [companyDraft, company]);

  const currentLogo = logoPreview || company?.logoUrl || company?.logo || '';

  const updateCompanyMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => companies.updateMe(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-me-profile'] });
      setCompanyDraft(null);
      setIsEditingCompany(false);
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => companies.uploadMyLogo(file),
    onSuccess: (res) => {
      const logoUrl = res.data?.logoUrl;
      if (logoUrl) setLogoPreview(logoUrl);
      queryClient.invalidateQueries({ queryKey: ['company-me-profile'] });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => companies.createMyUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users-profile'] });
      setUserModalOpen(false);
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      try {
        return await companies.updateMyUser(id, payload);
      } catch {
        return await companies.updateMyUser(id, { ...payload, userId: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users-profile'] });
      setEditingUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await companies.deleteMyUser(id);
      } catch {
        return await companies.updateMyUser(id, { status: 'inactive', userId: id });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company-users-profile'] }),
  });

  const changePlanMutation = useMutation({
    mutationFn: (planId: string) => companies.updatePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-billing-plan'] });
      queryClient.invalidateQueries({ queryKey: ['company-me-profile'] });
      setPlanModal(null);
    },
  });

  const handleCloseQuotaModal = () => {
    setQuotaModal(null);
    setTimeout(() => {
      plansRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlashPlans(true);
      setTimeout(() => {
        setFlashPlans(false);
      }, 2000);
    }, 100);
  };

  const currentPlanId = String(billingPlan?.plan?.id ?? billingPlan?.id ?? '');
  const usage = planLimits?.usage ?? billingPlan?.usage ?? billingPlan?.limits ?? {};
  const currentPlanFromList = (availablePlans ?? []).find((p: Plan) => p.id === currentPlanId);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Empresa y plan"
        subtitle="Administra la informacion de tu empresa, usuarios y tu plan de suscripcion."
        actions={
          <Button className="h-11" onClick={() => updateCompanyMutation.mutate(form)} disabled={updateCompanyMutation.isPending}>
            <Save className="h-4 w-4" />
            {updateCompanyMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-5">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#0F172A]">Informacion de la empresa</h3>
                <button type="button" onClick={() => setIsEditingCompany((v) => !v)} className="inline-flex items-center gap-1 text-sm font-bold text-[#0B5CFF] hover:text-[#004BDD]">
                  <Edit className="h-4 w-4" />
                  {isEditingCompany ? 'Bloquear' : 'Editar'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <div className="relative flex h-40 flex-col items-center justify-center rounded-xl border border-[#E6ECF5] bg-[#F8FAFC] overflow-hidden">
                    {currentLogo ? <Image src={currentLogo} alt="Logo empresa" fill sizes="160px" className="object-cover" /> : <Building2 className="h-12 w-12 text-[#0B5CFF]" />}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      window.alert('El logo excede 2MB.');
                      return;
                    }
                    uploadLogoMutation.mutate(file);
                  }} />
                  <Button
                    variant="outline"
                    className="mt-3 h-10 w-full"
                    onClick={() => logoInputRef.current?.click()}
                    type="button"
                    disabled={uploadLogoMutation.isPending}
                  >
                    <Upload className="h-4 w-4" />
                    {uploadLogoMutation.isPending ? 'Subiendo...' : 'Cambiar logo'}
                  </Button>
                  <p className="mt-2 text-xs text-[#64748B]">Formatos: PNG, JPG. Tamano max: 2MB</p>
                </div>

                <div className="space-y-3 md:col-span-8">
                  <Field label="Nombre de la empresa"><input disabled={!isEditingCompany} value={form.name} onChange={(e) => setCompanyDraft({ ...(companyDraft ?? form), name: e.target.value })} placeholder="Nombre de la empresa" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm disabled:bg-[#F8FAFC]" /></Field>
                  <Field label="Correo corporativo"><input disabled={!isEditingCompany} value={form.email} onChange={(e) => setCompanyDraft({ ...(companyDraft ?? form), email: e.target.value })} placeholder="Correo corporativo" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm disabled:bg-[#F8FAFC]" /></Field>
                  <Field label="Teléfono"><input disabled={!isEditingCompany} value={form.phone} onChange={(e) => setCompanyDraft({ ...(companyDraft ?? form), phone: e.target.value })} placeholder="Teléfono" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm disabled:bg-[#F8FAFC]" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ciudad"><input disabled={!isEditingCompany} value={form.city} onChange={(e) => setCompanyDraft({ ...(companyDraft ?? form), city: e.target.value })} placeholder="Ciudad" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm disabled:bg-[#F8FAFC]" /></Field>
                    <Field label="Dirección"><input disabled={!isEditingCompany} value={form.address} onChange={(e) => setCompanyDraft({ ...(companyDraft ?? form), address: e.target.value })} placeholder="Dirección" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm disabled:bg-[#F8FAFC]" /></Field>
                  </div>
                  <Field label="Sitio web"><input disabled={!isEditingCompany} value={form.website} onChange={(e) => setCompanyDraft({ ...(companyDraft ?? form), website: e.target.value })} placeholder="Sitio web" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm disabled:bg-[#F8FAFC]" /></Field>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-7">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Usuarios de la empresa</h3>
                  <p className="text-sm text-[#64748B]">Gestiona los usuarios con acceso al portal.</p>
                </div>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    const isExceeded = usage?.users?.max && usage?.users?.current >= usage?.users?.max;
                    if (isExceeded) {
                      setQuotaModal({
                        type: 'users',
                        title: '¡Se acabó tu cuota de usuarios!',
                        message: 'Has alcanzado el número máximo de usuarios permitidos en tu empresa. Mejora tu plan para agregar más miembros a tu equipo.'
                      });
                      return;
                    }
                    setUserModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Agregar usuario
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[#EEF2F7] bg-[#F8FAFC]">
                    <tr>
                      {['Usuario', 'Correo', 'Rol', 'Acciones'].map((head) => (
                        <th key={head} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#64748B]">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F7]">
                    {(users ?? []).map((user: CompanyUser, index: number) => (
                      <tr key={user.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF2FF] text-xs font-bold text-[#0B5CFF]">
                              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#0F172A]">{user.name || 'Sin nombre'} {index === 0 ? <span className="rounded-md bg-[#EAF2FF] px-1.5 py-0.5 text-[11px] text-[#0B5CFF]">Tu</span> : null}</p>
                              <p className="text-xs text-[#64748B]">{roleLabel[user.role ?? ''] || user.role || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#334155]">{user.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant={user.companyRole === 'company_admin' ? 'info' : user.companyRole === 'editor' ? 'success' : user.companyRole === 'viewer' ? 'purple' : 'default'}>
                            {roleLabel[user.companyRole ?? ''] || user.companyRole || '-'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button type="button" className="rounded-lg border border-[#E6ECF5] p-2 text-[#0B5CFF] hover:bg-[#F8FAFC]" onClick={() => setEditingUser(user)}><Edit className="h-4 w-4" /></button>
                            <button type="button" className="rounded-lg border border-[#FEE2E2] p-2 text-[#EF4444] hover:bg-[#FEF2F2]" onClick={() => deleteUserMutation.mutate(user.id)}><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!users?.length && (
                      <tr><td colSpan={4} className="px-4 py-16 text-center text-sm text-[#64748B]">Sin usuarios registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-5">
            <CardContent className="space-y-4 p-5">
              <h3 className="text-xl font-bold text-[#0F172A]">Tu plan actual</h3>
              <div className="flex items-center justify-between rounded-xl border border-[#E6ECF5] p-4">
                <div>
                  <p className="text-lg font-bold text-[#0F172A]">{billingPlan?.plan?.name || billingPlan?.name || currentPlanFromList?.name || 'Plan'}</p>
                  <p className="text-sm text-[#64748B]">Renovacion: {billingPlan?.renewalDate ? new Date(billingPlan.renewalDate).toLocaleDateString('es-NI') : '--'}</p>
                </div>
                <Badge variant="success">Activo</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E6ECF5] p-4">
                <Metric label="Publicaciones" current={usage?.jobs?.current ?? usage?.activeJobs?.current ?? 0} max={usage?.jobs?.max ?? usage?.activeJobs?.max ?? 0} />
                <Metric label="Usuarios" current={usage?.users?.current ?? 0} max={usage?.users?.max ?? 0} />
                <Metric label="Visibilidad candidatos" current={usage?.candidates?.current ?? usage?.visibleCandidates?.current ?? 0} max={usage?.candidates?.max ?? usage?.visibleCandidates?.max ?? 0} />
                <Metric label="Vacantes activas" current={usage?.activeJobs?.current ?? 0} max={usage?.activeJobs?.max ?? 0} />
              </div>

              <div className="rounded-xl border border-[#DCEBFF] bg-[#F8FBFF] px-4 py-3">
                <p className="text-sm font-semibold text-[#0F172A]">¿Necesitas más capacidad?</p>
                <p className="text-xs text-[#64748B]">Actualiza tu plan para aumentar los límites y seguir creciendo.</p>
                <Button className="mt-2 h-9" variant="outline" onClick={() => setAnnual(false)}>Actualizar plan</Button>
              </div>
            </CardContent>
          </Card>

          <div ref={plansRef} className="xl:col-span-7">
            <Card className={cn(
              "w-full transition-all duration-1000 ease-out",
              flashPlans
                ? "bg-blue-50 border-blue-400 ring-4 ring-blue-500/20 shadow-md"
                : ""
            )}>
              <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">Planes disponibles</h3>
                  <p className="text-sm text-[#64748B]">Elige el plan que mejor se adapte al crecimiento de tu empresa.</p>
                </div>
                <div className="flex items-center rounded-xl border border-[#E6ECF5] p-1">
                  <button type="button" onClick={() => setAnnual(false)} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', !annual ? 'bg-[#0B5CFF] text-white' : 'text-[#334155]')}>Mensual</button>
                  <button type="button" onClick={() => setAnnual(true)} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', annual ? 'bg-[#0B5CFF] text-white' : 'text-[#334155]')}>Anual -20%</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(availablePlans ?? []).map((plan: Plan) => {
                  const isCurrent = plan.id === currentPlanId;
                  const price = annual ? plan.price * 0.8 : plan.price;
                  return (
                    <div key={plan.id} className={cn('rounded-xl border p-4', isCurrent ? 'border-[#0B5CFF] bg-[#F8FBFF]' : 'border-[#E6ECF5]')}>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-2xl font-bold text-[#0F172A]">{plan.name}</h4>
                        {isCurrent ? <Badge variant="info">Actual</Badge> : null}
                      </div>
                      <p className="text-4xl font-bold text-[#0F172A]">C$ {Math.round(price).toLocaleString()} <span className="text-sm font-medium text-[#64748B]">/ mes</span></p>
                      <ul className="mt-4 space-y-2 text-sm text-[#475569]">
                        <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#16A34A]" /> {(plan.activeJobs ?? (plan as Plan & { publicationLimit?: number }).publicationLimit ?? 0) > 0 ? `${plan.activeJobs ?? (plan as Plan & { publicationLimit?: number }).publicationLimit} publicaciones por mes` : 'Publicaciones ilimitadas'}</li>
                        <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#16A34A]" /> {(plan.users ?? (plan as Plan & { userLimit?: number }).userLimit ?? 0) > 0 ? `${plan.users ?? (plan as Plan & { userLimit?: number }).userLimit} usuarios` : 'Usuarios ilimitados'}</li>
                        <li className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#16A34A]" /> {(plan.visibleCandidates ?? (plan as Plan & { visibleCandidatesLimit?: number }).visibleCandidatesLimit ?? 0) > 0 ? `${plan.visibleCandidates ?? (plan as Plan & { visibleCandidatesLimit?: number }).visibleCandidatesLimit} candidatos visibles` : 'Candidatos ilimitados'}</li>
                      </ul>
                      <Button className="mt-4 h-10 w-full" variant={isCurrent ? 'outline' : 'primary'} disabled={isCurrent || changePlanMutation.isPending} onClick={() => setPlanModal(plan)}>{isCurrent ? 'Plan actual' : 'Elegir plan'}</Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>

      {(userModalOpen || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setUserModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={(payload) => {
            if (editingUser) {
              editUserMutation.mutate({ id: editingUser.id, payload });
              return;
            }
            createUserMutation.mutate(payload);
          }}
          loading={createUserMutation.isPending || editUserMutation.isPending}
        />
      )}
      {planModal && (
        <PlanPaymentModal
          plan={planModal}
          loading={changePlanMutation.isPending}
          onClose={() => setPlanModal(null)}
          onConfirm={(reference) => {
            setPlanReference(reference);
            changePlanMutation.mutate(planModal.id);
          }}
        />
      )}
      {planReference ? <div className="fixed bottom-4 right-4 rounded-xl bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white">Referencia guardada: {planReference}</div> : null}

      {quotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all duration-300">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF5E6]">
                <AlertTriangle className="h-7 w-7 text-[#F59E0B]" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A]">{quotaModal.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#475569]">
                {quotaModal.message}
              </p>
            </div>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={handleCloseQuotaModal}
                className="w-full bg-[#0B5CFF] text-white hover:bg-[#004BDD] h-11 rounded-xl text-sm font-bold"
              >
                Ver planes y actualizar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#64748B]">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, current, max }: { label: string; current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div>
      <p className="text-sm font-semibold text-[#334155]">{label}</p>
      <p className="text-2xl font-bold text-[#0F172A]">{current} / {max}</p>
      <div className="mt-1 h-2 rounded-full bg-[#E6ECF5]">
        <div className="h-2 rounded-full bg-[#0B5CFF]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-[#64748B]">restantes {Math.max(0, max - current)}</p>
    </div>
  );
}

function UserModal({
  user,
  onClose,
  onSubmit,
  loading,
}: {
  user: CompanyUser | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  loading: boolean;
}) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState(user?.companyRole ?? user?.role ?? 'recruiter');
  const [status, setStatus] = useState(user?.status ?? 'active');
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">{user ? 'Editar usuario' : 'Agregar usuario'}</h3>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
        <form
          className="space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const payload: Record<string, unknown> = { name, companyRole: role, status };
            if (!user) {
              payload.email = email;
              payload.password = password;
            }
            onSubmit(payload);
          }}
        >
          {!user && <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required />}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm">
            <option value="company_admin">Administrador</option>
            <option value="recruiter">Reclutador</option>
            <option value="editor">Editor</option>
            <option value="viewer">Visor</option>
          </select>
          {user ? (
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          ) : (
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Contrasena temporal" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" required />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlanPaymentModal({
  plan,
  onClose,
  onConfirm,
  loading,
}: {
  plan: Plan;
  onClose: () => void;
  onConfirm: (reference: string) => void;
  loading: boolean;
}) {
  const [reference, setReference] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">Cambio de plan: {plan.name}</h3>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
        <div className="space-y-3 p-5 text-sm text-[#334155]">
          <p>Realiza el pago y guarda la referencia para activar el plan.</p>
          <div className="rounded-xl border border-[#E6ECF5] bg-[#F8FAFC] p-3">
            <p><strong>BAC:</strong> 123-456-789</p>
            <p><strong>LAFISE:</strong> 987-654-321</p>
            <p><strong>BANPRO:</strong> 456-789-123</p>
          </div>
          <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Número de referencia / comprobante" className="h-11 w-full rounded-xl border border-[#E6ECF5] px-3 text-sm" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={loading || !reference.trim()} onClick={() => onConfirm(reference)}>{loading ? 'Procesando...' : 'Confirmar cambio'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

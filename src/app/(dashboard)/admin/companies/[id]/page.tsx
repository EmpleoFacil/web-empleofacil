'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, Users, Briefcase, Calendar, FileText, MapPin,
  Phone, Mail, Globe, Edit, Plus, CheckCircle, TrendingUp, Clock, UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

interface CompanyUser {
  id: string;
  email: string;
  role: string;
  status: string;
  companyRole: string;
  createdAt: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  city?: string;
  createdAt: string;
  _count?: { applications: number };
}

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  candidate: { fullName: string };
  job: { id: string; title: string };
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  recruiter: 'Reclutador',
  editor: 'Editor',
  viewer: 'Visor',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-700',
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const companyId = params.id as string;

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showJobsDrawer, setShowJobsDrawer] = useState(false);
  const [showAppsDrawer, setShowAppsDrawer] = useState(false);

  const { data: company, isLoading } = useQuery({
    queryKey: ['company-detail', companyId],
    queryFn: () => api.get(`/companies/admin/${companyId}`).then(res => res.data),
  });

  const { data: users } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: () => api.get(`/companies/admin/${companyId}/users`).then(res => res.data),
  });

  const { data: metrics } = useQuery({
    queryKey: ['company-metrics', companyId],
    queryFn: () => api.get(`/companies/admin/${companyId}/metrics`).then(res => res.data),
  });

  const { data: jobsData } = useQuery({
    queryKey: ['company-jobs', companyId],
    queryFn: () => api.get(`/companies/admin/${companyId}/jobs`).then(res => res.data),
  });

  const { data: appsData } = useQuery({
    queryKey: ['company-applications', companyId],
    queryFn: () => api.get(`/companies/admin/${companyId}/applications`).then(res => res.data),
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get('/billing/plans').then(res => res.data),
  });

  const updateCompanyMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.patch(`/companies/admin/${companyId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-detail', companyId] });
      setShowEditModal(false);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: (planId: string) => api.patch(`/companies/admin/${companyId}/plan`, { planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-detail', companyId] });
      setShowPlanModal(false);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { email: string; role: string; password: string }) => api.post(`/companies/admin/${companyId}/users`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
      setShowUserModal(false);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Detalle de empresa" subtitle="Consulta la información operativa y comercial de la empresa." />

      <div className="p-6 space-y-6">
        {/* Breadcrumb */}
        <Link href="/admin/companies" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          Empresas / Detalle de empresa
        </Link>

        {/* Company Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-6">
                <div className="h-20 w-20 rounded-xl bg-blue-100 flex items-center justify-center">
                  {company?.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="h-20 w-20 rounded-xl object-cover" />
                  ) : (
                    <Building2 className="h-10 w-10 text-blue-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{company?.name}</h2>
                  <p className="text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4" />
                    {company?.city || 'Sin ubicación'}, Nicaragua
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <Badge variant={company?.status === 'active' ? 'success' : 'warning'}>
                      {company?.status === 'active' ? 'Activa' : company?.status}
                    </Badge>
                    <span className="text-sm text-gray-500">Desde {formatDate(company?.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-right mb-2">
                  <p className="text-sm text-gray-500">Plan actual</p>
                  <p className="font-semibold text-gray-900">{company?.plan?.name || 'Sin plan'}</p>
                  <p className="text-xs text-gray-400">Renovación en 28 días</p>
                </div>
                <Button onClick={() => setShowPlanModal(true)}>Cambiar plan</Button>
                <Button variant="outline" onClick={() => setShowUserModal(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar usuario
                </Button>
                <Button variant="outline" onClick={() => setShowEditModal(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar empresa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard
            title="Vacantes activas"
            value={metrics?.activeJobs?.value ?? 0}
            trend={metrics?.activeJobs?.trend}
            period="hace 30 días"
            icon={Briefcase}
          />
          <StatCard
            title="Postulaciones"
            value={metrics?.totalApplications?.value ?? 0}
            trend={metrics?.totalApplications?.trend}
            period="hace 30 días"
            icon={FileText}
          />
          <StatCard
            title="Entrevistas programadas"
            value={metrics?.scheduledInterviews?.value ?? 0}
            trend={metrics?.scheduledInterviews?.trend}
            period="hace 7 días"
            icon={Calendar}
          />
          <StatCard
            title="Contrataciones"
            value={metrics?.hires?.value ?? 0}
            trend={metrics?.hires?.trend}
            period="hace 30 días"
            icon={UserCheck}
          />
          <StatCard
            title="Tasa de respuesta"
            value="92%"
            trend={8}
            period="hace 30 días"
            icon={TrendingUp}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Información de la empresa</h3>
              <button onClick={() => setShowEditModal(true)} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                <Edit className="h-4 w-4" /> Editar
              </button>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Nombre de la empresa</dt>
                  <dd className="text-gray-900 font-medium">{company?.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Correo corporativo</dt>
                  <dd className="text-gray-900">{company?.email || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Teléfono</dt>
                  <dd className="text-gray-900">{company?.phone || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sitio web</dt>
                  <dd className="text-blue-600">{company?.website || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Ciudad</dt>
                  <dd className="text-gray-900">{company?.city || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Dirección</dt>
                  <dd className="text-gray-900 text-right max-w-[200px]">{company?.address || '-'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Usuarios de la empresa</h3>
              <span className="text-sm text-gray-500">Ver todos</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {users?.map((user: CompanyUser) => (
                  <div key={user.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{user.email.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500">{roleLabels[user.companyRole] || user.companyRole}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.status === 'active' ? 'success' : 'default'}>
                        {roleLabels[user.companyRole] || user.companyRole}
                      </Badge>
                      <button className="p-1 hover:bg-gray-100 rounded"><Edit className="h-4 w-4 text-gray-400" /></button>
                    </div>
                  </div>
                )) || <p className="px-6 py-4 text-sm text-gray-500">Sin usuarios</p>}
              </div>
              <div className="px-6 py-2 text-xs text-gray-500 border-t">
                Mostrando {users?.length || 0} de {users?.length || 0} usuarios
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Actividad reciente</h3>
              <span className="text-sm text-gray-500">Ver todas</span>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                {metrics?.recentActivity?.slice(0, 5).map((activity: { id: string; action: string; createdAt: string; metadata?: Record<string, unknown> }, i: number) => (
                  <div key={activity.id || i} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
                    </div>
                  </div>
                )) || <p className="text-sm text-gray-500">Sin actividad reciente</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs & Applications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Vacantes recientes</h3>
              <button onClick={() => setShowJobsDrawer(true)} className="text-blue-600 text-sm hover:underline">Ver todas</button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {jobsData?.jobs?.slice(0, 3).map((job: Job) => (
                  <div key={job.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{job.title}</p>
                        <Badge variant={job.status === 'active' ? 'success' : 'default'}>{job.status === 'active' ? 'Activa' : job.status}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">{job.city} • Publicada hace {Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24))} días</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{job._count?.applications || 0}</p>
                      <p className="text-xs text-gray-500">Postulaciones</p>
                    </div>
                  </div>
                )) || <p className="px-6 py-4 text-sm text-gray-500">Sin vacantes</p>}
              </div>
              <div className="px-6 py-3 border-t">
                <button onClick={() => setShowJobsDrawer(true)} className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                  Ver todas las vacantes →
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Applications Summary */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Postulaciones (resumen)</h3>
              <button onClick={() => setShowAppsDrawer(true)} className="text-blue-600 text-sm hover:underline">Ver reporte</button>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <dl className="space-y-3">
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-gray-500">Total de postulaciones</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-semibold">{metrics?.totalApplications?.value || 0}</span>
                    {metrics?.totalApplications?.trend > 0 && <span className="text-green-600 text-xs">↑ {metrics.totalApplications.trend}%</span>}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-gray-500">Nuevas este mes</dt>
                  <dd className="font-semibold">{appsData?.total || 0}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-gray-500">En proceso</dt>
                  <dd className="font-semibold">{appsData?.applications?.filter((a: Application) => ['reviewing', 'preselected', 'interview_scheduled'].includes(a.status)).length || 0}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-gray-500">Descartadas</dt>
                  <dd className="font-semibold">{appsData?.applications?.filter((a: Application) => a.status === 'rejected').length || 0}</dd>
                </div>
              </dl>
              <button onClick={() => setShowAppsDrawer(true)} className="mt-4 text-blue-600 text-sm hover:underline flex items-center gap-1">
                Ver todas las postulaciones →
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Company Modal */}
      {showEditModal && (
        <EditCompanyModal
          company={company}
          onClose={() => setShowEditModal(false)}
          onSubmit={(data) => updateCompanyMutation.mutate(data)}
          isLoading={updateCompanyMutation.isPending}
        />
      )}

      {/* Change Plan Modal */}
      {showPlanModal && (
        <ChangePlanModal
          currentPlanId={company?.planId}
          plans={plans}
          onClose={() => setShowPlanModal(false)}
          onSubmit={(planId) => updatePlanMutation.mutate(planId)}
          isLoading={updatePlanMutation.isPending}
        />
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <AddUserModal
          onClose={() => setShowUserModal(false)}
          onSubmit={(data) => createUserMutation.mutate(data)}
          isLoading={createUserMutation.isPending}
        />
      )}

      {/* Jobs Drawer */}
      {showJobsDrawer && (
        <Drawer title="Vacantes de la empresa" onClose={() => setShowJobsDrawer(false)}>
          <div className="space-y-3">
            {jobsData?.jobs?.map((job: Job) => (
              <div key={job.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{job.title}</p>
                    <p className="text-sm text-gray-500">{job.city} • {formatDate(job.createdAt)}</p>
                  </div>
                  <Badge variant={job.status === 'active' ? 'success' : 'default'}>{job.status}</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-2">{job._count?.applications || 0} postulaciones</p>
              </div>
            )) || <p className="text-gray-500">Sin vacantes</p>}
          </div>
        </Drawer>
      )}

      {/* Applications Drawer */}
      {showAppsDrawer && (
        <Drawer title="Postulaciones de la empresa" onClose={() => setShowAppsDrawer(false)}>
          <div className="space-y-3">
            {appsData?.applications?.map((app: Application) => (
              <div key={app.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{app.candidate.fullName}</p>
                    <p className="text-sm text-gray-500">{app.job.title}</p>
                  </div>
                  <Badge variant={app.status === 'hired' ? 'success' : app.status === 'rejected' ? 'danger' : 'default'}>{app.status}</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-2">{formatDate(app.appliedAt)}</p>
              </div>
            )) || <p className="text-gray-500">Sin postulaciones</p>}
          </div>
        </Drawer>
      )}
    </div>
  );
}

function EditCompanyModal({ company, onClose, onSubmit, isLoading }: { company: Record<string, unknown>; onClose: () => void; onSubmit: (data: Record<string, unknown>) => void; isLoading: boolean }) {
  const [form, setForm] = useState({
    name: (company?.name as string) || '',
    email: (company?.email as string) || '',
    phone: (company?.phone as string) || '',
    city: (company?.city as string) || '',
    address: (company?.address as string) || '',
    website: (company?.website as string) || '',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Editar empresa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sitio web</label>
                <input type="text" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" />
            </div>
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

function ChangePlanModal({ currentPlanId, plans, onClose, onSubmit, isLoading }: { currentPlanId?: string; plans?: { id: string; name: string; price: number }[]; onClose: () => void; onSubmit: (planId: string) => void; isLoading: boolean }) {
  const [selectedPlan, setSelectedPlan] = useState(currentPlanId || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Cambiar plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {plans?.map(plan => (
              <label key={plan.id} className={cn('flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer', selectedPlan === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200')}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="plan" checked={selectedPlan === plan.id} onChange={() => setSelectedPlan(plan.id)} className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{plan.name}</p>
                    <p className="text-sm text-gray-500">C$ {plan.price.toLocaleString()}/mes</p>
                  </div>
                </div>
                {currentPlanId === plan.id && <Badge variant="info">Actual</Badge>}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSubmit(selectedPlan)} disabled={isLoading || !selectedPlan}>{isLoading ? 'Guardando...' : 'Cambiar plan'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddUserModal({ onClose, onSubmit, isLoading }: { onClose: () => void; onSubmit: (data: { email: string; role: string; password: string }) => void; isLoading: boolean }) {
  const [form, setForm] = useState({ email: '', role: 'admin', password: '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Agregar usuario</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <div className="p-6">
          <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3">
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña temporal *</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full h-10 rounded-lg border border-gray-300 px-3" required />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>{isLoading ? 'Creando...' : 'Crear usuario'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

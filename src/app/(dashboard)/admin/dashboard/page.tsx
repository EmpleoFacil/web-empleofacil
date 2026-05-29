'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Briefcase, FileText, Activity, Clock } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { dashboard } from '@/lib/api';
import { formatDateTime, getStatusLabel } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: () => dashboard.getAdmin().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const { kpis, recentActivity, platformStatus } = data || {};

  return (
    <div className="min-h-screen">
      <Header 
        title="Panel de Administración" 
        subtitle="Vista general de la plataforma" 
      />

      <div className="p-6 space-y-6">
        {/* Platform Status */}
        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
            <span className="font-medium">Estado de la plataforma:</span>
            <span className="font-bold capitalize">{platformStatus || 'Operacional'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <span className="text-sm">Todos los sistemas funcionando</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Empresas"
            value={kpis?.companies?.value ?? 0}
            trend={kpis?.companies?.trend}
            period="mes anterior"
            icon={Building2}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Candidatos"
            value={kpis?.candidates?.value ?? 0}
            trend={kpis?.candidates?.trend}
            period="mes anterior"
            icon={Users}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            title="Vacantes Activas"
            value={kpis?.activeJobs?.value ?? 0}
            icon={Briefcase}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
          <StatCard
            title="Aplicaciones"
            value={kpis?.applications?.value ?? 0}
            icon={FileText}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
          <StatCard
            title="Documentos Pendientes"
            value={kpis?.documentsPending?.value ?? 0}
            icon={Clock}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentActivity?.length ? (
                recentActivity.map((activity: {
                  id: string;
                  status: string;
                  appliedAt: string;
                  candidate: { fullName: string };
                  job: { title: string; company: { name: string } };
                }) => (
                  <div key={activity.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {activity.candidate.fullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {activity.candidate.fullName}
                          <span className="font-normal text-gray-500"> aplicó a </span>
                          {activity.job.title}
                        </p>
                        <p className="text-sm text-gray-500">{activity.job.company.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={getStatusBadgeVariant(activity.status)}>
                        {getStatusLabel(activity.status)}
                      </Badge>
                      <p className="text-sm text-gray-400">{formatDateTime(activity.appliedAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <Activity className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No hay actividad reciente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Empresas por Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Profesional', count: 45, color: 'bg-blue-500' },
                  { name: 'Empresarial', count: 28, color: 'bg-purple-500' },
                  { name: 'Básico', count: 67, color: 'bg-gray-400' },
                ].map((plan) => (
                  <div key={plan.name} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{plan.name}</span>
                        <span className="text-sm text-gray-500">{plan.count} empresas</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className={`h-2 rounded-full ${plan.color}`}
                          style={{ width: `${(plan.count / 140) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métricas de Contratación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">72%</p>
                  <p className="text-sm text-gray-500">Tasa de respuesta</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">15 días</p>
                  <p className="text-sm text-gray-500">Tiempo promedio contratación</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">85%</p>
                  <p className="text-sm text-gray-500">Satisfacción empresas</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">4.2★</p>
                  <p className="text-sm text-gray-500">Rating candidatos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

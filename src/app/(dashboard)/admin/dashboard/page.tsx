'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Briefcase, FileText, Activity, Clock } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { dashboard } from '@/lib/api';
import { formatDateTime, getStatusLabel } from '@/lib/utils';

const kpiConfig = [
  { key: 'companies', title: 'Empresas', icon: Building2, bg: 'bg-[#EAF2FF]', color: 'text-[#0B5CFF]', href: '/admin/companies' },
  { key: 'candidates', title: 'Candidatos', icon: Users, bg: 'bg-[#EAF8EF]', color: 'text-[#16A34A]', href: '/admin/candidates' },
  { key: 'activeJobs', title: 'Vacantes Activas', icon: Briefcase, bg: 'bg-[#F5EAFE]', color: 'text-[#A855F7]', href: '/admin/jobs' },
  { key: 'applications', title: 'Aplicaciones', icon: FileText, bg: 'bg-[#FFF5E6]', color: 'text-[#F59E0B]' },
  { key: 'documentsPending', title: 'Documentos Pendientes', icon: Clock, bg: 'bg-[#FEECEC]', color: 'text-[#EF4444]', href: '/admin/candidates' },
];

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: () => dashboard.getAdmin().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" />
      </div>
    );
  }

  const { kpis, recentActivity, platformStatus } = data || {};

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title="Panel de Administracion"
        subtitle="Vista general de la plataforma"
      />

      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between rounded-[20px] bg-gradient-to-r from-[#16A34A] to-[#15803D] px-6 py-5 text-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-3 w-3 items-center justify-center">
              <div className="h-3 w-3 animate-pulse rounded-full bg-white" />
            </div>
            <span className="text-sm font-semibold">Estado de la plataforma:</span>
            <span className="text-sm font-bold capitalize">{platformStatus || 'Operacional'}</span>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Activity className="h-5 w-5" />
            <span className="text-sm font-medium">Todos los sistemas funcionando</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {kpiConfig.map((kpi) => {
            const Icon = kpi.icon;
            const kpiData = kpis?.[kpi.key] || { value: 0 };
            const trend = kpiData.trend;
            const isPositive = trend !== undefined && trend >= 0;

            const card = (
              <div className="rounded-[20px] border border-[#EAEFF7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors hover:border-[#DCEBFF]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[#64748B]">{kpi.title}</p>
                    <p className="mt-2 text-[40px] font-bold leading-[44px] text-[#0F172A]">{kpiData.value}</p>
                    {trend !== undefined && (
                      <div className="mt-2 flex items-center gap-1">
                        <span className={isPositive ? 'text-[#16A34A]' : 'text-[#EF4444]'}>
                          {isPositive ? '+' : ''}{trend}%
                        </span>
                        <span className="text-xs text-[#94A3B8]">mes anterior</span>
                      </div>
                    )}
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.bg}`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
              </div>
            );

            return kpi.href ? (
              <Link key={kpi.key} href={kpi.href} className="block">
                {card}
              </Link>
            ) : (
              <div key={kpi.key}>{card}</div>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#EEF2F7]">
              {recentActivity?.length ? (
                recentActivity.map((activity: {
                  id: string;
                  status: string;
                  appliedAt: string;
                  candidate: { fullName: string };
                  job: { title: string; company: { name: string } };
                }) => (
                  <div key={activity.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[#F8FAFC]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF2FF]">
                        <span className="text-sm font-bold text-[#0B5CFF]">
                          {activity.candidate.fullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">
                          {activity.candidate.fullName}
                          <span className="font-normal text-[#64748B]"> aplico a </span>
                          {activity.job.title}
                        </p>
                        <p className="text-xs font-medium text-[#94A3B8]">{activity.job.company.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={getStatusBadgeVariant(activity.status)}>
                        {getStatusLabel(activity.status)}
                      </Badge>
                      <p className="text-xs font-medium text-[#94A3B8]">{formatDateTime(activity.appliedAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                  <Activity className="h-12 w-12 text-[#CBD5E1]" />
                  <p className="text-sm font-semibold text-[#64748B]">No hay actividad reciente</p>
                  <p className="text-xs text-[#94A3B8]">La actividad de candidatos aparecera aqui.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Empresas por Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {[
                  { name: 'Profesional', count: 45, color: 'bg-[#0B5CFF]' },
                  { name: 'Empresarial', count: 28, color: 'bg-[#A855F7]' },
                  { name: 'Basico', count: 67, color: 'bg-[#94A3B8]' },
                ].map((plan) => (
                  <div key={plan.name}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#334155]">{plan.name}</span>
                      <span className="text-xs font-medium text-[#64748B]">{plan.count} empresas</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#F1F5F9]">
                      <div
                        className={`h-2.5 rounded-full ${plan.color}`}
                        style={{ width: `${(plan.count / 140) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metricas de Contratacion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p className="text-[32px] font-bold leading-none text-[#0F172A]">72%</p>
                  <p className="mt-2 text-xs font-medium text-[#64748B]">Tasa de respuesta</p>
                </div>
                <div className="text-center">
                  <p className="text-[32px] font-bold leading-none text-[#0F172A]">15 dias</p>
                  <p className="mt-2 text-xs font-medium text-[#64748B]">Tiempo promedio contratacion</p>
                </div>
                <div className="text-center">
                  <p className="text-[32px] font-bold leading-none text-[#0F172A]">85%</p>
                  <p className="mt-2 text-xs font-medium text-[#64748B]">Satisfaccion empresas</p>
                </div>
                <div className="text-center">
                  <p className="text-[32px] font-bold leading-none text-[#0F172A]">4.2&#9733;</p>
                  <p className="mt-2 text-xs font-medium text-[#64748B]">Rating candidatos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

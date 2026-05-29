'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Briefcase,
  Users,
  Calendar,
  MapPin,
  Plus,
  ArrowUpRight,
  Clock3,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/lib/api';
import { formatDateTime, getStatusLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

type DashboardKpi = {
  value: number;
  trend?: number;
};

type RecentJob = {
  id: string;
  title: string;
  city: string | null;
  status: string;
  applications: number;
};

type UpcomingInterview = {
  id: string;
  date: string;
  type?: string | null;
  candidate?: { fullName?: string | null };
  job?: { title?: string | null };
};

type RecentMessage = {
  id: string;
  subject?: string | null;
  createdAt: string;
  candidate?: { fullName?: string | null };
};

const monthShort = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const dayNumber = new Intl.DateTimeFormat('es-ES', { day: '2-digit' });
const hourShort = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-company'],
    queryFn: () => dashboard.getCompany().then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const { kpis, recentJobs, upcomingInterviews, recentMessages, plan } = data || {};

  const companyLabel = user?.companyName || data?.company?.name || 'Equipo';
  const firstName = companyLabel.split(' ')[0] || 'Equipo';

  const metrics = [
    {
      key: 'activeJobs',
      title: 'Vacantes activas',
      icon: Briefcase,
      iconWrap: 'bg-emerald-100 text-emerald-600',
      data: (kpis?.activeJobs as DashboardKpi | undefined) || { value: 0, trend: 0 },
      period: 'vs. 30 dias',
    },
    {
      key: 'applications',
      title: 'Candidatos recibidos',
      icon: Users,
      iconWrap: 'bg-blue-100 text-blue-600',
      data: (kpis?.applications as DashboardKpi | undefined) || { value: 0, trend: 0 },
      period: 'vs. 30 dias',
    },
    {
      key: 'interviewsWeek',
      title: 'Entrevistas esta semana',
      icon: Calendar,
      iconWrap: 'bg-violet-100 text-violet-600',
      data: (kpis?.interviewsWeek as DashboardKpi | undefined) || { value: 0, trend: 0 },
      period: 'vs. 7 dias',
    },
    {
      key: 'messagesUnread',
      title: 'Mensajes pendientes',
      icon: Star,
      iconWrap: 'bg-amber-100 text-amber-600',
      data: (kpis?.messagesUnread as DashboardKpi | undefined) || { value: 0, trend: 0 },
      period: 'vs. 7 dias',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Resumen" subtitle="Monitorea la actividad de reclutamiento de tu empresa." />

      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Hola, {firstName}</h2>
            <p className="mt-1 text-sm text-slate-600">Aqui tienes un resumen rapido de tu operacion.</p>
          </div>
          <Link href="/jobs/new">
            <Button className="h-11 px-5">
              <Plus className="h-4 w-4" />
              Publicar vacante
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const trendValue = metric.data.trend ?? 0;
            const positive = trendValue >= 0;

            return (
              <Card key={metric.key}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${metric.iconWrap}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.title}</p>
                      <p className="text-4xl font-semibold leading-none text-slate-900">{metric.data.value}</p>
                    </div>
                  </div>
                  <p className={`text-xs font-medium ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {positive ? '+' : '-'}
                    {Math.abs(trendValue)}% {metric.period}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Ultimas vacantes</CardTitle>
              <Link href="/jobs" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Ver todas
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Puesto</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ciudad</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Postulaciones</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(recentJobs as RecentJob[] | undefined)?.length ? (
                      (recentJobs as RecentJob[]).map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-700">
                              {job.title}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {job.city || 'Remoto'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm font-semibold text-slate-900">{job.applications}</td>
                          <td className="px-5 py-3">
                            <Badge variant={getStatusBadgeVariant(job.status)}>{getStatusLabel(job.status)}</Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-5 py-12 text-center text-sm text-slate-500" colSpan={4}>
                          No hay vacantes recientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entrevistas proximas</CardTitle>
                <Link href="/interviews" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Ver calendario
                </Link>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {(upcomingInterviews as UpcomingInterview[] | undefined)?.length ? (
                  (upcomingInterviews as UpcomingInterview[]).map((interview) => {
                    const date = new Date(interview.date);
                    const month = monthShort.format(date).replace('.', '').toUpperCase();
                    const day = dayNumber.format(date);
                    const time = hourShort.format(date);
                    const type = interview.type === 'presencial' ? 'Presencial' : 'Videoentrevista';

                    return (
                      <div key={interview.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="w-10 shrink-0 text-center">
                          <p className="text-xs font-semibold text-blue-600">{month}</p>
                          <p className="text-2xl font-semibold leading-none text-slate-900">{day}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{interview.candidate?.fullName || 'Candidato'}</p>
                          <p className="truncate text-xs text-slate-500">{interview.job?.title || 'Vacante'}</p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            {time}
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">{type}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No hay entrevistas programadas.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mensajes no leidos</CardTitle>
                <Link href="/messages" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Ver todos
                </Link>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {(recentMessages as RecentMessage[] | undefined)?.length ? (
                  (recentMessages as RecentMessage[]).map((message) => {
                    const fullName = message.candidate?.fullName || 'Candidato';
                    const firstLetter = fullName.charAt(0).toUpperCase();

                    return (
                      <div key={message.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                          {firstLetter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
                          <p className="truncate text-xs text-slate-500">{message.subject || 'Mensaje sin asunto'}</p>
                          <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(message.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No tienes mensajes nuevos.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {plan && (
          <Card className="border-blue-200 bg-blue-50/40">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Publica mas vacantes y acelera tu reclutamiento.</p>
                <p className="text-sm text-slate-600">
                  Tu plan <span className="font-semibold text-slate-900">{plan.name}</span> tiene {plan.jobsThisMonth}/{plan.maxJobs} publicaciones usadas este mes.
                </p>
              </div>
              <Link href="/settings">
                <Button variant="outline" className="h-10 border-blue-200 bg-white text-blue-700 hover:bg-blue-50">
                  Ver detalles del plan
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

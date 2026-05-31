'use client';

import { useQueries } from '@tanstack/react-query';
import {
  Briefcase,
  Users,
  Calendar,
  Star,
  MapPin,
  Plus,
  ArrowUpRight,
  Clock3,
  CalendarDays,
  MessageSquareText,
  AlertCircle,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/ui/header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { dashboard, companies } from '@/lib/api';
import { formatDateTime, getStatusLabel, getDisplayName } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { dashboardQueryOptions, queryKeys } from '@/lib/query-config';

type DashboardKpi = {
  value: number;
  trend?: number;
  period?: string;
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
  modality?: string | null;
  type?: string | null;
  candidate?: { fullName?: string | null };
  job?: { title?: string | null };
};

type RecentMessage = {
  id: string;
  title?: string | null;
  subject?: string | null;
  status?: string;
  createdAt: string;
  sentAt?: string | null;
  candidate?: { fullName?: string | null };
};

type PlanLimits = {
  plan?: { name?: string };
  limits?: {
    activeJobs?: { current?: number; max?: number; remaining?: number };
  };
  usage?: { jobsThisMonth?: number };
};

type CompanyDashboard = {
  kpis?: Record<string, DashboardKpi>;
  recentJobs?: RecentJob[];
  upcomingInterviews?: UpcomingInterview[];
  recentMessages?: RecentMessage[];
  company?: { name?: string };
  plan?: { name?: string; jobsThisMonth?: number; maxJobs?: number };
};

const monthShort = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const dayNumber = new Intl.DateTimeFormat('es-ES', { day: '2-digit' });
const hourShort = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

const kpiIcons: Record<string, { icon: typeof Briefcase; bg: string; color: string }> = {
  activeJobs: { icon: Briefcase, bg: 'bg-[#EAF2FF]', color: 'text-[#0B5CFF]' },
  applications: { icon: Users, bg: 'bg-[#EAF8EF]', color: 'text-[#16A34A]' },
  interviewsWeek: { icon: Calendar, bg: 'bg-[#F5EAFE]', color: 'text-[#A855F7]' },
  messagesUnread: { icon: Star, bg: 'bg-[#FFF5E6]', color: 'text-[#F59E0B]' },
};

function formatKpiPeriod(period?: string): string {
  if (period === '7d') return 'hace 7 días';
  if (period === '30d') return 'hace 30 días';
  return period ? `vs. ${period}` : 'hace 30 días';
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] animate-pulse">
      <div className="h-[76px] border-b border-[#E6ECF5] bg-white" />
      <div className="border-b border-[#E6ECF5] bg-white px-8 py-6">
        <div className="h-9 w-48 rounded-lg bg-[#E2E8F0]" />
        <div className="mt-2 h-5 w-72 rounded-lg bg-[#F1F5F9]" />
      </div>
      <div className="space-y-6 p-8">
        <div className="h-10 w-64 rounded-lg bg-[#E2E8F0]" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[140px] rounded-[20px] bg-white border border-[#EAEFF7]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 h-[360px] rounded-[20px] bg-white border border-[#EAEFF7]" />
          <div className="space-y-6">
            <div className="h-[280px] rounded-[20px] bg-white border border-[#EAEFF7]" />
            <div className="h-[200px] rounded-[20px] bg-white border border-[#EAEFF7]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [dashboardQuery, planLimitsQuery] = useQueries({
    queries: [
      {
        queryKey: queryKeys.dashboardCompany,
        queryFn: () => dashboard.getCompany().then((res) => res.data as CompanyDashboard),
        ...dashboardQueryOptions,
      },
      {
        queryKey: queryKeys.planLimits,
        queryFn: () => companies.getPlanLimits().then((res) => res.data as PlanLimits),
        ...dashboardQueryOptions,
      },
    ],
  });

  const isInitialLoading =
    (dashboardQuery.isPending && !dashboardQuery.data) ||
    (planLimitsQuery.isPending && !planLimitsQuery.data);

  const hasError = dashboardQuery.isError || planLimitsQuery.isError;

  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }

  const data = dashboardQuery.data;
  const planLimits = planLimitsQuery.data;
  const kpis = data?.kpis;
  const recentJobs = data?.recentJobs ?? [];
  const upcomingInterviews = data?.upcomingInterviews ?? [];
  const recentMessages = data?.recentMessages ?? [];

  const firstName = getDisplayName(user?.email);
  const remainingSlots = planLimits?.limits?.activeJobs?.remaining ?? 0;
  const canPublish = remainingSlots > 0;

  const maxPublications =
    planLimits?.limits?.activeJobs?.max ?? data?.plan?.maxJobs ?? 0;
  const jobsThisMonth = planLimits?.usage?.jobsThisMonth ?? data?.plan?.jobsThisMonth ?? 0;
  const remainingPublications = Math.max(0, maxPublications - jobsThisMonth);

  const metrics = [
    {
      key: 'activeJobs',
      title: 'Vacantes activas',
      data: kpis?.activeJobs ?? { value: 0, trend: 0, period: '30d' },
    },
    {
      key: 'applications',
      title: 'Candidatos recibidos',
      data: kpis?.applications ?? { value: 0, trend: 0, period: '30d' },
    },
    {
      key: 'interviewsWeek',
      title: 'Entrevistas esta semana',
      data: kpis?.interviewsWeek ?? { value: 0, trend: 0, period: '7d' },
    },
    {
      key: 'messagesUnread',
      title: 'Mensajes pendientes',
      data: kpis?.messagesUnread ?? { value: 0, trend: 0, period: '7d' },
    },
  ];

  const handlePublishClick = () => {
    if (!canPublish) {
      router.push('/settings');
      return;
    }
    router.push('/jobs/new');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        title={`¡Hola, ${firstName}! 👋`}
        subtitle="Aquí tienes el resumen de tu actividad en Empleo."
        actions={
          <Button className="h-11 gap-2" onClick={handlePublishClick}>
            <Plus className="h-4 w-4" />
            Publicar vacante
          </Button>
        }
      />

      <div className="space-y-6 p-8">
        {hasError && (
          <div className="flex items-center gap-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>No se pudo cargar parte del resumen. Intenta recargar la página.</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const style = kpiIcons[metric.key];
            const Icon = style.icon;

            return (
              <StatCard
                key={metric.key}
                title={metric.title}
                value={metric.data.value}
                trend={metric.data.trend}
                period={formatKpiPeriod(metric.data.period)}
                icon={Icon}
                iconBg={style.bg}
                iconColor={style.color}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Últimas vacantes</CardTitle>
              <Link href="/jobs" className="text-[13px] font-bold text-[#0B5CFF] hover:text-[#004BDD]">
                Ver todas
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-[#EEF2F7]">
                      <th className="px-6 py-4 text-left text-[12px] font-bold uppercase tracking-wide text-[#64748B]">
                        Puesto
                      </th>
                      <th className="px-6 py-4 text-left text-[12px] font-bold uppercase tracking-wide text-[#64748B]">
                        Ciudad
                      </th>
                      <th className="px-6 py-4 text-left text-[12px] font-bold uppercase tracking-wide text-[#64748B]">
                        Postulaciones
                      </th>
                      <th className="px-6 py-4 text-left text-[12px] font-bold uppercase tracking-wide text-[#64748B]">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF2F7]">
                    {recentJobs.length ? (
                      recentJobs.map((job) => (
                        <tr key={job.id} className="transition-colors hover:bg-[#F8FAFC]">
                          <td className="px-6 py-4">
                            <Link
                              href={`/jobs/${job.id}`}
                              className="text-sm font-semibold text-[#0F172A] hover:text-[#0B5CFF]"
                            >
                              {job.title}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#64748B]">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-[#94A3B8]" />
                              {job.city || 'Remoto'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-[#0F172A]">
                            {job.applications}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={getStatusBadgeVariant(job.status)}>
                              {getStatusLabel(job.status)}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-6 py-16 text-center" colSpan={4}>
                          <div className="mx-auto flex flex-col items-center gap-3">
                            <Briefcase className="h-10 w-10 text-[#CBD5E1]" />
                            <p className="text-sm font-medium text-[#94A3B8]">No hay vacantes recientes.</p>
                            <Button variant="outline" size="sm" onClick={handlePublishClick}>
                              <Plus className="h-3.5 w-3.5" />
                              Publicar primera vacante
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Entrevistas próximas</CardTitle>
                <Link
                  href="/interviews"
                  className="text-[13px] font-bold text-[#0B5CFF] hover:text-[#004BDD]"
                >
                  Ver calendario
                </Link>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                {upcomingInterviews.length ? (
                  upcomingInterviews.map((interview) => {
                    const date = new Date(interview.date);
                    const month = monthShort.format(date).replace('.', '').toUpperCase();
                    const day = dayNumber.format(date);
                    const time = hourShort.format(date);
                    const modality = interview.modality ?? interview.type ?? '';
                    const isPresencial = modality === 'presencial' || modality === 'in_person';
                    const typeLabel = isPresencial ? 'Presencial' : 'Videoentrevista';

                    return (
                      <div
                        key={interview.id}
                        className="flex items-start gap-4 rounded-[18px] border border-[#E6ECF5] p-4 transition-colors hover:bg-[#F8FAFC]"
                      >
                        <div className="w-12 shrink-0 text-center">
                          <p className="text-[11px] font-bold text-[#0B5CFF]">{month}</p>
                          <p className="text-[28px] font-bold leading-none text-[#0F172A]">{day}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0F172A]">
                            {interview.candidate?.fullName || 'Candidato'}
                          </p>
                          <p className="truncate text-xs font-medium text-[#64748B]">
                            {interview.job?.title || 'Vacante'}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
                            <Clock3 className="h-3.5 w-3.5" />
                            {time}
                          </p>
                        </div>
                        <span
                          className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold ${
                            isPresencial
                              ? 'bg-[#EAF8EF] text-[#16A34A]'
                              : 'bg-[#EAF2FF] text-[#0B5CFF]'
                          }`}
                        >
                          {isPresencial ? (
                            <MapPin className="h-3 w-3" />
                          ) : (
                            <Video className="h-3 w-3" />
                          )}
                          {typeLabel}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <CalendarDays className="h-10 w-10 text-[#CBD5E1]" />
                    <div>
                      <p className="text-sm font-semibold text-[#64748B]">No tienes entrevistas próximas</p>
                      <p className="mt-1 text-xs text-[#94A3B8]">
                        Cuando programes entrevistas, aparecerán aquí.
                      </p>
                    </div>
                    <Link href="/interviews">
                      <Button variant="outline" size="sm">
                        Programar entrevista
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensajes no leídos</CardTitle>
                <Link
                  href="/messages"
                  className="text-[13px] font-bold text-[#0B5CFF] hover:text-[#004BDD]"
                >
                  Ver todos
                </Link>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                {recentMessages.length ? (
                  recentMessages.map((message) => {
                    const fullName = message.candidate?.fullName || 'Candidato';
                    const firstLetter = fullName.charAt(0).toUpperCase();
                    const messageTitle = message.title || message.subject || 'Mensaje sin asunto';
                    const timestamp = message.sentAt || message.createdAt;

                    return (
                      <div
                        key={message.id}
                        className="flex items-start gap-3 rounded-[18px] border border-[#E6ECF5] p-4 transition-colors hover:bg-[#F8FAFC]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF2FF] text-sm font-bold text-[#0B5CFF]">
                          {firstLetter}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0F172A]">{fullName}</p>
                          <p className="truncate text-xs font-medium text-[#64748B]">{messageTitle}</p>
                          <p className="mt-1 text-[11px] font-medium text-[#94A3B8]">
                            {formatDateTime(timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <MessageSquareText className="h-10 w-10 text-[#CBD5E1]" />
                    <div>
                      <p className="text-sm font-semibold text-[#64748B]">Bandeja vacía</p>
                      <p className="mt-1 text-xs text-[#94A3B8]">
                        Los mensajes de candidatos aparecerán aquí.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {maxPublications > 0 && (
          <Card className="border-[#DCEBFF] bg-[#F8FBFF]">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="text-base font-bold text-[#0F172A]">
                  Publica más vacantes y encuentra al talento ideal
                </p>
                <p className="mt-1 text-sm font-medium text-[#64748B]">
                  Tienes{' '}
                  <span className="font-semibold text-[#0F172A]">{remainingPublications}</span>{' '}
                  publicaciones disponibles en tu plan actual
                  {(planLimits?.plan?.name ?? data?.plan?.name) ? (
                    <>
                      {' '}
                      (
                      <span className="font-semibold text-[#0F172A]">
                        {planLimits?.plan?.name ?? data?.plan?.name}
                      </span>
                      )
                    </>
                  ) : null}
                  .
                </p>
              </div>
              <Link href="/settings">
                <Button
                  variant="outline"
                  className="h-10 border-[#DCEBFF] bg-white text-[#0B5CFF] hover:bg-[#EAF2FF]"
                >
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

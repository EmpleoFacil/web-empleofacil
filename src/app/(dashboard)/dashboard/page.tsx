'use client';

import { useQuery } from '@tanstack/react-query';
import { Briefcase, Users, Calendar, MessageSquare, MapPin, MoreVertical, Plus } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/ui/header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, getStatusBadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/lib/api';
import { formatDateTime, getStatusLabel } from '@/lib/utils';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-company'],
    queryFn: () => dashboard.getCompany().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const { kpis, recentJobs, upcomingInterviews, recentMessages, plan } = data || {};

  return (
    <div className="min-h-screen">
      <Header 
        title="Dashboard" 
        subtitle={`Bienvenido de vuelta. Aquí está el resumen de tu actividad.`} 
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Vacantes Activas"
            value={kpis?.activeJobs?.value ?? 0}
            trend={kpis?.activeJobs?.trend}
            period="mes anterior"
            icon={Briefcase}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Aplicaciones"
            value={kpis?.applications?.value ?? 0}
            trend={kpis?.applications?.trend}
            period="mes anterior"
            icon={Users}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            title="Entrevistas esta semana"
            value={kpis?.interviewsWeek?.value ?? 0}
            trend={kpis?.interviewsWeek?.trend}
            period="semana anterior"
            icon={Calendar}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
          />
          <StatCard
            title="Mensajes sin leer"
            value={kpis?.messagesUnread?.value ?? 0}
            trend={kpis?.messagesUnread?.trend}
            period="semana anterior"
            icon={MessageSquare}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
        </div>

        {/* Plan Info */}
        {plan && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Plan actual</p>
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Vacantes publicadas este mes</p>
                  <p className="text-lg font-semibold">
                    <span className="text-blue-600">{plan.jobsThisMonth}</span>
                    <span className="text-gray-400"> / {plan.maxJobs}</span>
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Mejorar plan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Jobs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Vacantes recientes</CardTitle>
              <Link href="/jobs">
                <Button variant="ghost" size="sm">Ver todas</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {recentJobs?.length ? (
                  recentJobs.map((job: { id: string; title: string; city: string | null; status: string; applications: number }) => (
                    <div key={job.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <Link href={`/jobs/${job.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {job.title}
                          </Link>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.city || 'Remoto'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{job.applications}</p>
                          <p className="text-xs text-gray-500">aplicaciones</p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          {getStatusLabel(job.status)}
                        </Badge>
                        <button className="p-1 rounded hover:bg-gray-100">
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No hay vacantes aún</p>
                    <Link href="/jobs/new">
                      <Button variant="primary" size="sm" className="mt-4">
                        <Plus className="h-4 w-4" />
                        Crear vacante
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Interviews */}
          <Card>
            <CardHeader>
              <CardTitle>Próximas entrevistas</CardTitle>
              <Link href="/interviews">
                <Button variant="ghost" size="sm">Ver todas</Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {upcomingInterviews?.length ? (
                  upcomingInterviews.map((interview: { id: string; date: string; candidate: { fullName: string }; job: { title: string } }) => (
                    <div key={interview.id} className="px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{interview.candidate.fullName}</p>
                          <p className="text-sm text-gray-500">{interview.job.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-600">
                            {formatDateTime(interview.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No hay entrevistas programadas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Mensajes recientes</CardTitle>
            <Link href="/messages">
              <Button variant="ghost" size="sm">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {recentMessages?.length ? (
                recentMessages.map((message: { id: string; subject: string; createdAt: string; candidate: { fullName: string } }) => (
                  <div key={message.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {message.candidate.fullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{message.candidate.fullName}</p>
                        <p className="text-sm text-gray-500 truncate max-w-md">{message.subject}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">{formatDateTime(message.createdAt)}</p>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">No hay mensajes recientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

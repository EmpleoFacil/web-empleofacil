'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  MessageSquare,
  Building2,
  Settings,
  LogOut,
  Hexagon,
  ChevronDown,
} from 'lucide-react';
import { cn, getDisplayName, getRoleLabel } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { companies, dashboard } from '@/lib/api';
import { dashboardQueryOptions, queryKeys } from '@/lib/query-config';

const companyNavItems = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/jobs', label: 'Vacantes', icon: Briefcase },
  { href: '/candidates', label: 'Candidatos', icon: Users },
  { href: '/interviews', label: 'Entrevistas', icon: Calendar },
  { href: '/messages', label: 'Mensajes', icon: MessageSquare },
  { href: '/settings', label: 'Configuracion', icon: Settings },
];

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/admin/jobs', label: 'Vacantes', icon: Briefcase },
  { href: '/admin/candidates', label: 'Candidatos', icon: Users },
  { href: '/admin/companies', label: 'Empresas', icon: Building2 },
  { href: '/admin/commercial', label: 'Comercial', icon: Settings },
];

type PlanLimitsResponse = {
  plan?: { name?: string };
  limits?: { activeJobs?: { max?: number } };
  usage?: { jobsThisMonth?: number };
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'super_admin';
  const navItems = isAdmin ? adminNavItems : companyNavItems;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: planLimits } = useQuery({
    queryKey: queryKeys.planLimits,
    queryFn: () => companies.getPlanLimits().then((res) => res.data as PlanLimitsResponse),
    enabled: !isAdmin && !!user,
    ...dashboardQueryOptions,
  });

  const { data: dashboardData } = useQuery({
    queryKey: queryKeys.dashboardCompany,
    queryFn: () => dashboard.getCompany().then((res) => res.data),
    enabled: !isAdmin && !!user,
    ...dashboardQueryOptions,
  });

  const jobsThisMonth = planLimits?.usage?.jobsThisMonth ?? 0;
  const maxPublications = planLimits?.limits?.activeJobs?.max ?? 0;
  const publicationPct =
    maxPublications > 0 ? Math.min(100, Math.round((jobsThisMonth / maxPublications) * 100)) : 0;

  const unreadMessages =
    (dashboardData?.kpis?.messagesUnread as { value?: number } | undefined)?.value ?? 0;

  const companyName = user?.companyName ?? dashboardData?.company?.name ?? 'Empresa';
  const planName = planLimits?.plan?.name ?? dashboardData?.plan?.name ?? 'Plan';
  const displayName = getDisplayName(user?.email);
  const roleLabel = getRoleLabel(user?.role ?? 'company_admin', user?.companyUserRole);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[272px] flex-col border-r border-[#E6ECF5] bg-white">
      <div className="flex h-[76px] items-center border-b border-[#F1F5F9] px-6">
        <Link href={isAdmin ? '/admin/dashboard' : '/dashboard'} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B5CFF] text-white shadow-sm">
            <Hexagon className="h-5 w-5 fill-white stroke-white" />
          </div>
          <span className="text-[28px] font-bold tracking-tight text-[#0F172A]">Empleo</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const showMessageBadge = item.href === '/messages' && !isAdmin && unreadMessages > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-[46px] items-center gap-3 rounded-xl px-3 text-sm font-bold transition-all',
                  isActive
                    ? 'bg-[#EEF4FF] text-[#0B5CFF]'
                    : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155]'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-[#0B5CFF]' : 'text-[#94A3B8]')} />
                <span className="flex-1">{item.label}</span>
                {showMessageBadge && (
                  <span className="rounded-full bg-[#0B5CFF] px-2 py-0.5 text-[11px] font-semibold text-white">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="space-y-3 border-t border-[#F1F5F9] p-4">
        {!isAdmin && (
          <div className="rounded-[18px] border border-[#E6ECF5] bg-[#F8FAFC] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B5CFF] text-xs font-bold text-white shadow-sm">
                {companyName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#0F172A]">{companyName}</p>
                <p className="truncate text-[12px] font-medium text-[#64748B]">{planName}</p>
              </div>
            </div>

            {maxPublications > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[12px] text-[#64748B]">
                  <span>Publicaciones este mes</span>
                  <span className="font-semibold text-[#334155]">
                    {jobsThisMonth} / {maxPublications}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#E6ECF5]">
                  <div
                    className="h-2 rounded-full bg-[#0B5CFF] transition-all"
                    style={{ width: `${publicationPct}%` }}
                  />
                </div>
              </div>
            )}

            <Link
              href="/settings"
              className="mt-3 inline-flex text-[12px] font-bold text-[#0B5CFF] hover:text-[#004BDD]"
            >
              Ver detalles del plan
            </Link>
          </div>
        )}

        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-[18px] border border-[#E6ECF5] bg-white p-3 transition-colors hover:border-[#D1D9E6]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F172A] text-xs font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-[13px] font-semibold text-[#0F172A]">{displayName}</p>
                <p className="text-[12px] font-medium text-[#64748B]">{roleLabel}</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8]" />
          </button>
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-[14px] border border-[#E6ECF5] bg-white py-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#EF4444] hover:bg-[#FEF2F2]"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

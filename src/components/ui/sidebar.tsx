'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

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

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navItems = user?.role === 'super_admin' ? adminNavItems : companyNavItems;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-slate-200 px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Hexagon className="h-5 w-5 fill-white stroke-white" />
            </div>
            <span className="text-3xl font-semibold tracking-tight text-slate-900">Empleo</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const hasMessageBadge = item.href === '/messages' && user?.role !== 'super_admin';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {hasMessageBadge && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">0</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-slate-200 p-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-semibold text-white">
                {user?.companyName?.charAt(0).toUpperCase() || 'E'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">{user?.companyName || 'Empresa'}</p>
                <p className="truncate text-[11px] text-slate-500">Plan Profesional</p>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Publicaciones este mes</span>
                <span className="font-semibold text-slate-700">18 / 30</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200">
                <div className="h-1.5 w-3/5 rounded-full bg-blue-600" />
              </div>
            </div>

            <Link
              href="/settings"
              className="mt-3 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Ver detalles del plan
            </Link>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">{user?.email || 'usuario@empresa.com'}</p>
                <p className="text-[11px] text-slate-500">{user?.role === 'super_admin' ? 'Administrador' : 'Empresa'}</p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

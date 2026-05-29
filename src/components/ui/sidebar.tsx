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
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-slate-200 p-3">
          {user && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="truncate text-sm font-semibold text-slate-900">{user.companyName || 'Empresa'}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          )}
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

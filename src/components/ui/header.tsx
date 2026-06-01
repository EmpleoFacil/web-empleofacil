'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, MessageCircle, ChevronDown, Settings, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { GlobalSearch } from '@/components/ui/global-search';
import { getDisplayName } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const companyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (companyMenuRef.current && !companyMenuRef.current.contains(event.target as Node)) {
        setCompanyMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = user?.role === 'super_admin';
  const displayName = getDisplayName(user?.email);
  const messagesHref = isAdmin ? '/admin/candidates' : '/messages';

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#E6ECF5] bg-white px-8">
        <GlobalSearch />

        <div className="ml-6 flex items-center gap-5">
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative rounded-xl p-2 text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#334155]"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#EF4444] ring-2 ring-white" />
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-[14px] border border-[#E6ECF5] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-bold text-[#0F172A]">Notificaciones</p>
                <p className="mt-3 text-sm font-medium text-[#64748B]">No hay notificaciones nuevas.</p>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    router.push(messagesHref);
                  }}
                  className="mt-3 text-xs font-bold text-[#0B5CFF] hover:text-[#004BDD]"
                >
                  Ir a mensajes
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push(messagesHref)}
            className="rounded-xl p-2 text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#334155]"
            aria-label="Mensajes"
          >
            <MessageCircle className="h-5 w-5" />
          </button>

          <div className="relative" ref={companyMenuRef}>
            <button
              type="button"
              onClick={() => setCompanyMenuOpen((prev) => !prev)}
              className="flex h-[50px] items-center gap-3 rounded-[14px] border border-[#E6ECF5] px-3 transition-colors hover:border-[#D1D9E6]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B5CFF] text-sm font-bold text-white">
                {(isAdmin ? displayName : user?.companyName)?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden min-w-[140px] text-left sm:block">
                <p className="truncate text-[13px] font-semibold text-[#0F172A]">
                  {isAdmin ? displayName : user?.companyName || 'Empresa'}
                </p>
                <p className="truncate text-[12px] font-medium text-[#64748B]">
                  {isAdmin ? 'Administrador' : user?.companyCity || '-'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
            </button>
            {companyMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-[14px] border border-[#E6ECF5] bg-white py-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                {!isAdmin && (
                  <Link
                    href="/settings"
                    onClick={() => setCompanyMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                  >
                    <Settings className="h-4 w-4 text-[#64748B]" />
                    Configuración
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setCompanyMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#334155] hover:bg-[#F8FAFC]"
                  >
                    <Settings className="h-4 w-4 text-[#64748B]" />
                    Panel admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCompanyMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#EF4444] hover:bg-[#FEF2F2]"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="border-b border-[#E6ECF5] bg-white px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold leading-[40px] text-[#0F172A]">{title}</h1>
            {subtitle && <p className="mt-1 text-[15px] font-medium text-[#64748B]">{subtitle}</p>}
          </div>
          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </div>
      </div>
    </>
  );
}

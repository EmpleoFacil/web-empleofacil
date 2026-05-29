'use client';

import { Bell, MessageCircle, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar candidatos, vacantes o mensajes..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="ml-6 flex items-center gap-4">
          <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <MessageCircle className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden min-w-[150px] sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.companyName || 'Empresa'}</p>
              <p className="truncate text-xs text-slate-500">Nicaragua</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
    </>
  );
}

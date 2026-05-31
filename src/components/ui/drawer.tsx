'use client';

import { X } from 'lucide-react';

interface DrawerProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: 'md' | 'lg';
}

export function Drawer({ title, onClose, children, width = 'lg' }: DrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div
        className={`relative flex h-full w-full flex-col bg-white shadow-xl ${
          width === 'lg' ? 'max-w-lg' : 'max-w-md'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E6ECF5] bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-[#0F172A]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

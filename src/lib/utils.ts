import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-800',
    pending: 'bg-blue-100 text-blue-800',
    reviewing: 'bg-purple-100 text-purple-800',
    interview: 'bg-indigo-100 text-indigo-800',
    hired: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Activa',
    paused: 'Pausada',
    closed: 'Cerrada',
    pending: 'Pendiente',
    reviewing: 'En revisión',
    interview: 'Entrevista',
    hired: 'Contratado',
    rejected: 'Rechazado',
  };
  return labels[status] || status;
}

export function getModalityLabel(modality?: string | null) {
  const labels: Record<string, string> = {
    presencial: 'Presencial',
    remoto: 'Remoto',
    remote: 'Remoto',
    hibrido: 'Híbrido',
    hybrid: 'Híbrido',
  };
  return labels[modality ?? ''] || modality || 'Presencial';
}

export function getDisplayName(email?: string | null): string {
  if (!email) return 'Usuario';
  const local = email.split('@')[0] ?? '';
  const first = local.split(/[._-]/)[0] ?? local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function getRoleLabel(
  role: 'company_admin' | 'super_admin',
  companyUserRole?: string | null
): string {
  if (role === 'super_admin') return 'Administrador';
  const companyRoles: Record<string, string> = {
    admin: 'Administrador',
    recruiter: 'Reclutador',
    editor: 'Editor',
    viewer: 'Visor',
  };
  return companyRoles[companyUserRole ?? ''] || 'Empresa';
}

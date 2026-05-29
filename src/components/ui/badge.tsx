import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-gray-100 text-gray-800': variant === 'default',
          'bg-green-100 text-green-800': variant === 'success',
          'bg-yellow-100 text-yellow-800': variant === 'warning',
          'bg-red-100 text-red-800': variant === 'danger',
          'bg-blue-100 text-blue-800': variant === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  );
}

export function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    active: 'success',
    paused: 'warning',
    closed: 'default',
    pending: 'info',
    reviewing: 'info',
    interview: 'info',
    hired: 'success',
    rejected: 'danger',
  };
  return variants[status] || 'default';
}

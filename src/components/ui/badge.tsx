import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[999px] px-2.5 py-1.5 text-[12px] font-bold leading-[18px]',
        {
          'bg-[#F1F5F9] text-[#64748B]': variant === 'default',
          'bg-[#EAF8EF] text-[#16A34A]': variant === 'success',
          'bg-[#FFF5E6] text-[#F59E0B]': variant === 'warning',
          'bg-[#FEECEC] text-[#EF4444]': variant === 'danger',
          'bg-[#EAF2FF] text-[#0B5CFF]': variant === 'info',
          'bg-[#F5EAFE] text-[#A855F7]': variant === 'purple',
        },
        className
      )}
    >
      {children}
    </span>
  );
}

export function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default' {
  const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'default'> = {
    active: 'success',
    paused: 'warning',
    closed: 'default',
    pending: 'info',
    reviewing: 'purple',
    interview: 'info',
    hired: 'success',
    rejected: 'danger',
  };
  return variants[status] || 'default';
}

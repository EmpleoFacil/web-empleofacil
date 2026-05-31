import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold leading-5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        {
          'rounded-[14px] bg-[#0B5CFF] text-white hover:bg-[#004BDD] focus:ring-[#0B5CFF] shadow-sm': variant === 'primary',
          'rounded-[14px] bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] focus:ring-[#94A3B8]': variant === 'secondary',
          'rounded-[14px] border border-[#E6ECF5] bg-white text-[#334155] hover:bg-[#F8FAFC] hover:border-[#0B5CFF] hover:text-[#0B5CFF] focus:ring-[#0B5CFF]': variant === 'outline',
          'rounded-[14px] text-[#334155] hover:bg-[#F1F5F9] focus:ring-[#94A3B8]': variant === 'ghost',
          'rounded-[14px] bg-[#EF4444] text-white hover:bg-[#DC2626] focus:ring-[#EF4444] shadow-sm': variant === 'danger',
        },
        {
          'h-9 px-3 text-xs': size === 'sm',
          'h-11 px-5 text-[15px] font-bold': size === 'md',
          'h-12 px-7 text-base': size === 'lg',
        },
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

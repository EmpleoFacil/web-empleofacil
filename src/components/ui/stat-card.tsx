import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  trend?: number;
  period?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export function StatCard({
  title,
  value,
  trend,
  period,
  icon: Icon,
  iconBg,
  iconColor,
}: StatCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div className="rounded-[20px] border border-[#EAEFF7] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-2.5 flex items-start gap-2.5">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            iconBg || 'bg-[#EAF2FF]'
          )}
        >
          <Icon className={cn('h-5 w-5', iconColor || 'text-[#0B5CFF]')} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#334155]">{title}</p>
          <p className="text-[44px] font-bold leading-[46px] text-[#0F172A]">{value}</p>
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-[#16A34A]" />
          ) : (
            <TrendingDown className="h-4 w-4 text-[#EF4444]" />
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              isPositive ? 'text-[#16A34A]' : 'text-[#EF4444]'
            )}
          >
            {isPositive ? '+' : ''}
            {trend}%
          </span>
          {period && <span className="text-xs text-[#94A3B8]">vs {period}</span>}
        </div>
      )}
    </div>
  );
}

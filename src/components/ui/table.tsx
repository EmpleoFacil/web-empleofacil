import { cn } from '@/lib/utils';
import type { ReactNode, HTMLAttributes } from 'react';

interface TableProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

export function Table({ children, className, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className, ...props }: TableProps) {
  return (
    <thead className={cn('border-b border-[#EEF2F7]', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className, ...props }: TableProps) {
  return <tbody className={cn('divide-y divide-[#EEF2F7]', className)} {...props}>{children}</tbody>;
}

export function TableRow({ children, className, ...props }: TableProps) {
  return (
    <tr className={cn('transition-colors hover:bg-[#F8FAFC]', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }: TableProps) {
  return (
    <th className={cn('px-5 py-4 text-[12px] font-bold uppercase tracking-wide text-[#64748B]', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }: TableProps) {
  return <td className={cn('px-5 py-4 text-sm font-medium text-[#334155]', className)} {...props}>{children}</td>;
}

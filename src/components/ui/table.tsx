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
    <thead className={cn('border-b border-gray-200 bg-gray-50', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className, ...props }: TableProps) {
  return <tbody className={cn('divide-y divide-gray-100', className)} {...props}>{children}</tbody>;
}

export function TableRow({ children, className, ...props }: TableProps) {
  return (
    <tr className={cn('hover:bg-gray-50 transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }: TableProps) {
  return (
    <th className={cn('px-4 py-3 font-medium text-gray-600', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }: TableProps) {
  return <td className={cn('px-4 py-3 text-gray-900', className)} {...props}>{children}</td>;
}

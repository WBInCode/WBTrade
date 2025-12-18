import React from 'react';
import { clsx } from 'clsx';

// Wrapper dla tabel admin panelu
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function Table({ children, className, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table
        className={clsx('w-full text-sm text-left', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={clsx('bg-gray-800/80 text-gray-400 uppercase text-xs', className)}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={clsx('divide-y divide-gray-700', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={clsx('bg-gray-800/30 hover:bg-gray-700/50 transition-colors', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={clsx('px-4 py-3 font-medium', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={clsx('px-4 py-3 text-gray-300', className)} {...props}>
      {children}
    </td>
  );
}

// Empty state dla tabel
export interface TableEmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function TableEmpty({ icon, title, description, action }: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={100} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center">
          {icon && <div className="text-gray-500 mb-3">{icon}</div>}
          <p className="text-gray-400 font-medium">{title}</p>
          {description && <p className="text-gray-500 text-sm mt-1">{description}</p>}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </td>
    </tr>
  );
}

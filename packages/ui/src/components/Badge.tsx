import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-700 text-gray-300',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    error: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Mapowanie statusów zamówień na warianty Badge
export const orderStatusBadge: Record<string, { variant: BadgeProps['variant']; label: string }> = {
  PENDING: { variant: 'warning', label: 'Oczekujące' },
  CONFIRMED: { variant: 'info', label: 'Potwierdzone' },
  PROCESSING: { variant: 'info', label: 'W realizacji' },
  SHIPPED: { variant: 'info', label: 'Wysłane' },
  DELIVERED: { variant: 'success', label: 'Dostarczone' },
  CANCELLED: { variant: 'error', label: 'Anulowane' },
  REFUNDED: { variant: 'error', label: 'Zwrócone' },
};

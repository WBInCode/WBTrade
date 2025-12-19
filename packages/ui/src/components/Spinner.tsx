import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <Loader2 className={clsx('animate-spin text-primary', sizes[size], className)} />
  );
}

// Full page loader
export interface PageLoaderProps {
  text?: string;
}

export function PageLoader({ text = 'Ładowanie...' }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Spinner size="lg" />
      <p className="mt-4 text-gray-400">{text}</p>
    </div>
  );
}

// Skeleton loader
export interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'bg-gray-700 rounded',
        animate && 'animate-pulse',
        className
      )}
    />
  );
}

// Skeleton dla karty
export function CardSkeleton() {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

// Skeleton dla wiersza tabeli
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="bg-gray-800/30">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

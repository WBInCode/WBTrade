import React from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
}

export function Alert({
  children,
  variant = 'info',
  title,
  onClose,
  className,
  ...props
}: AlertProps) {
  const variants = {
    info: {
      container: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      icon: <Info className="w-5 h-5" />,
    },
    success: {
      container: 'bg-green-500/10 border-green-500/30 text-green-400',
      icon: <CheckCircle className="w-5 h-5" />,
    },
    warning: {
      container: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    error: {
      container: 'bg-red-500/10 border-red-500/30 text-red-400',
      icon: <AlertCircle className="w-5 h-5" />,
    },
  };

  const { container, icon } = variants[variant];

  return (
    <div
      className={clsx(
        'border rounded-lg p-4 flex gap-3',
        container,
        className
      )}
      role="alert"
      {...props}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        {title && <h4 className="font-semibold mb-1">{title}</h4>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Zamknij"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

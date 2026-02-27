'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, X, Loader2, Trash2 } from 'lucide-react';

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  /** If set, user must type this text to confirm (for destructive actions) */
  confirmPhrase?: string;
  /** Label above the confirm input */
  confirmPhraseLabel?: string;
  loading?: boolean;
}

const variantConfig: Record<ModalVariant, {
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
  btnBg: string;
  btnHover: string;
  ringColor: string;
}> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    btnBg: 'bg-red-600',
    btnHover: 'hover:bg-red-700',
    ringColor: 'focus:ring-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    btnBg: 'bg-yellow-600',
    btnHover: 'hover:bg-yellow-700',
    ringColor: 'focus:ring-yellow-500',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    btnBg: 'bg-blue-600',
    btnHover: 'hover:bg-blue-700',
    ringColor: 'focus:ring-blue-500',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
    btnBg: 'bg-green-600',
    btnHover: 'hover:bg-green-700',
    ringColor: 'focus:ring-green-500',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Potwierdź',
  cancelText = 'Anuluj',
  variant = 'warning',
  confirmPhrase,
  confirmPhraseLabel,
  loading = false,
}: ConfirmModalProps) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTypedPhrase('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;
  const phraseMatch = !confirmPhrase || typedPhrase === confirmPhrase;
  const canConfirm = phraseMatch && !isSubmitting && !loading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center mb-4`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>

          {/* Message */}
          <p className="text-slate-400 text-sm leading-relaxed">{message}</p>

          {/* Confirm phrase input */}
          {confirmPhrase && (
            <div className="mt-4">
              <label className="block text-xs text-slate-500 mb-1.5">
                {confirmPhraseLabel || 'Wpisz poniższy tekst aby potwierdzić:'}
              </label>
              <div className="bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 mb-2">
                <code className="text-orange-400 font-mono text-sm select-all">{confirmPhrase}</code>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={typedPhrase}
                onChange={(e) => setTypedPhrase(e.target.value)}
                placeholder="Wpisz tutaj..."
                className={`w-full px-3 py-2.5 bg-slate-800 border rounded-lg text-white placeholder-slate-600 text-sm font-mono focus:outline-none transition-colors ${
                  typedPhrase
                    ? phraseMatch
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-red-500/50 focus:border-red-500'
                    : 'border-slate-700 focus:border-orange-500'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canConfirm) handleConfirm();
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${config.btnBg} ${config.btnHover}`}
          >
            {(isSubmitting || loading) && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── AlertModal: replacement for window.alert() ── */

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: ModalVariant;
  buttonText?: string;
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonText = 'OK',
}: AlertModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-center px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${config.btnBg} ${config.btnHover}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import ConfirmModal, { AlertModal, ModalVariant } from './ConfirmModal';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  confirmPhrase?: string;
  confirmPhraseLabel?: string;
}

interface AlertOptions {
  title?: string;
  message: string;
  variant?: ModalVariant;
  buttonText?: string;
}

interface ModalContextValue {
  /** Promise-based replacement for window.confirm() */
  confirm: (messageOrOptions: string | ConfirmOptions) => Promise<boolean>;
  /** Promise-based replacement for window.alert() */
  alert: (messageOrOptions: string | AlertOptions) => Promise<void>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  // Confirm modal state
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);

  // Alert modal state
  const [alertState, setAlertState] = useState<(AlertOptions & { open: boolean }) | null>(null);
  const alertResolveRef = useRef<(() => void) | null>(null);

  const confirm = useCallback((messageOrOptions: string | ConfirmOptions): Promise<boolean> => {
    const options = typeof messageOrOptions === 'string'
      ? { message: messageOrOptions }
      : messageOrOptions;

    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState({ ...options, open: true });
    });
  }, []);

  const handleConfirmClose = useCallback(() => {
    confirmResolveRef.current?.(false);
    confirmResolveRef.current = null;
    setConfirmState(null);
  }, []);

  const handleConfirmConfirm = useCallback(() => {
    confirmResolveRef.current?.(true);
    confirmResolveRef.current = null;
    setConfirmState(null);
  }, []);

  const alert = useCallback((messageOrOptions: string | AlertOptions): Promise<void> => {
    const options = typeof messageOrOptions === 'string'
      ? { message: messageOrOptions }
      : messageOrOptions;

    return new Promise((resolve) => {
      alertResolveRef.current = resolve;
      setAlertState({ ...options, open: true });
    });
  }, []);

  const handleAlertClose = useCallback(() => {
    alertResolveRef.current?.();
    alertResolveRef.current = null;
    setAlertState(null);
  }, []);

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Global confirm modal */}
      <ConfirmModal
        isOpen={confirmState?.open ?? false}
        onClose={handleConfirmClose}
        onConfirm={handleConfirmConfirm}
        title={confirmState?.title ?? 'Potwierdzenie'}
        message={confirmState?.message ?? ''}
        confirmText={confirmState?.confirmText ?? 'Potwierdź'}
        cancelText={confirmState?.cancelText ?? 'Anuluj'}
        variant={confirmState?.variant ?? 'warning'}
        confirmPhrase={confirmState?.confirmPhrase}
        confirmPhraseLabel={confirmState?.confirmPhraseLabel}
      />

      {/* Global alert modal */}
      <AlertModal
        isOpen={alertState?.open ?? false}
        onClose={handleAlertClose}
        title={alertState?.title ?? 'Informacja'}
        message={alertState?.message ?? ''}
        variant={alertState?.variant ?? 'info'}
        buttonText={alertState?.buttonText}
      />
    </ModalContext.Provider>
  );
}

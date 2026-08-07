import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import styles from './Toast.module.css';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

function ToastItemView({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  return (
    <div className={cn(styles.toast, styles[toast.type])} role="status">
      {toast.message}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className={styles.container} aria-live="polite">
          {toasts.map((toast) => (
            <ToastItemView key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return {
    show: ctx.show,
    success: (message: string, duration?: number) => ctx.show(message, 'success', duration),
    error: (message: string, duration?: number) => ctx.show(message, 'error', duration),
    warning: (message: string, duration?: number) => ctx.show(message, 'warning', duration),
    info: (message: string, duration?: number) => ctx.show(message, 'info', duration),
  };
}

/**
 * V148 Toast notification system
 *
 * Lightweight, accessible toast notifications with auto-dismiss timer.
 * 4 variants: info / success / warning / error.
 * Use via: const { toast } = useToast();
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms; 0 disables. Default 4000. */
  duration?: number;
  action?: ToastAction;
  /** Optional stable id; auto-generated if omitted. */
  id?: string;
}

export interface ToastItem extends Required<Omit<ToastInput, 'action' | 'id'>> {
  id: string;
  createdAt: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;
function nextId(): string {
  toastCounter += 1;
  return `t-${Date.now().toString(36)}-${toastCounter}`;
}

export interface ToastProviderProps {
  children: ReactNode;
  /** Default auto-dismiss duration in ms. */
  defaultDuration?: number;
  /** Cap on concurrent visible toasts. Oldest gets evicted when exceeded. */
  maxToasts?: number;
}

export function ToastProvider({
  children,
  defaultDuration = 4000,
  maxToasts = 6,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput): string => {
      const id = input.id ?? nextId();
      const variant = input.variant ?? 'info';
      const duration = input.duration ?? defaultDuration;
      const item: ToastItem = {
        id,
        message: input.message,
        variant,
        duration,
        createdAt: Date.now(),
        ...(input.action ? { action: input.action } : {}),
      };

      setToasts((prev) => {
        const next = [...prev, item];
        if (next.length > maxToasts) {
          const evicted = next.slice(0, next.length - maxToasts);
          for (const e of evicted) {
            const timer = timersRef.current.get(e.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(e.id);
            }
          }
          return next.slice(-maxToasts);
        }
        return next;
      });

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [defaultDuration, maxToasts, dismiss]
  );

  const clear = useCallback(() => {
    setToasts([]);
    for (const timer of timersRef.current.values()) {
      clearTimeout(timer);
    }
    timersRef.current.clear();
  }, []);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, toast, dismiss, clear }),
    [toasts, toast, dismiss, clear]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

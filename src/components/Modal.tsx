/**
 * V149 Modal system — stack-based modal manager.
 *
 * ModalProvider context + useModal hook returns imperative API:
 *   open({ title, content, size, dismissable }) → id
 *   close(id) | closeAll()
 *
 * Stack renders top-most modal last (visually on top). Each modal can
 * have independent size, dismissable, and content (ReactNode).
 * Escape key + overlay click both close (when dismissable).
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

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalInput {
  title?: string;
  content: ReactNode;
  size?: ModalSize;
  dismissable?: boolean;
  /** Optional id; auto-generated if omitted. */
  id?: string;
}

export interface ModalItem extends Required<Omit<ModalInput, 'id' | 'content'>> {
  id: string;
  createdAt: number;
  content: ReactNode;
}

interface ModalContextValue {
  modals: ModalItem[];
  open: (input: ModalInput) => string;
  close: (id: string) => void;
  closeAll: () => void;
  top: ModalItem | null;
}

const ModalContext = createContext<ModalContextValue | null>(null);

let modalCounter = 0;
function nextId(): string {
  modalCounter += 1;
  return `m-${Date.now().toString(36)}-${modalCounter}`;
}

export interface ModalProviderProps {
  children: ReactNode;
  /** Cap on concurrent open modals. Default 5. */
  maxModals?: number;
}

export function ModalProvider({ children, maxModals = 5 }: ModalProviderProps) {
  const [modals, setModals] = useState<ModalItem[]>([]);

  const close = useCallback((id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const open = useCallback(
    (input: ModalInput): string => {
      const id = input.id ?? nextId();
      const size: ModalSize = input.size ?? 'md';
      const dismissable = input.dismissable ?? true;
      const item: ModalItem = {
        id,
        title: input.title,
        content: input.content,
        size,
        dismissable,
        createdAt: Date.now(),
      };
      setModals((prev) => {
        const next = [...prev, item];
        if (next.length > maxModals) return next.slice(-maxModals);
        return next;
      });
      return id;
    },
    [maxModals]
  );

  const closeAll = useCallback(() => {
    setModals([]);
  }, []);

  const top = modals[modals.length - 1] ?? null;

  // Global Escape handler — close top dismissable modal
  useEffect(() => {
    if (modals.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const last = modals[modals.length - 1];
      if (last && last.dismissable) {
        setModals((prev) => prev.filter((m) => m.id !== last.id));
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [modals]);

  // Body scroll lock when any modal is open
  useEffect(() => {
    if (modals.length === 0) {
      document.body.style.overflow = '';
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modals.length]);

  const value = useMemo<ModalContextValue>(
    () => ({ modals, open, close, closeAll, top }),
    [modals, open, close, closeAll, top]
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return ctx;
}

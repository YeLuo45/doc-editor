/**
 * V151 ConfirmDialog — promise-based confirmation modal.
 *
 * Built on V149 Modal system. Returns Promise<boolean>:
 *   - true when user clicks the confirm button
 *   - false when user cancels, dismisses, or presses Escape
 *
 * Severity levels: danger (destructive) / warning / info / success.
 * Each has its own confirm button label + icon character.
 */

import { useCallback, useState, type ReactNode } from 'react';
import { useModal } from './Modal';
import { ModalContainer } from './ModalContainer';

export type ConfirmSeverity = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  severity?: ConfirmSeverity;
  confirmLabel?: string;
  cancelLabel?: string;
}

const SEVERITY_META: Record<
  ConfirmSeverity,
  { icon: string; confirmClass: string; label: string }
> = {
  danger: { icon: '!', confirmClass: 'btn--danger', label: 'Confirm' },
  warning: { icon: '!', confirmClass: 'btn--warning', label: 'Proceed' },
  info: { icon: 'i', confirmClass: 'btn--primary', label: 'OK' },
  success: { icon: '+', confirmClass: 'btn--success', label: 'Continue' },
};

/**
 * Hook that returns a `confirm(opts)` function. Returns a Promise<boolean>.
 * Resolves true on confirm, false on cancel/Escape/dismiss.
 */
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const { open, close } = useModal();

  return useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        let resolved = false;
        const finish = (result: boolean) => {
          if (resolved) return;
          resolved = true;
          resolve(result);
        };
        const meta = SEVERITY_META[opts.severity ?? 'info'];
        const confirmLabel = opts.confirmLabel ?? meta.label;
        const cancelLabel = opts.cancelLabel ?? 'Cancel';

        const id = open({
          title: opts.title,
          size: 'sm',
          content: (
            <ConfirmBody
              severity={opts.severity ?? 'info'}
              message={opts.message}
              confirmLabel={confirmLabel}
              cancelLabel={cancelLabel}
              confirmClass={meta.confirmClass}
              icon={meta.icon}
              onConfirm={() => {
                close(id);
                finish(true);
              }}
              onCancel={() => {
                close(id);
                finish(false);
              }}
            />
          ),
        });
      }),
    [open, close]
  );
}

interface ConfirmBodyProps {
  severity: ConfirmSeverity;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  confirmClass: string;
  icon: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmBody({
  severity,
  message,
  confirmLabel,
  cancelLabel,
  confirmClass,
  icon,
  onConfirm,
  onCancel,
}: ConfirmBodyProps) {
  return (
    <div className={`confirm confirm--${severity}`} data-testid="confirm-body">
      <div className="confirm__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="confirm__message">{message}</div>
      <div className="confirm__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onCancel}
          data-testid="confirm-cancel"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${confirmClass}`}
          onClick={onConfirm}
          data-testid="confirm-ok"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Convenience component that lets you call confirm() imperatively from
 * anywhere within a ModalProvider. Renders nothing when idle.
 *
 * Usage:
 *   <ModalProvider>
 *     <ConfirmProvider />
 *     <App />
 *   </ModalProvider>
 */
export function ConfirmProvider() {
  // Mount the ModalContainer so modals can render. No additional state needed.
  return <ModalContainer />;
}

/**
 * Re-export a hook that returns the same API as useConfirm but uses
 * the calling component's ModalProvider context.
 */
export function useConfirmWithContext(): (opts: ConfirmOptions) => Promise<boolean> {
  return useConfirm();
}

/**
 * Internal helper for tests: track all pending confirms to await them.
 */
let pendingResolvers: Array<() => void> = [];

export function _trackConfirmEnd(fn: () => void): void {
  pendingResolvers.push(fn);
}

export function _flushTrackers(): void {
  const rs = pendingResolvers;
  pendingResolvers = [];
  rs.forEach((r) => r());
}

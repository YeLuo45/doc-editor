/**
 * V148 Toast container — renders the toast queue.
 * Mount once at the app root (after ToastProvider).
 */

import { useToast } from './Toast';
import type { ToastItem, ToastVariant } from './Toast';

const VARIANT_ICON: Record<ToastVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '!',
  error: '✕',
};

function variantClass(variant: ToastVariant): string {
  return `toast toast--${variant}`;
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((t: ToastItem) => (
        <div
          key={t.id}
          className={variantClass(t.variant)}
          role="status"
          aria-live="polite"
          data-testid="toast"
        >
          <span className="toast__icon" aria-hidden>
            {VARIANT_ICON[t.variant]}
          </span>
          <span className="toast__message">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                t.action?.onClick();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast__close"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

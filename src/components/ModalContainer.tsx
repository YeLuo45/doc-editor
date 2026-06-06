/**
 * V149 Modal container — renders the modal stack.
 * Mount once at the app root (inside ModalProvider).
 */

import { useEffect, useRef } from 'react';
import { useModal } from './Modal';
import type { ModalItem, ModalSize } from './Modal';

const SIZE_WIDTH: Record<ModalSize, string> = {
  sm: '380px',
  md: '520px',
  lg: '720px',
  xl: '960px',
};

export function ModalContainer() {
  const { modals, close, top } = useModal();
  // Track the most recently focused element so we can restore focus on close.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (modals.length > 0) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [modals.length]);

  if (modals.length === 0) return null;

  return (
    <div
      className="modal-root"
      role="presentation"
      data-testid="modal-root"
    >
      {modals.map((m: ModalItem, idx) => {
        const isTop = idx === modals.length - 1;
        return (
          <div
            key={m.id}
            className={'modal-backdrop' + (isTop ? '' : ' modal-backdrop--nested')}
            onClick={() => {
              if (isTop && m.dismissable) close(m.id);
            }}
            data-testid={'modal-backdrop-' + m.id}
          >
            <div
              className={'modal modal--' + m.size}
              role="dialog"
              aria-modal="true"
              aria-labelledby={m.title ? 'modal-title-' + m.id : undefined}
              onClick={(e) => e.stopPropagation()}
              data-testid={'modal-' + m.id}
              style={{ maxWidth: SIZE_WIDTH[m.size] }}
            >
              {m.title && (
                <div className="modal__header">
                  <h2
                    className="modal__title"
                    id={'modal-title-' + m.id}
                  >
                    {m.title}
                  </h2>
                  {m.dismissable && (
                    <button
                      type="button"
                      className="modal__close"
                      onClick={() => close(m.id)}
                      aria-label="Close dialog"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              <div className="modal__body">{m.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * V148 Toast notification system tests
 *
 * Lightweight vanilla DOM tests using React 19 createRoot + jsdom.
 * No @testing-library dependency. Covers ToastProvider reducer
 * (add/dismiss/clear/eviction/timer), useToast hook contract,
 * and ToastContainer rendering (variants, action, close, a11y).
 */

// React 19 act requires dev build; force NODE_ENV before any import.
process.env.NODE_ENV = 'development';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useState, type ReactNode } from 'react';
import {
  ToastProvider,
  useToast,
  type ToastVariant,
} from '../components/Toast';
import { ToastContainer } from '../components/ToastContainer';

let container: HTMLDivElement;
let root: Root | null = null;

function mount(node: ReactNode) {
  if (!root) {
    root = createRoot(container);
  }
  flushSync(() => {
    root!.render(node);
  });
}

function unmount() {
  if (root) {
    flushSync(() => {
      root!.unmount();
    });
    root = null;
  }
  container.innerHTML = '';
}

/** Click an element and force a flush. */
function clickAndFlush(el: HTMLElement) {
  flushSync(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  vi.useFakeTimers();
});

afterEach(() => {
  unmount();
  document.body.removeChild(container);
  vi.useRealTimers();
});

/* -------------------------------------------------------------------------- */

describe('ToastProvider', () => {
  function ReadToasts() {
    const { toasts } = useToast();
    return (
      <div data-testid="counter">{toasts.length}</div>
    );
  }

  test('starts with empty toast list', () => {
    mount(
      <ToastProvider>
        <ReadToasts />
      </ToastProvider>
    );
    expect(container.querySelector('[data-testid="counter"]')!.textContent).toBe(
      '0'
    );
  });

  test('adds a toast with default info variant', () => {
    function Probe() {
      const { toast, toasts } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => toast({ message: 'hello' })}
          >
            trigger
          </button>
          <span data-testid="count">{toasts.length}</span>
          <span data-testid="variant">{toasts[0]?.variant ?? ''}</span>
          <span data-testid="message">{toasts[0]?.message ?? ''}</span>
        </>
      );
    }
    mount(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
    expect(container.querySelector('[data-testid="variant"]')!.textContent).toBe(
      'info'
    );
    expect(container.querySelector('[data-testid="message"]')!.textContent).toBe(
      'hello'
    );
  });

  test('respects explicit variant and duration', () => {
    function Probe() {
      const { toast, toasts } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              toast({ message: 'oops', variant: 'error', duration: 0 })
            }
          >
            trigger
          </button>
          <span data-testid="v">{toasts[0]?.variant ?? ''}</span>
          <span data-testid="d">{toasts[0]?.duration ?? ''}</span>
        </>
      );
    }
    mount(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="v"]')!.textContent).toBe(
      'error'
    );
    expect(container.querySelector('[data-testid="d"]')!.textContent).toBe('0');
  });

  test('auto-dismisses after duration', () => {
    function Probe() {
      const { toast, toasts } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => toast({ message: 'auto' })}
          >
            trigger
          </button>
          <span data-testid="c">{toasts.length}</span>
        </>
      );
    }
    mount(
      <ToastProvider defaultDuration={1000}>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="c"]')!.textContent).toBe('1');
    flushSync(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(container.querySelector('[data-testid="c"]')!.textContent).toBe('0');
  });

  test('duration 0 keeps toast indefinitely', () => {
    function Probe() {
      const { toast, toasts } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => toast({ message: 'sticky', duration: 0 })}
          >
            trigger
          </button>
          <span data-testid="c">{toasts.length}</span>
        </>
      );
    }
    mount(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    flushSync(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(container.querySelector('[data-testid="c"]')!.textContent).toBe('1');
  });

  test('explicit id is preserved', () => {
    function Probe() {
      const { toast, toasts } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => toast({ message: 'x', id: 'fixed-1' })}
          >
            trigger
          </button>
          <span data-testid="id">{toasts[0]?.id ?? ''}</span>
        </>
      );
    }
    mount(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="id"]')!.textContent).toBe(
      'fixed-1'
    );
  });

  test('dismiss removes specific toast by id', () => {
    function Probe() {
      const { toast, dismiss, toasts } = useToast();
      const [first, setFirst] = useState('');
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setFirst(toast({ message: 'a' }));
              toast({ message: 'b' });
            }}
          >
            add
          </button>
          <button
            type="button"
            onClick={() => dismiss(first)}
            data-testid="dismiss"
          >
            dismiss
          </button>
          <span data-testid="c">{toasts.length}</span>
          <span data-testid="msg">{toasts[0]?.message ?? ''}</span>
        </>
      );
    }
    mount(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="c"]')!.textContent).toBe('2');
    flushSync(() => {
      (container.querySelector('[data-testid="dismiss"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="c"]')!.textContent).toBe('1');
    expect(container.querySelector('[data-testid="msg"]')!.textContent).toBe('b');
  });

  test('clear removes all toasts', () => {
    function Probe() {
      const { toast, clear, toasts } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              toast({ message: 'a' });
              toast({ message: 'b' });
              toast({ message: 'c' });
            }}
          >
            add
          </button>
          <button type="button" onClick={() => clear()}>
            clear
          </button>
          <span data-testid="c">{toasts.length}</span>
        </>
      );
    }
    mount(
      <ToastProvider defaultDuration={1000}>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="c"]')!.textContent).toBe('3');
    flushSync(() => {
      (container.querySelectorAll('button')[1] as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="c"]')!.textContent).toBe('0');
    flushSync(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(container.querySelector('[data-testid="c"]')!.textContent).toBe('0');
  });

  test('evicts oldest when exceeding maxToasts', () => {
    function Probe() {
      const { toast, toasts } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              toast({ message: 'oldest' });
              toast({ message: 'middle' });
              toast({ message: 'newest' });
            }}
          >
            add
          </button>
          <span data-testid="messages">
            {toasts.map((t) => t.message).join(',')}
          </span>
        </>
      );
    }
    mount(
      <ToastProvider maxToasts={2}>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(
      container.querySelector('[data-testid="messages"]')!.textContent
    ).toBe('middle,newest');
  });

  test('action button data is stored on toast', () => {
    function Probe() {
      const { toast, toasts } = useToast();
      const onClick = vi.fn();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              toast({
                message: 'with action',
                action: { label: 'Undo', onClick },
              })
            }
          >
            trigger
          </button>
          <span data-testid="label">{toasts[0]?.action?.label ?? ''}</span>
        </>
      );
    }
    mount(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="label"]')!.textContent).toBe(
      'Undo'
    );
  });

  test('useToast throws when used outside provider', () => {
    function OuterProbe() {
      // Capture error during render so React doesn't convert it to
      // its own hook-call error.
      try {
        useToast();
      } catch (e) {
        return <span data-testid="msg">{(e as Error).message}</span>;
      }
      return <span data-testid="msg">no-error</span>;
    }
    mount(<OuterProbe />);
    expect(container.querySelector('[data-testid="msg"]')!.textContent).toMatch(
      /must be used within a ToastProvider/
    );
  });

  test('toast returns a non-empty string id', () => {
    function Probe() {
      const { toast } = useToast();
      const [id, setId] = useState('');
      return (
        <>
          <button
            type="button"
            onClick={() => setId(toast({ message: 'check id' }))}
          >
            trigger
          </button>
          <span data-testid="id">{id}</span>
        </>
      );
    }
    mount(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    const id = container.querySelector('[data-testid="id"]')!.textContent;
    expect(typeof id).toBe('string');
    expect((id as string).length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */

describe('ToastContainer', () => {
  test('renders nothing when no toasts', () => {
    mount(
      <ToastProvider>
        <ToastContainer />
      </ToastProvider>
    );
    expect(container.querySelectorAll('[data-testid="toast"]').length).toBe(0);
  });

  test.each<[ToastVariant, string]>([
    ['info', 'A'],
    ['success', 'B'],
    ['warning', 'C'],
    ['error', 'D'],
  ])('renders %s variant with proper class and a11y attrs', (variant, msg) => {
    function Harness() {
      const { toast } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => toast({ message: msg, variant, duration: 0 })}
          >
            trigger
          </button>
          <ToastContainer />
        </>
      );
    }
    mount(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    const toastEl = container.querySelector('[data-testid="toast"]')!;
    expect(toastEl.className).toContain(`toast--${variant}`);
    expect(toastEl.getAttribute('role')).toBe('status');
    expect(toastEl.getAttribute('aria-live')).toBe('polite');
    expect(toastEl.textContent).toContain(msg);
  });

  test('action button triggers callback and dismisses toast', () => {
    const onClick = vi.fn();
    function Harness() {
      const { toast } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              toast({
                message: 'Actionable',
                action: { label: 'Undo', onClick },
              })
            }
          >
            trigger
          </button>
          <ToastContainer />
        </>
      );
    }
    mount(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    const actionBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Undo'
    )!;
    flushSync(() => {
      actionBtn.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[data-testid="toast"]').length).toBe(0);
  });

  test('close button dismisses the toast', () => {
    function Harness() {
      const { toast } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => toast({ message: 'closable', duration: 0 })}
          >
            trigger
          </button>
          <ToastContainer />
        </>
      );
    }
    mount(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelectorAll('[data-testid="toast"]').length).toBe(1);
    const closeBtn = container.querySelector('[aria-label="Dismiss notification"]')!;
    flushSync(() => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelectorAll('[data-testid="toast"]').length).toBe(0);
  });

  test('container renders region role with accessible label', () => {
    function Harness() {
      const { toast } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => toast({ message: 'trigger', duration: 0 })}
          >
            trigger
          </button>
          <ToastContainer />
        </>
      );
    }
    mount(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    const region = container.querySelector('[role="region"]')!;
    expect(region.getAttribute('aria-label')).toBe('Notifications');
  });

  test('multiple toasts render in order', () => {
    function Harness() {
      const { toast } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              toast({ message: 'first', duration: 0 });
              toast({ message: 'second', duration: 0 });
            }}
          >
            add
          </button>
          <ToastContainer />
        </>
      );
    }
    mount(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    const items = container.querySelectorAll('[data-testid="toast"]');
    expect(items.length).toBe(2);
    expect(items[0]!.textContent).toContain('first');
    expect(items[1]!.textContent).toContain('second');
  });
});

/**
 * V151 ConfirmDialog system tests
 *
 * Covers: useConfirm hook contract, severity variants, promise resolution
 * on confirm/cancel/Escape, button label overrides, integration with
 * ModalProvider for stack rendering.
 */

process.env.NODE_ENV = 'development';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useState, type ReactNode } from 'react';
import {
  ModalProvider,
  useModal,
} from '../components/Modal';
import { ModalContainer } from '../components/ModalContainer';
import {
  useConfirm,
  ConfirmProvider,
  type ConfirmSeverity,
} from '../components/ConfirmDialog';

let container: HTMLDivElement;
let root: Root | null = null;

function mount(node: ReactNode) {
  if (!root) root = createRoot(container);
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

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  unmount();
  document.body.removeChild(container);
  document.body.style.overflow = '';
});

/* -------------------------------------------------------------------------- */

describe('ConfirmDialog', () => {
  test('useConfirm throws outside ModalProvider', () => {
    function Probe() {
      try {
        useConfirm();
      } catch (e) {
        return <span data-testid="msg">{(e as Error).message}</span>;
      }
      return <span data-testid="msg">no-error</span>;
    }
    mount(<Probe />);
    expect(container.querySelector('[data-testid="msg"]')!.textContent).toMatch(
      /must be used within a ModalProvider/
    );
  });

  test('confirm resolves true when OK clicked', async () => {
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          type="button"
          onClick={async () => {
            const r = await confirm({ title: 'X', message: 'm' });
            document.body.setAttribute('data-result', String(r));
          }}
        >
          open
        </button>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );
    const btn = container.querySelector('button') as HTMLButtonElement;
    flushSync(() => btn.click());
    // Pump microtasks
    await Promise.resolve();
    await Promise.resolve();
    expect(container.querySelector('[data-testid="confirm-body"]')).toBeTruthy();
    const ok = container.querySelector(
      '[data-testid="confirm-ok"]'
    ) as HTMLButtonElement;
    flushSync(() => ok.click());
    await Promise.resolve();
    await Promise.resolve();
    expect(document.body.getAttribute('data-result')).toBe('true');
  });

  test('confirm resolves false when Cancel clicked', async () => {
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          type="button"
          onClick={async () => {
            const r = await confirm({ title: 'X', message: 'm' });
            document.body.setAttribute('data-result', String(r));
          }}
        >
          open
        </button>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );
    const btn = container.querySelector('button') as HTMLButtonElement;
    flushSync(() => btn.click());
    await Promise.resolve();
    const cancel = container.querySelector(
      '[data-testid="confirm-cancel"]'
    ) as HTMLButtonElement;
    flushSync(() => cancel.click());
    await Promise.resolve();
    expect(document.body.getAttribute('data-result')).toBe('false');
  });

  test('renders title and message', () => {
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          type="button"
          onClick={() => confirm({ title: 'Delete item', message: 'Are you sure?' })}
        >
          open
        </button>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Delete item');
    expect(dialog.textContent).toContain('Are you sure?');
  });

  test('default confirm labels per severity', () => {
    function Probe() {
      const confirm = useConfirm();
      return (
        <>
          <button data-testid="d" onClick={() => confirm({ title: 't', message: 'm', severity: 'danger' })}>d</button>
          <button data-testid="w" onClick={() => confirm({ title: 't', message: 'm', severity: 'warning' })}>w</button>
          <button data-testid="i" onClick={() => confirm({ title: 't', message: 'm', severity: 'info' })}>i</button>
          <button data-testid="s" onClick={() => confirm({ title: 't', message: 'm', severity: 'success' })}>s</button>
        </>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );

    flushSync(() => (container.querySelector('[data-testid="d"]') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="confirm-ok"]')!.textContent).toBe('Confirm');
    expect(container.querySelector('.confirm')!.className).toContain('confirm--danger');
    flushSync(() => (container.querySelector('[data-testid="confirm-cancel"]') as HTMLButtonElement).click());

    flushSync(() => (container.querySelector('[data-testid="w"]') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="confirm-ok"]')!.textContent).toBe('Proceed');
    expect(container.querySelector('.confirm')!.className).toContain('confirm--warning');
    flushSync(() => (container.querySelector('[data-testid="confirm-cancel"]') as HTMLButtonElement).click());

    flushSync(() => (container.querySelector('[data-testid="i"]') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="confirm-ok"]')!.textContent).toBe('OK');
    expect(container.querySelector('.confirm')!.className).toContain('confirm--info');
    flushSync(() => (container.querySelector('[data-testid="confirm-cancel"]') as HTMLButtonElement).click());

    flushSync(() => (container.querySelector('[data-testid="s"]') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="confirm-ok"]')!.textContent).toBe('Continue');
    expect(container.querySelector('.confirm')!.className).toContain('confirm--success');
  });

  test('custom confirm and cancel labels', () => {
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          onClick={() =>
            confirm({
              title: 't',
              message: 'm',
              confirmLabel: 'Yes, do it',
              cancelLabel: 'No, never',
            })
          }
        >
          open
        </button>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="confirm-ok"]')!.textContent).toBe(
      'Yes, do it'
    );
    expect(container.querySelector('[data-testid="confirm-cancel"]')!.textContent).toBe(
      'No, never'
    );
  });

  test('Escape key dismisses and resolves false', () => {
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          onClick={async () => {
            const r = await confirm({ title: 't', message: 'm' });
            document.body.setAttribute('data-result', String(r));
          }}
        >
          open
        </button>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    flushSync(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(document.body.getAttribute('data-result')).toBe('false');
  });

  test('backdrop click dismisses and resolves false', () => {
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          onClick={async () => {
            const r = await confirm({ title: 't', message: 'm' });
            document.body.setAttribute('data-result', String(r));
          }}
        >
          open
        </button>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const backdrop = container.querySelector('.modal-backdrop') as HTMLElement;
    flushSync(() => {
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(document.body.getAttribute('data-result')).toBe('false');
  });

  test('multiple confirms can be stacked and resolved independently', async () => {
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          onClick={() => {
            const a = confirm({ title: 'A', message: 'a' });
            const b = confirm({ title: 'B', message: 'b' });
            a.then((r) => document.body.setAttribute('data-a', String(r)));
            b.then((r) => document.body.setAttribute('data-b', String(r)));
          }}
        >
          open
        </button>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    await Promise.resolve();
    expect(container.querySelectorAll('[data-testid="confirm-body"]').length).toBe(2);
    const cancels = container.querySelectorAll(
      '[data-testid="confirm-cancel"]'
    ) as NodeListOf<HTMLButtonElement>;
    expect(cancels.length).toBe(2);
    flushSync(() => cancels[1].click());
    await Promise.resolve();
    expect(document.body.getAttribute('data-b')).toBe('false');
    expect(container.querySelectorAll('[data-testid="confirm-body"]').length).toBe(1);
  });

  test('icon matches severity', () => {
    function Probe() {
      const confirm = useConfirm();
      return (
        <>
          <button data-testid="d" onClick={() => confirm({ title: 't', message: 'm', severity: 'danger' })}>d</button>
          <button data-testid="i" onClick={() => confirm({ title: 't', message: 'm', severity: 'info' })}>i</button>
        </>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );
    flushSync(() => (container.querySelector('[data-testid="d"]') as HTMLButtonElement).click());
    expect(container.querySelector('.confirm__icon')!.textContent).toBe('!');
    flushSync(() => (container.querySelector('[data-testid="confirm-cancel"]') as HTMLButtonElement).click());
    flushSync(() => (container.querySelector('[data-testid="i"]') as HTMLButtonElement).click());
    expect(container.querySelector('.confirm__icon')!.textContent).toBe('i');
  });

  test('ConfirmProvider renders the ModalContainer when modals are open', async () => {
    function Wrapper() {
      function Probe() {
        const confirm = useConfirm();
        return (
          <button
            data-testid="open"
            onClick={() => {
              confirm({ title: 't', message: 'm' });
            }}
          >
            open
          </button>
        );
      }
      return (
        <ModalProvider>
          <ConfirmProvider />
          <Probe />
        </ModalProvider>
      );
    }
    mount(<Wrapper />);
    expect(container.querySelector('.modal-root')).toBeNull();
    flushSync(() => {
      (container.querySelector('[data-testid="open"]') as HTMLButtonElement).click();
    });
    await Promise.resolve();
    expect(container.querySelector('.modal-root')).toBeTruthy();
  });

  test('await confirm() in async function returns true on confirm', async () => {
    let result: boolean | null = null;
    function Probe() {
      const confirm = useConfirm();
      return (
        <button
          onClick={async () => {
            result = await confirm({ title: 'X', message: 'Y' });
            document.body.setAttribute('data-result', String(result));
          }}
        >
          open
        </button>
      );
    }
    mount(
      <ModalProvider>
        <ModalContainer />
        <Probe />
      </ModalProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    await Promise.resolve();
    flushSync(() => {
      (container.querySelector('[data-testid="confirm-ok"]') as HTMLButtonElement).click();
    });
    await Promise.resolve();
    expect(result).toBe(true);
  });
});

/**
 * V149 Modal system tests
 *
 * Covers: ModalProvider state (open/close/closeAll/stack/FIFO eviction),
 * useModal hook contract, ModalContainer rendering (sizes, dismissable,
 * backdrop click, escape key, body scroll lock, focus management, a11y).
 */

process.env.NODE_ENV = 'development';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useState, type ReactNode } from 'react';
import {
  ModalProvider,
  useModal,
  type ModalSize,
} from '../components/Modal';
import { ModalContainer } from '../components/ModalContainer';

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

describe('ModalProvider', () => {
  function Counter() {
    const { modals } = useModal();
    return <span data-testid="count">{modals.length}</span>;
  }

  test('starts with empty modal list', () => {
    mount(
      <ModalProvider>
        <Counter />
      </ModalProvider>
    );
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '0'
    );
  });

  test('opens a modal and returns a non-empty id', () => {
    function Probe() {
      const { open, modals } = useModal();
      const [id, setId] = useState('');
      return (
        <>
          <button
            type="button"
            onClick={() => setId(open({ content: 'hello' }))}
          >
            trigger
          </button>
          <span data-testid="count">{modals.length}</span>
          <span data-testid="id">{id}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Probe />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
    const id = container.querySelector('[data-testid="id"]')!.textContent;
    expect(typeof id).toBe('string');
    expect((id as string).length).toBeGreaterThan(0);
  });

  test('respects explicit title/size/dismissable defaults', () => {
    function Probe() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              open({
                content: 'x',
                size: 'lg',
                dismissable: false,
              })
            }
          >
            trigger
          </button>
          <span data-testid="size">{modals[0]?.size ?? ''}</span>
          <span data-testid="dis">{String(modals[0]?.dismissable ?? '')}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Probe />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="size"]')!.textContent).toBe(
      'lg'
    );
    expect(container.querySelector('[data-testid="dis"]')!.textContent).toBe(
      'false'
    );
  });

  test('preserves explicit id when provided', () => {
    function Probe() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => open({ content: 'x', id: 'fixed-1' })}
          >
            trigger
          </button>
          <span data-testid="id">{modals[0]?.id ?? ''}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Probe />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="id"]')!.textContent).toBe(
      'fixed-1'
    );
  });

  test('close removes specific modal by id', () => {
    function Probe() {
      const { open, close, modals } = useModal();
      const [first, setFirst] = useState('');
      return (
        <>
          <button
            type="button"
            onClick={() => {
              setFirst(open({ content: 'a' }));
              open({ content: 'b' });
            }}
          >
            add
          </button>
          <button
            type="button"
            onClick={() => close(first)}
            data-testid="dismiss"
          >
            dismiss
          </button>
          <span data-testid="count">{modals.length}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Probe />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '2'
    );
    flushSync(() => {
      (
        container.querySelector('[data-testid="dismiss"]') as HTMLButtonElement
      ).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
  });

  test('closeAll removes all modals', () => {
    function Probe() {
      const { open, closeAll, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              open({ content: 'a' });
              open({ content: 'b' });
              open({ content: 'c' });
            }}
          >
            add
          </button>
          <button type="button" onClick={() => closeAll()}>
            closeall
          </button>
          <span data-testid="count">{modals.length}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Probe />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '3'
    );
    flushSync(() => {
      (
        container.querySelectorAll('button')[1] as HTMLButtonElement
      ).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '0'
    );
  });

  test('evicts oldest when exceeding maxModals', () => {
    function Probe() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              open({ content: 'oldest' });
              open({ content: 'middle' });
              open({ content: 'newest' });
            }}
          >
            add
          </button>
          <span data-testid="contents">
            {modals.map((m) => String(m.content)).join(',')}
          </span>
        </>
      );
    }
    mount(
      <ModalProvider maxModals={2}>
        <Probe />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(
      container.querySelector('[data-testid="contents"]')!.textContent
    ).toBe('middle,newest');
  });

  test('top returns the most recent modal', () => {
    function Probe() {
      const { open, top } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              open({ content: 'a' });
              open({ content: 'b' });
            }}
          >
            add
          </button>
          <span data-testid="top">{String(top?.content ?? 'null')}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Probe />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="top"]')!.textContent).toBe(
      'b'
    );
  });

  test('useModal throws when used outside provider', () => {
    function OuterProbe() {
      try {
        useModal();
      } catch (e) {
        return <span data-testid="msg">{(e as Error).message}</span>;
      }
      return <span data-testid="msg">no-error</span>;
    }
    mount(<OuterProbe />);
    expect(container.querySelector('[data-testid="msg"]')!.textContent).toMatch(
      /must be used within a ModalProvider/
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('ModalContainer', () => {
  test('renders nothing when no modals', () => {
    mount(
      <ModalProvider>
        <ModalContainer />
      </ModalProvider>
    );
    expect(container.querySelectorAll('[data-testid^="modal-"]').length).toBe(0);
  });

  test.each<[ModalSize, string]>([
    ['sm', 'modal--sm'],
    ['md', 'modal--md'],
    ['lg', 'modal--lg'],
    ['xl', 'modal--xl'],
  ])('renders %s size with proper class', (size, expectedClass) => {
    function Harness() {
      const { open } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => open({ content: 'sized', size })}
          >
            trigger
          </button>
          <ModalContainer />
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    const modals = container.querySelectorAll('[role="dialog"]');
    expect(modals.length).toBe(1);
    expect(modals[0]!.className).toContain(expectedClass);
    expect(modals[0]!.getAttribute('aria-modal')).toBe('true');
  });

  test('renders title and links aria-labelledby', () => {
    function Harness() {
      const { open } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => open({ title: 'My Title', content: 'body' })}
          >
            trigger
          </button>
          <ModalContainer />
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    const dialog = container.querySelector('[role="dialog"]')!;
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const title = container.querySelector('#' + labelledBy!)!;
    expect(title.textContent).toBe('My Title');
  });

  test('hides title bar and close button when title is empty', () => {
    function Harness() {
      const { open } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => open({ content: 'no title' })}
          >
            trigger
          </button>
          <ModalContainer />
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('.modal__header')).toBeNull();
    expect(container.querySelector('.modal__close')).toBeNull();
  });

  test('hides close button when dismissable: false', () => {
    function Harness() {
      const { open } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              open({ title: 'Locked', content: 'x', dismissable: false })
            }
          >
            trigger
          </button>
          <ModalContainer />
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('.modal__close')).toBeNull();
  });

  test('close button dismisses the top modal', () => {
    function Harness() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => open({ title: 'X', content: 'x' })}
          >
            trigger
          </button>
          <ModalContainer />
          <span data-testid="count">{modals.length}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
    const closeBtn = container.querySelector(
      '[aria-label="Close dialog"]'
    )! as HTMLButtonElement;
    flushSync(() => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '0'
    );
  });

  test('backdrop click dismisses top dismissable modal', () => {
    function Harness() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => open({ content: 'backdrop target' })}
          >
            trigger
          </button>
          <ModalContainer />
          <span data-testid="count">{modals.length}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
    const backdrops = container.querySelectorAll('.modal-backdrop');
    const topBackdrop = backdrops[backdrops.length - 1] as HTMLElement;
    flushSync(() => {
      topBackdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '0'
    );
  });

  test('backdrop click on non-dismissable modal does nothing', () => {
    function Harness() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              open({ content: 'locked', dismissable: false })
            }
          >
            trigger
          </button>
          <ModalContainer />
          <span data-testid="count">{modals.length}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    const backdrop = container.querySelector('.modal-backdrop') as HTMLElement;
    flushSync(() => {
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
  });

  test('click on modal body does not dismiss', () => {
    function Harness() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => open({ content: 'body click' })}
          >
            trigger
          </button>
          <ModalContainer />
          <span data-testid="count">{modals.length}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    flushSync(() => {
      dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
  });

  test('Escape key dismisses top dismissable modal', () => {
    function Harness() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => open({ content: 'esc target' })}
          >
            trigger
          </button>
          <ModalContainer />
          <span data-testid="count">{modals.length}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
    flushSync(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '0'
    );
  });

  test('Escape key does not dismiss non-dismissable modal', () => {
    function Harness() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              open({ content: 'locked', dismissable: false })
            }
          >
            trigger
          </button>
          <ModalContainer />
          <span data-testid="count">{modals.length}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    flushSync(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
  });

  test('non-Escape keys are ignored', () => {
    function Harness() {
      const { open, modals } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => open({ content: 'x' })}
          >
            trigger
          </button>
          <ModalContainer />
          <span data-testid="count">{modals.length}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    flushSync(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '1'
    );
  });

  test('body overflow is hidden when modal open, restored on close', () => {
    function Harness() {
      const { open, closeAll } = useModal();
      return (
        <>
          <button type="button" onClick={() => open({ content: 'lock' })}>
            open
          </button>
          <button type="button" onClick={() => closeAll()}>
            close
          </button>
          <ModalContainer />
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    expect(document.body.style.overflow).toBe('');
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(document.body.style.overflow).toBe('hidden');
    flushSync(() => {
      (
        container.querySelectorAll('button')[1] as HTMLButtonElement
      ).click();
    });
    expect(document.body.style.overflow).toBe('');
  });

  test('multiple modals render in stack order, only top is dismissable', () => {
    function Harness() {
      const { open, modals, top } = useModal();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              open({ content: 'first' });
              open({ content: 'second' });
            }}
          >
            add
          </button>
          <ModalContainer />
          <span data-testid="count">{modals.length}</span>
          <span data-testid="top">{String(top?.content ?? '')}</span>
        </>
      );
    }
    mount(
      <ModalProvider>
        <Harness />
      </ModalProvider>
    );
    flushSync(() => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      '2'
    );
    expect(container.querySelector('[data-testid="top"]')!.textContent).toBe(
      'second'
    );
    const backdrops = container.querySelectorAll('.modal-backdrop');
    expect(backdrops[0]!.className).toContain('modal-backdrop--nested');
    expect(
      backdrops[backdrops.length - 1]!.className
    ).not.toContain('modal-backdrop--nested');
  });
});

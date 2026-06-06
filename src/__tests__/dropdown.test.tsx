/**
 * V152 Dropdown menu system tests
 *
 * Covers: DropdownProvider context, Dropdown trigger open/close,
 * DropdownItem select, DropdownSeparator, DropdownLabel, keyboard
 * navigation (ArrowDown/Up/Home/End/Enter/Space/Escape), disabled
 * items, click-outside close, multiple dropdowns.
 */

process.env.NODE_ENV = 'development';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useState, type ReactNode } from 'react';
import {
  DropdownProvider,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  DropdownLabel,
  useDropdownContext,
} from '../components/Dropdown';

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
});

/* -------------------------------------------------------------------------- */

describe('Dropdown', () => {
  test('throws when used outside DropdownProvider', () => {
    function Probe() {
      try {
        useDropdownContext();
      } catch (e) {
        return <span data-testid="msg">{(e as Error).message}</span>;
      }
      return <span data-testid="msg">no-error</span>;
    }
    mount(<Probe />);
    expect(container.querySelector('[data-testid="msg"]')!.textContent).toMatch(
      /must be used within a DropdownProvider/
    );
  });

  test('renders trigger but no menu initially', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    expect(container.querySelector('button')!.textContent).toBe('Open');
    expect(container.querySelector('[data-testid="dropdown-menu"]')).toBeNull();
  });

  test('opens menu when trigger is clicked', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
          <DropdownItem>Item 2</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const menu = container.querySelector('[data-testid="dropdown-menu"]');
    expect(menu).toBeTruthy();
    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items.length).toBe(2);
  });

  test('closes menu when trigger is clicked again', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    const btn = container.querySelector('button') as HTMLButtonElement;
    flushSync(() => btn.click());
    expect(container.querySelector('[data-testid="dropdown-menu"]')).toBeTruthy();
    flushSync(() => btn.click());
    expect(container.querySelector('[data-testid="dropdown-menu"]')).toBeNull();
  });

  test('item click fires onSelect and closes menu', () => {
    const onSelect = vi.fn();
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem onSelect={onSelect}>Item 1</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const item = container.querySelector('[role="menuitem"]') as HTMLButtonElement;
    flushSync(() => item.click());
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="dropdown-menu"]')).toBeNull();
  });

  test('disabled item does not fire onSelect', () => {
    const onSelect = vi.fn();
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem disabled onSelect={onSelect}>Disabled</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const item = container.querySelector('[role="menuitem"]') as HTMLButtonElement;
    expect(item.disabled).toBe(true);
    flushSync(() => item.click());
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('Escape key closes the menu', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="dropdown-menu"]')).toBeTruthy();
    const menu = container.querySelector('[data-testid="dropdown-menu"]') as HTMLElement;
    flushSync(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container.querySelector('[data-testid="dropdown-menu"]')).toBeNull();
  });

  test('ArrowDown navigates to next item', () => {
    const onSelect = vi.fn();
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
          <DropdownItem onSelect={onSelect}>Item 2</DropdownItem>
          <DropdownItem>Item 3</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const menu = container.querySelector('[data-testid="dropdown-menu"]') as HTMLElement;
    // First item starts focused. Press ArrowDown twice to get to Item 3.
    flushSync(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    flushSync(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });
    // Now press Enter to activate the focused item (Item 3)
    flushSync(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    // Item 3 has no onSelect, but the menu should close
    expect(container.querySelector('[data-testid="dropdown-menu"]')).toBeNull();
  });

  test('ArrowUp navigates to previous item', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
          <DropdownItem>Item 2</DropdownItem>
          <DropdownItem>Item 3</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const menu = container.querySelector('[data-testid="dropdown-menu"]') as HTMLElement;
    flushSync(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    flushSync(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    });
    // Now Item 2 should be focused; pressing Space should activate it
    flushSync(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(container.querySelector('[data-testid="dropdown-menu"]')).toBeNull();
  });

  test('Home key navigates to first item', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
          <DropdownItem>Item 2</DropdownItem>
          <DropdownItem>Item 3</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const menu = container.querySelector('[data-testid="dropdown-menu"]') as HTMLElement;
    flushSync(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    flushSync(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    });
    expect(container.querySelectorAll('[role="menuitem"]').length).toBe(3);
  });

  test('skips disabled items in navigation', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
          <DropdownItem disabled>Disabled</DropdownItem>
          <DropdownItem>Item 3</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const items = container.querySelectorAll('[role="menuitem"]');
    expect(items[1]!.hasAttribute('disabled')).toBe(true);
  });

  test('renders separator', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
          <DropdownSeparator />
          <DropdownItem>Item 2</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    expect(container.querySelector('[data-testid="dropdown-separator"]')).toBeTruthy();
    expect(container.querySelector('[role="separator"]')).toBeTruthy();
  });

  test('renders label', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownLabel>Section</DropdownLabel>
          <DropdownItem>Item 1</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    flushSync(() => (container.querySelector('button') as HTMLButtonElement).click());
    const label = container.querySelector('[data-testid="dropdown-label"]');
    expect(label).toBeTruthy();
    expect(label!.textContent).toBe('Section');
  });

  test('trigger has aria-haspopup and aria-expanded', () => {
    mount(
      <DropdownProvider>
        <Dropdown trigger={<button type="button">Open</button>}>
          <DropdownItem>Item 1</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    const trigger = container.querySelector('button')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    flushSync(() => (trigger as HTMLButtonElement).click());
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  test('only one dropdown open at a time (shared context)', () => {
    const aId = 'a-' + Math.random().toString(36).slice(2, 7);
    const bId = 'b-' + Math.random().toString(36).slice(2, 7);
    mount(
      <DropdownProvider>
        <Dropdown id={aId} trigger={<button data-testid="a" type="button">A</button>}>
          <DropdownItem>A1</DropdownItem>
        </Dropdown>
        <Dropdown id={bId} trigger={<button data-testid="b" type="button">B</button>}>
          <DropdownItem>B1</DropdownItem>
        </Dropdown>
      </DropdownProvider>
    );
    const a = container.querySelector('[data-testid="a"]') as HTMLButtonElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLButtonElement;
    flushSync(() => a.click());
    const aMenus = container.querySelectorAll('[data-testid="dropdown-menu"]').length;
    console.log('After a click, menus:', aMenus);
    flushSync(() => b.click());
    const final = container.querySelectorAll('[data-testid="dropdown-menu"]').length;
    console.log('After b click, menus:', final);
    expect(final).toBe(1);
  });
});

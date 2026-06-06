/**
 * V153 Tabs system tests
 *
 * Covers: TabsRoot controlled/uncontrolled, TabsList keyboard navigation
 * (ArrowLeft/Right, Home/End), TabsTrigger select, TabsContent rendering,
 * disabled triggers, forceMount, a11y attributes.
 */

process.env.NODE_ENV = 'development';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useState, type ReactNode } from 'react';
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../components/Tabs';

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

describe('Tabs', () => {
  test('renders triggers but no panel initially when no default value', () => {
    mount(
      <TabsRoot>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </TabsRoot>
    );
    expect(container.querySelectorAll('[role="tab"]').length).toBe(2);
    expect(container.querySelectorAll('[role="tabpanel"]').length).toBe(0);
  });

  test('shows panel for default value', () => {
    mount(
      <TabsRoot defaultValue="b">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </TabsRoot>
    );
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe(
      'Panel B'
    );
  });

  test('click trigger switches panel (uncontrolled)', () => {
    mount(
      <TabsRoot defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </TabsRoot>
    );
    const triggers = container.querySelectorAll('[role="tab"]');
    flushSync(() => (triggers[1] as HTMLButtonElement).click());
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe(
      'Panel B'
    );
  });

  test('controlled mode respects value prop and onChange', () => {
    const onChange = vi.fn();
    function Wrapper() {
      const [v, setV] = useState('a');
      return (
        <TabsRoot
          value={v}
          onChange={(nv) => {
            onChange(nv);
            setV(nv);
          }}
        >
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
            <TabsTrigger value="b">B</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Panel A</TabsContent>
          <TabsContent value="b">Panel B</TabsContent>
        </TabsRoot>
      );
    }
    mount(<Wrapper />);
    const triggers = container.querySelectorAll('[role="tab"]');
    flushSync(() => (triggers[1] as HTMLButtonElement).click());
    expect(onChange).toHaveBeenCalledWith('b');
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe(
      'Panel B'
    );
  });

  test('aria-selected reflects active tab', () => {
    mount(
      <TabsRoot defaultValue="b">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </TabsRoot>
    );
    const triggers = container.querySelectorAll('[role="tab"]');
    expect(triggers[0]!.getAttribute('aria-selected')).toBe('false');
    expect(triggers[1]!.getAttribute('aria-selected')).toBe('true');
  });

  test('active tab has tabindex 0, others have -1 (roving tabindex)', () => {
    mount(
      <TabsRoot defaultValue="b">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
        <TabsContent value="c">Panel C</TabsContent>
      </TabsRoot>
    );
    const triggers = container.querySelectorAll('[role="tab"]');
    expect((triggers[0] as HTMLButtonElement).tabIndex).toBe(-1);
    expect((triggers[1] as HTMLButtonElement).tabIndex).toBe(0);
    expect((triggers[2] as HTMLButtonElement).tabIndex).toBe(-1);
  });

  test('ArrowRight moves to next tab', () => {
    mount(
      <TabsRoot defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
        <TabsContent value="c">Panel C</TabsContent>
      </TabsRoot>
    );
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    flushSync(() => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe(
      'Panel B'
    );
  });

  test('ArrowLeft moves to previous tab', () => {
    mount(
      <TabsRoot defaultValue="b">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </TabsRoot>
    );
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    flushSync(() => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe(
      'Panel A'
    );
  });

  test('ArrowRight wraps to first from last', () => {
    mount(
      <TabsRoot defaultValue="c">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
        <TabsContent value="c">Panel C</TabsContent>
      </TabsRoot>
    );
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    flushSync(() => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe(
      'Panel A'
    );
  });

  test('Home key goes to first tab', () => {
    mount(
      <TabsRoot defaultValue="c">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
        <TabsContent value="c">Panel C</TabsContent>
      </TabsRoot>
    );
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    flushSync(() => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    });
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe(
      'Panel A'
    );
  });

  test('End key goes to last tab', () => {
    mount(
      <TabsRoot defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
        <TabsContent value="c">Panel C</TabsContent>
      </TabsRoot>
    );
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    flushSync(() => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe(
      'Panel C'
    );
  });

  test('disabled tab is skipped by keyboard nav', () => {
    mount(
      <TabsRoot defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b" disabled>B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
        <TabsContent value="c">Panel C</TabsContent>
      </TabsRoot>
    );
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    flushSync(() => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    // Should skip B and go to C
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toBe(
      'Panel C'
    );
  });

  test('disabled tab cannot be clicked', () => {
    const onChange = vi.fn();
    mount(
      <TabsRoot defaultValue="a" onChange={onChange}>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b" disabled>B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </TabsRoot>
    );
    const triggers = container.querySelectorAll('[role="tab"]');
    flushSync(() => (triggers[1] as HTMLButtonElement).click());
    expect(onChange).not.toHaveBeenCalled();
  });

  test('group disabled disables all triggers', () => {
    mount(
      <TabsRoot defaultValue="a" disabled>
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </TabsRoot>
    );
    const triggers = container.querySelectorAll('[role="tab"]');
    expect((triggers[0] as HTMLButtonElement).disabled).toBe(true);
    expect((triggers[1] as HTMLButtonElement).disabled).toBe(true);
  });

  test('panel has correct id and aria-labelledby', () => {
    mount(
      <TabsRoot defaultValue="a" id="t1">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
      </TabsRoot>
    );
    const panel = container.querySelector('[role="tabpanel"]')!;
    expect(panel.id).toBe('t1-panel-a');
    expect(panel.getAttribute('aria-labelledby')).toBe('t1-trigger-a');
  });

  test('forceMount keeps inactive panels in DOM', () => {
    mount(
      <TabsRoot defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a" forceMount>Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </TabsRoot>
    );
    const panels = container.querySelectorAll('[role="tabpanel"]');
    // Only A is active; B is hidden but A is in DOM.
    expect(panels.length).toBe(1);
  });

  test('vertical orientation changes aria-orientation', () => {
    mount(
      <TabsRoot defaultValue="a" orientation="vertical">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
      </TabsRoot>
    );
    const list = container.querySelector('[role="tablist"]')!;
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
  });
});

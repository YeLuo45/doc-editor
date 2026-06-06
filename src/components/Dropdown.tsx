/**
 * V152 Dropdown menu system — keyboard-navigable menu.
 *
 * DropdownProvider context + useDropdown() hook.
 * DropdownRoot is the menu container. Each DropdownItem is a clickable row.
 * DropdownSeparator renders a divider line.
 * DropdownLabel renders a non-interactive section header.
 *
 * Keyboard navigation:
 *   - ArrowDown / ArrowUp: move focus to next/prev item
 *   - Home / End: first / last item
 *   - Enter / Space: activate focused item
 *   - Escape: close menu
 *
 * Usage:
 *   <DropdownProvider>
 *     <Dropdown trigger={<button>Open</button>}>
 *       <DropdownItem onSelect={fn}>Action</DropdownItem>
 *       <DropdownSeparator />
 *       <DropdownLabel>Section</DropdownLabel>
 *       <DropdownItem>Item 2</DropdownItem>
 *     </Dropdown>
 *   </DropdownProvider>
 */

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

interface DropdownContextValue {
  openId: string | null;
  open: (id: string, triggerRect: DOMRect) => void;
  close: () => void;
  registerTrigger: (id: string, el: HTMLElement | null) => void;
  triggerRects: Map<string, DOMRect>;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export function useDropdownContext(): DropdownContextValue {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error('Dropdown components must be used within a DropdownProvider');
  }
  return ctx;
}

export interface DropdownProviderProps {
  children: ReactNode;
}

export function DropdownProvider({ children }: DropdownProviderProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [triggerRects, setTriggerRects] = useState<Map<string, DOMRect>>(
    () => new Map()
  );

  const registerTrigger = useCallback(
    (id: string, el: HTMLElement | null) => {
      setTriggerRects((prev) => {
        const next = new Map(prev);
        if (el) {
          next.set(id, el.getBoundingClientRect());
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    []
  );

  const open = useCallback((id: string, triggerRect: DOMRect) => {
    setOpenId(id);
    setTriggerRects((prev) => {
      const next = new Map(prev);
      next.set(id, triggerRect);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setOpenId(null);
  }, []);

  const value = useMemo<DropdownContextValue>(
    () => ({ openId, open, close, registerTrigger, triggerRects }),
    [openId, open, close, registerTrigger, triggerRects]
  );

  return (
    <DropdownContext.Provider value={value}>
      {children}
    </DropdownContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */

export interface DropdownProps {
  /** Element that triggers the menu (e.g. a button). */
  trigger: ReactElement;
  /** Dropdown menu contents (DropdownItem, DropdownSeparator, DropdownLabel). */
  children: ReactNode;
  /** Optional id; auto-generated if omitted. */
  id?: string;
  /** Optional className on the trigger wrapper. */
  className?: string;
}

let dropdownCounter = 0;

/**
 * Dropdown component. Renders the trigger and (when open) the menu.
 */
export function Dropdown({ trigger, children, id, className }: DropdownProps) {
  const generatedId = useId();
  const menuId = id ?? `dd-${generatedId}`;
  const { openId, open, close, registerTrigger } = useDropdownContext();
  const triggerRef = useRef<HTMLElement | null>(null);
  const isOpen = openId === menuId;

  useEffect(() => {
    registerTrigger(menuId, triggerRef.current);
    return () => registerTrigger(menuId, null);
  }, [menuId, registerTrigger]);

  const onTriggerClick = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      close();
    } else {
      // The trigger's ref might not be set yet on first click (it's
      // populated via queueMicrotask). Use the current target as a
      // fallback for measuring.
      const target = triggerRef.current ?? (e.currentTarget as HTMLElement);
      const rect = target.getBoundingClientRect();
      open(menuId, rect);
    }
  };

  // Render the trigger with an onClick handler
  let triggerNode: ReactNode = trigger;
  if (isValidElement(trigger)) {
    const trigEl = trigger as ReactElement<{
      onClick?: (e: ReactMouseEvent) => void;
      'aria-haspopup'?: 'menu';
      'aria-expanded'?: boolean;
    }>;
    const existingOnClick = trigEl.props.onClick;
    triggerNode = cloneElement(trigEl, {
      onClick: (e: ReactMouseEvent) => {
        existingOnClick?.(e);
        onTriggerClick(e);
      },
      'aria-haspopup': 'menu',
      'aria-expanded': isOpen,
    });
  }

  return (
    <span
      className={'dropdown-root' + (className ? ' ' + className : '')}
      ref={(el) => {
        if (el) {
          // Find the trigger's actual element after render.
          // We use a microtask to get the right element.
          queueMicrotask(() => {
            const btn = el.querySelector('button, [role="button"]');
            triggerRef.current = (btn as HTMLElement) ?? null;
            registerTrigger(menuId, triggerRef.current);
          });
        }
      }}
      data-testid={'dropdown-root-' + menuId}
    >
      {triggerNode}
      {isOpen && <DropdownItemsContainer menuId={menuId}>{children}</DropdownItemsContainer>}
    </span>
  );
}

interface DropdownItemsContainerProps {
  menuId: string;
  children: ReactNode;
}

function DropdownItemsContainer({ menuId, children }: DropdownItemsContainerProps) {
  const { triggerRects, close } = useDropdownContext();
  const rect = triggerRects.get(menuId);
  const [focusIndex, setFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef<
    Array<{ id: string; disabled: boolean; onSelect: () => void; element: HTMLElement | null }>
  >([]);

  if (!rect) return null;
  const top = rect.bottom + 4;
  const left = rect.left;

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const enabled = itemsRef.current.filter((i) => !i.disabled);
    if (enabled.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIdx = itemsRef.current.findIndex(
        (i) => i.element === document.activeElement
      );
      const enabledCurrent = enabled.findIndex(
        (i) => i.id === itemsRef.current[currentIdx]?.id
      );
      const next = (enabledCurrent + 1) % enabled.length;
      itemsRef.current[
        itemsRef.current.findIndex((i) => i.id === enabled[next].id)
      ]?.element?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIdx = itemsRef.current.findIndex(
        (i) => i.element === document.activeElement
      );
      const enabledCurrent = enabled.findIndex(
        (i) => i.id === itemsRef.current[currentIdx]?.id
      );
      const prev = (enabledCurrent - 1 + enabled.length) % enabled.length;
      itemsRef.current[
        itemsRef.current.findIndex((i) => i.id === enabled[prev].id)
      ]?.element?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      enabled[0]?.element?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      enabled[enabled.length - 1]?.element?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const active = itemsRef.current.find(
        (i) => i.element === document.activeElement
      );
      if (active && !active.disabled) {
        active.onSelect();
        close();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  return (
    <div
      ref={containerRef}
      role="menu"
      tabIndex={-1}
      className="dropdown-menu"
      onKeyDown={onKeyDown}
      style={{ top, left, position: 'fixed' }}
      data-testid="dropdown-menu"
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownItemsContext.Provider
        value={{
          registerItem: (item) => {
            itemsRef.current.push(item);
            return () => {
              itemsRef.current = itemsRef.current.filter((i) => i.id !== item.id);
            };
          },
        }}
      >
        {children}
      </DropdownItemsContext.Provider>
    </div>
  );
}

const DropdownItemsContext = createContext<{
  registerItem: (item: {
    id: string;
    disabled: boolean;
    onSelect: () => void;
    element: HTMLElement | null;
  }) => () => void;
} | null>(null);

function useDropdownItemsContext() {
  const ctx = useContext(DropdownItemsContext);
  if (!ctx) throw new Error('DropdownItem must be inside Dropdown');
  return ctx;
}

export interface DropdownItemProps {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  /** Optional id used for testing. */
  id?: string;
  /** Optional className. */
  className?: string;
}

let itemCounter = 0;

export function DropdownItem({
  children,
  onSelect,
  disabled = false,
  id,
  className,
}: DropdownItemProps) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const generatedId = useId();
  const itemId = id ?? `item-${++itemCounter}`;
  const ctx = useDropdownItemsContext();
  const { close } = useDropdownContext();

  useEffect(() => {
    const unregister = ctx.registerItem({
      id: itemId,
      disabled,
      onSelect: () => onSelect?.(),
      element: ref.current,
    });
    return unregister;
  }, [ctx, disabled, itemId, onSelect]);

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      disabled={disabled}
      className={'dropdown-item' + (className ? ' ' + className : '')}
      onClick={() => {
        if (!disabled) {
          onSelect?.();
          close();
        }
      }}
      data-testid={itemId}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return (
    <div
      role="separator"
      className="dropdown-separator"
      data-testid="dropdown-separator"
    />
  );
}

export interface DropdownLabelProps {
  children: ReactNode;
}
export function DropdownLabel({ children }: DropdownLabelProps) {
  return (
    <div
      className="dropdown-label"
      data-testid="dropdown-label"
    >
      {children}
    </div>
  );
}

// Suppress unused-var lint for the menuId param used for debugging
void dropdownCounter;

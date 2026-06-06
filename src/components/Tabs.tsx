/**
 * V153 Tabs system — controlled / uncontrolled tab navigation.
 *
 * TabsRoot is the top-level container. TabsList is the row of tab buttons.
 * TabsTrigger is a single tab. TabsContent is the panel shown when its
 * corresponding trigger is active.
 *
 * Supports both controlled (activeValue/onChange props) and uncontrolled
 * (defaultValue) modes. Keyboard navigation: ArrowLeft/Right to move
 * between enabled triggers, Home/End to first/last. Disabled triggers
 * are skipped.
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
  type ReactElement,
  type ReactNode,
} from 'react';

interface TabsContextValue {
  /** Currently active tab value. */
  value: string;
  /** Switch to a new tab (controlled or uncontrolled). */
  onChange: (value: string) => void;
  /** Base id for the tabs (used for a11y). */
  baseId: string;
  /** Orientation for keyboard nav. */
  orientation: 'horizontal' | 'vertical';
  /** Disable the entire tabs. */
  disabled: boolean;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs components must be used within a TabsRoot');
  }
  return ctx;
}

export interface TabsRootProps {
  children: ReactNode;
  /** Controlled active tab value. */
  value?: string;
  /** Default tab value (uncontrolled mode). */
  defaultValue?: string;
  /** Called when active tab changes. */
  onChange?: (value: string) => void;
  /** Keyboard nav orientation. Default horizontal. */
  orientation?: 'horizontal' | 'vertical';
  /** Disable all tabs. */
  disabled?: boolean;
  /** Optional id. */
  id?: string;
  /** Optional className. */
  className?: string;
}

export function TabsRoot({
  children,
  value: controlledValue,
  defaultValue,
  onChange: controlledOnChange,
  orientation = 'horizontal',
  disabled = false,
  id,
  className,
}: TabsRootProps) {
  const generatedId = useId();
  const baseId = id ?? `tabs-${generatedId}`;
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue ?? ''
  );
  const value = isControlled ? controlledValue : internalValue;

  const onChange = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      controlledOnChange?.(next);
    },
    [isControlled, controlledOnChange]
  );

  const ctx = useMemo<TabsContextValue>(
    () => ({ value, onChange, baseId, orientation, disabled }),
    [value, onChange, baseId, orientation, disabled]
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div
        className={'tabs-root' + (className ? ' ' + className : '')}
        data-orientation={orientation}
        data-testid={baseId}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

/**
 * TabsList — the row of tab buttons. Handles keyboard navigation.
 */
export function TabsList({ children, className }: TabsListProps) {
  const { value, onChange, baseId, orientation, disabled } = useTabsContext();
  const listRef = useRef<HTMLDivElement | null>(null);

  // Extract trigger values and disabled states
  const items: Array<{ value: string; disabled: boolean }> = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const c = child as ReactElement<{
        value?: string;
        disabled?: boolean;
      }>;
      if (c.props.value !== undefined) {
        items.push({
          value: c.props.value,
          disabled: c.props.disabled ?? false,
        });
      }
    }
  });

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const enabled = items.filter((i) => !i.disabled);
    if (enabled.length === 0) return;
    const currentIdx = enabled.findIndex((i) => i.value === value);
    const isHoriz = orientation === 'horizontal';
    const nextKey = isHoriz ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHoriz ? 'ArrowLeft' : 'ArrowUp';

    if (e.key === nextKey) {
      e.preventDefault();
      const next = (currentIdx + 1) % enabled.length;
      onChange(enabled[next]!.value);
    } else if (e.key === prevKey) {
      e.preventDefault();
      const prev = (currentIdx - 1 + enabled.length) % enabled.length;
      onChange(enabled[prev]!.value);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(enabled[0]!.value);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(enabled[enabled.length - 1]!.value);
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={orientation}
      className={'tabs-list' + (className ? ' ' + className : '')}
      onKeyDown={onKeyDown}
      data-testid={`${baseId}-list`}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TabsTrigger({
  value,
  children,
  disabled = false,
  className,
  id: providedId,
}: TabsTriggerProps) {
  const { value: activeValue, onChange, baseId, disabled: groupDisabled } =
    useTabsContext();
  const isActive = activeValue === value;
  const reactId = useId();
  const triggerId = providedId ?? `${baseId}-trigger-${value}`;
  const panelId = `${baseId}-panel-${value}`;
  const isDisabled = disabled || groupDisabled;

  return (
    <button
      type="button"
      role="tab"
      id={triggerId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      disabled={isDisabled}
      className={
        'tabs-trigger' +
        (isActive ? ' tabs-trigger--active' : '') +
        (className ? ' ' + className : '')
      }
      onClick={() => {
        if (!isDisabled) onChange(value);
      }}
      data-testid={triggerId}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
  /** Force mount even when not active (useful for animations). */
  forceMount?: boolean;
}

export function TabsContent({
  value,
  children,
  className,
  forceMount = false,
}: TabsContentProps) {
  const { value: activeValue, baseId } = useTabsContext();
  const isActive = activeValue === value;
  if (!isActive && !forceMount) return null;
  const panelId = `${baseId}-panel-${value}`;
  const triggerId = `${baseId}-trigger-${value}`;
  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={triggerId}
      tabIndex={0}
      hidden={!isActive}
      className={'tabs-panel' + (className ? ' ' + className : '')}
      data-testid={panelId}
    >
      {children}
    </div>
  );
}

// Suppress unused-var lint for the unused id helper
void cloneElement;

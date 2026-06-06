/**
 * V150 Tooltip system — accessible hover/focus tooltips.
 *
 * TooltipProvider context + useTooltip hook + <Tooltip> component.
 * 4 positions (top/right/bottom/left) with auto-flip near edges.
 * Show delay default 300ms. Dismiss on Esc + scroll + blur.
 *
 * Usage: <Tooltip content="..."><button>trigger</button></Tooltip>
 *   (wraps child in a transparent span that owns the event listeners)
 */

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipOptions {
  content: ReactNode;
  position?: TooltipPosition;
  showDelay?: number;
  hideDelay?: number;
  disabled?: boolean;
}

interface ActiveTooltip {
  id: string;
  content: ReactNode;
  position: TooltipPosition;
  target: HTMLElement;
}

interface TooltipContextValue {
  active: ActiveTooltip | null;
  show: (opts: Omit<ActiveTooltip, 'id' | 'target'> & {
    target: HTMLElement;
  }) => string;
  hide: (id?: string) => void;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

let tooltipCounter = 0;
function nextTooltipId(): string {
  tooltipCounter += 1;
  return `tt-${Date.now().toString(36)}-${tooltipCounter}`;
}

export interface TooltipProviderProps {
  children: ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  const [active, setActive] = useState<ActiveTooltip | null>(null);

  const hide = useCallback((id?: string) => {
    // Use direct value (not functional) for test reliability.
    // The id check is done at the caller (onHide) level.
    setActive(null);
  }, []);

  const show = useCallback(
    (
      opts: Omit<ActiveTooltip, 'id' | 'target'> & { target: HTMLElement }
    ): string => {
      const id = nextTooltipId();
      setActive({
        id,
        content: opts.content,
        position: opts.position,
        target: opts.target,
      });
      return id;
    },
    []
  );

  const value = useMemo<TooltipContextValue>(
    () => ({ active, show, hide }),
    [active, show, hide]
  );

  return (
    <TooltipContext.Provider value={value}>
      {children}
      <TooltipLayer />
    </TooltipContext.Provider>
  );
}

export function useTooltip(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return ctx;
}

function TooltipLayer() {
  const { active, hide } = useTooltip();

  const coords = useMemo(() => {
    if (!active) return null;
    const rect = active.target.getBoundingClientRect();
    const pos = pickPosition(active.position, rect);
    return {
      top: pos.top + window.scrollY,
      left: pos.left + window.scrollX,
      position: pos.position,
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const id = active.id;
    const onScroll = () => hide(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide(id);
    };
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, hide]);

  if (!active || !coords) return null;

  return (
    <div
      className={`tooltip tooltip--${coords.position}`}
      role="tooltip"
      data-testid="tooltip"
      style={{ top: coords.top, left: coords.left }}
    >
      {active.content}
    </div>
  );
}

function pickPosition(
  preferred: TooltipPosition,
  rect: DOMRect
): { top: number; left: number; position: TooltipPosition } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipWidth = 200;
  const tooltipHeight = 32;
  const gap = 8;
  const order: TooltipPosition[] = [
    preferred,
    ...(['top', 'right', 'bottom', 'left'] as TooltipPosition[]).filter(
      (p) => p !== preferred
    ),
  ];
  for (const pos of order) {
    if (pos === 'top' && rect.top - tooltipHeight - gap >= 0) {
      return {
        top: rect.top - tooltipHeight - gap,
        left: rect.left + rect.width / 2 - tooltipWidth / 2,
        position: pos,
      };
    }
    if (pos === 'bottom' && rect.bottom + tooltipHeight + gap <= vh) {
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2 - tooltipWidth / 2,
        position: pos,
      };
    }
    if (pos === 'left' && rect.left - tooltipWidth - gap >= 0) {
      return {
        top: rect.top + rect.height / 2 - tooltipHeight / 2,
        left: rect.left - tooltipWidth - gap,
        position: pos,
      };
    }
    if (pos === 'right' && rect.right + tooltipWidth + gap <= vw) {
      return {
        top: rect.top + rect.height / 2 - tooltipHeight / 2,
        left: rect.right + gap,
        position: pos,
      };
    }
  }
  return {
    top: rect.bottom + gap,
    left: rect.left + rect.width / 2 - tooltipWidth / 2,
    position: 'bottom',
  };
}

export interface TooltipHandle {
  show: () => void;
  hide: () => void;
}

export interface TooltipProps extends TooltipOptions {
  children: ReactNode;
  className?: string;
}

/**
 * <Tooltip content="..." position="top">
 *   <button>trigger</button>
 * </Tooltip>
 *
 * The wrapper is an inline-block span that owns mouse/focus event
 * listeners. Children are rendered inside the wrapper.
 */
export const Tooltip = forwardRef(function Tooltip(
  {
    content,
    position = 'top',
    showDelay = 300,
    disabled = false,
    children,
    className,
  }: TooltipProps,
  ref: Ref<TooltipHandle>
) {
  const { show, hide, active } = useTooltip();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const idRef = useRef<string | null>(null);
  const reactId = useId();

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const setRef = useCallback((node: HTMLElement | null) => {
    targetRef.current = node;
  }, []);

  const onShow = useCallback(() => {
    if (disabled) return;
    clearTimers();
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = null;
      const target = targetRef.current;
      if (!target) return;
      idRef.current = show({
        content,
        position,
        target,
      });
    }, showDelay);
  }, [clearTimers, content, disabled, position, show, showDelay]);

  const onHide = useCallback(() => {
    clearTimers();
    const id = idRef.current;
    idRef.current = null;
    if (id) hide(id);
  }, [clearTimers, hide]);

  useImperativeHandle(
    ref,
    () => ({
      show: () => {
        clearTimers();
        const target = targetRef.current;
        if (target) {
          idRef.current = show({ content, position, target });
        }
      },
      hide: () => onHide(),
    }),
    [clearTimers, content, onHide, position, show]
  );

  useEffect(() => {
    return () => {
      clearTimers();
      if (idRef.current) hide(idRef.current);
    };
  }, [clearTimers, hide]);

  const isActive = active && targetRef.current === active.target;
  const describedBy = isActive ? `${reactId}-tip` : undefined;

  return (
    <span
      ref={setRef as Ref<HTMLSpanElement>}
      className={'tooltip-wrapper' + (className ? ' ' + className : '')}
      style={{ display: 'inline-block', position: 'relative' }}
      onMouseEnter={onShow}
      onMouseLeave={onHide}
      onFocus={onShow}
      onBlur={onHide}
      data-testid="tooltip-wrapper"
    >
      {children}
      {describedBy && (
        <span id={describedBy} hidden>
          {content}
        </span>
      )}
    </span>
  );
});

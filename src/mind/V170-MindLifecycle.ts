/**
 * V170 MindLifecycle - Direction A Writing Mind (Iter 16/30)
 * ruflo: writing session lifecycle (init/active/pause/resume/close)
 */
export type LifecycleState = 'init' | 'active' | 'paused' | 'resumed' | 'closed' | 'archived';

export interface LifecycleEvent {
  from: LifecycleState | null;
  to: LifecycleState;
  timestamp: number;
  reason?: string;
}

export interface LifecycleTracker {
  current: LifecycleState;
  history: LifecycleEvent[];
  startedAt: number;
  lastTransition: number;
  transitions: number;
}

const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  init: ['active', 'closed'],
  active: ['paused', 'closed'],
  paused: ['resumed', 'closed'],
  resumed: ['active', 'closed'],
  closed: ['archived'],
  archived: [],
};

export function createLifecycleTracker(): LifecycleTracker {
  const now = Date.now();
  return { current: 'init', history: [{ from: null, to: 'init', timestamp: now, reason: 'created' }], startedAt: now, lastTransition: now, transitions: 0 };
}

export function transition(tracker: LifecycleTracker, to: LifecycleState, reason?: string): LifecycleTracker {
  if (!VALID_TRANSITIONS[tracker.current].includes(to)) {
    throw new Error(`Invalid transition: ${tracker.current} -> ${to}`);
  }
  const event: LifecycleEvent = { from: tracker.current, to, timestamp: Date.now(), reason };
  return {
    ...tracker,
    current: to,
    history: [...tracker.history, event].slice(-100),
    lastTransition: Date.now(),
    transitions: tracker.transitions + 1,
  };
}

export function activate(tracker: LifecycleTracker): LifecycleTracker {
  return transition(tracker, 'active', 'activated');
}

export function pause(tracker: LifecycleTracker): LifecycleTracker {
  return transition(tracker, 'paused', 'paused');
}

export function resume(tracker: LifecycleTracker): LifecycleTracker {
  return transition(tracker, 'resumed', 'resumed');
}

export function close(tracker: LifecycleTracker): LifecycleTracker {
  return transition(tracker, 'closed', 'closed');
}

export function archive(tracker: LifecycleTracker): LifecycleTracker {
  return transition(tracker, 'archived', 'archived');
}

export function isActive(tracker: LifecycleTracker): boolean {
  return tracker.current === 'active' || tracker.current === 'resumed';
}

export function getDuration(tracker: LifecycleTracker): number {
  return Date.now() - tracker.startedAt;
}

export function getIdleTime(tracker: LifecycleTracker): number {
  return Date.now() - tracker.lastTransition;
}

export function getLifecycleReport(tracker: LifecycleTracker): { current: LifecycleState; transitions: number; duration: number; idle: number; historySize: number } {
  return { current: tracker.current, transitions: tracker.transitions, duration: getDuration(tracker), idle: getIdleTime(tracker), historySize: tracker.history.length };
}

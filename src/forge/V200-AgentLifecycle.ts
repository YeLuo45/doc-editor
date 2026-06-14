/**
 * V200 AgentLifecycle - Direction B Agent Forge (Iter 16/30)
 * ruflo: Agent init/active/paused/stopped/archived state machine
 */
export type AgentLifecycleState = 'init' | 'loading' | 'active' | 'paused' | 'stopped' | 'archived' | 'error';

export interface LifecycleEvent {
  from: AgentLifecycleState | null;
  to: AgentLifecycleState;
  timestamp: number;
  reason?: string;
}

export interface AgentLifecycleTracker {
  agentId: string;
  current: AgentLifecycleState;
  history: LifecycleEvent[];
  startedAt: number;
  lastTransition: number;
  transitions: number;
}

const VALID_TRANSITIONS: Record<AgentLifecycleState, AgentLifecycleState[]> = {
  init: ['loading', 'stopped', 'error'],
  loading: ['active', 'stopped', 'error'],
  active: ['paused', 'stopped', 'error'],
  paused: ['active', 'stopped', 'error'],
  stopped: ['archived', 'loading'],
  archived: [],
  error: ['stopped', 'archived'],
};

export function createLifecycleTracker(agentId: string): AgentLifecycleTracker {
  const now = Date.now();
  return { agentId, current: 'init', history: [{ from: null, to: 'init', timestamp: now, reason: 'created' }], startedAt: now, lastTransition: now, transitions: 0 };
}

export function transition(tracker: AgentLifecycleTracker, to: AgentLifecycleState, reason?: string): AgentLifecycleTracker {
  if (!VALID_TRANSITIONS[tracker.current].includes(to)) {
    throw new Error(`Invalid transition: ${tracker.current} -> ${to}`);
  }
  const event: LifecycleEvent = { from: tracker.current, to, timestamp: Date.now(), reason };
  return { ...tracker, current: to, history: [...tracker.history, event].slice(-50), lastTransition: Date.now(), transitions: tracker.transitions + 1 };
}

export function startAgent(tracker: AgentLifecycleTracker): AgentLifecycleTracker {
  return transition(tracker, 'loading', 'start');
}

export function activateAgent(tracker: AgentLifecycleTracker): AgentLifecycleTracker {
  return transition(tracker, 'active', 'activate');
}

export function pauseAgent(tracker: AgentLifecycleTracker): AgentLifecycleTracker {
  return transition(tracker, 'paused', 'pause');
}

export function stopAgent(tracker: AgentLifecycleTracker): AgentLifecycleTracker {
  return transition(tracker, 'stopped', 'stop');
}

export function archiveAgent(tracker: AgentLifecycleTracker): AgentLifecycleTracker {
  return transition(tracker, 'archived', 'archive');
}

export function errorAgent(tracker: AgentLifecycleTracker, reason: string): AgentLifecycleTracker {
  return transition(tracker, 'error', reason);
}

export function isActive(tracker: AgentLifecycleTracker): boolean {
  return tracker.current === 'active';
}

export function getUptime(tracker: AgentLifecycleTracker): number {
  return Date.now() - tracker.startedAt;
}

export function getLifecycleReport(tracker: AgentLifecycleTracker): { current: AgentLifecycleState; transitions: number; uptime: number; historySize: number } {
  return { current: tracker.current, transitions: tracker.transitions, uptime: getUptime(tracker), historySize: tracker.history.length };
}

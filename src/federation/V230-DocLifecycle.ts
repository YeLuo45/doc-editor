/**
 * V230 DocLifecycle - Direction C Doc Federation (Iter 16/30)
 * ruflo: Document lifecycle state machine
 */
export type DocState = 'draft' | 'active' | 'archived' | 'deleted' | 'locked';

export interface DocLifecycleEvent {
  from: DocState | null;
  to: DocState;
  timestamp: number;
  reason?: string;
}

export interface DocLifecycleTracker {
  docId: string;
  current: DocState;
  history: DocLifecycleEvent[];
  startedAt: number;
  lastTransition: number;
  transitions: number;
}

const VALID: Record<DocState, DocState[]> = {
  draft: ['active', 'deleted', 'archived'],
  active: ['archived', 'locked', 'deleted'],
  archived: ['active', 'deleted'],
  deleted: [],
  locked: ['active', 'deleted'],
};

export function createDocLifecycleTracker(docId: string): DocLifecycleTracker {
  const now = Date.now();
  return { docId, current: 'draft', history: [{ from: null, to: 'draft', timestamp: now, reason: 'created' }], startedAt: now, lastTransition: now, transitions: 0 };
}

export function transitionDocState(tracker: DocLifecycleTracker, to: DocState, reason?: string): DocLifecycleTracker {
  if (!VALID[tracker.current].includes(to)) {
    throw new Error(`Invalid transition: ${tracker.current} -> ${to}`);
  }
  return { ...tracker, current: to, history: [...tracker.history, { from: tracker.current, to, timestamp: Date.now(), reason }].slice(-50), lastTransition: Date.now(), transitions: tracker.transitions + 1 };
}

export function activateDoc(tracker: DocLifecycleTracker): DocLifecycleTracker {
  return transitionDocState(tracker, 'active', 'activated');
}

export function archiveDoc(tracker: DocLifecycleTracker): DocLifecycleTracker {
  return transitionDocState(tracker, 'archived', 'archived');
}

export function deleteDoc(tracker: DocLifecycleTracker): DocLifecycleTracker {
  return transitionDocState(tracker, 'deleted', 'deleted');
}

export function lockDoc(tracker: DocLifecycleTracker): DocLifecycleTracker {
  return transitionDocState(tracker, 'locked', 'locked for editing');
}

export function unlockDoc(tracker: DocLifecycleTracker): DocLifecycleTracker {
  return transitionDocState(tracker, 'active', 'unlocked');
}

export function isDocActive(tracker: DocLifecycleTracker): boolean {
  return tracker.current === 'active';
}

export function isDocDeleted(tracker: DocLifecycleTracker): boolean {
  return tracker.current === 'deleted';
}

export function getDocAge(tracker: DocLifecycleTracker): number {
  return Date.now() - tracker.startedAt;
}

export function getDocLifecycleReport(tracker: DocLifecycleTracker): { current: DocState; transitions: number; age: number; historySize: number } {
  return { current: tracker.current, transitions: tracker.transitions, age: getDocAge(tracker), historySize: tracker.history.length };
}

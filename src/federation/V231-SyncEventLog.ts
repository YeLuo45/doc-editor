/**
 * V231 SyncEventLog - Direction C Doc Federation (Iter 17/30)
 * ruflo: Sync event log with filtering
 */
export type SyncEventLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SyncEvent {
  id: number;
  timestamp: number;
  level: SyncEventLevel;
  category: string;
  message: string;
  docId?: string;
  deviceId?: string;
  data?: any;
}

export interface SyncEventLogState {
  events: SyncEvent[];
  filter: { level?: SyncEventLevel; category?: string; docId?: string };
  nextId: number;
  totalLogged: number;
  dropped: number;
}

export function createSyncEventLog(): SyncEventLogState {
  return { events: [], filter: {}, nextId: 1, totalLogged: 0, dropped: 0 };
}

export function logSyncEvent(state: SyncEventLogState, level: SyncEventLevel, category: string, message: string, data?: { docId?: string; deviceId?: string; extra?: any }): SyncEventLogState {
  if (state.filter.level && !shouldLogLevel(state.filter.level, level)) {
    return { ...state, dropped: state.dropped + 1 };
  }
  if (state.filter.category && state.filter.category !== category) {
    return { ...state, dropped: state.dropped + 1 };
  }
  if (state.filter.docId && data?.docId !== state.filter.docId) {
    return { ...state, dropped: state.dropped + 1 };
  }
  const event: SyncEvent = { id: state.nextId, timestamp: Date.now(), level, category, message, docId: data?.docId, deviceId: data?.deviceId, data: data?.extra };
  return { ...state, events: [...state.events, event].slice(-2000), nextId: state.nextId + 1, totalLogged: state.totalLogged + 1 };
}

function shouldLogLevel(min: SyncEventLevel, current: SyncEventLevel): boolean {
  const order: SyncEventLevel[] = ['debug', 'info', 'warn', 'error'];
  return order.indexOf(current) >= order.indexOf(min);
}

export function setSyncLogLevelFilter(state: SyncEventLogState, level: SyncEventLevel): SyncEventLogState {
  return { ...state, filter: { ...state.filter, level } };
}

export function setSyncLogCategoryFilter(state: SyncEventLogState, category: string): SyncEventLogState {
  return { ...state, filter: { ...state.filter, category } };
}

export function setSyncLogDocFilter(state: SyncEventLogState, docId: string): SyncEventLogState {
  return { ...state, filter: { ...state.filter, docId } };
}

export function clearSyncLogFilter(state: SyncEventLogState): SyncEventLogState {
  return { ...state, filter: {} };
}

export function getSyncEventsByLevel(state: SyncEventLogState, level: SyncEventLevel): SyncEvent[] {
  return state.events.filter(e => e.level === level);
}

export function getSyncEventsByCategory(state: SyncEventLogState, category: string): SyncEvent[] {
  return state.events.filter(e => e.category === category);
}

export function getRecentSyncEvents(state: SyncEventLogState, count: number = 10): SyncEvent[] {
  return state.events.slice(-count);
}

export function getSyncEventLogReport(state: SyncEventLogState): { total: number; dropped: number; byLevel: Record<string, number> } {
  const byLevel: Record<string, number> = {};
  for (const e of state.events) byLevel[e.level] = (byLevel[e.level] || 0) + 1;
  return { total: state.totalLogged, dropped: state.dropped, byLevel };
}

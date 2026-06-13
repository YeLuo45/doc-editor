/**
 * V171 MindEventLog - Direction A Writing Mind (Iter 17/30)
 * ruflo: writing events log (append-only event stream)
 */
export type EventLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggedEvent {
  id: number;
  level: EventLevel;
  category: string;
  message: string;
  timestamp: number;
  data?: any;
}

export interface EventLogState {
  events: LoggedEvent[];
  nextId: number;
  filter: { level?: EventLevel; category?: string };
  totalLogged: number;
  droppedCount: number;
}

export function createEventLog(): EventLogState {
  return { events: [], nextId: 1, filter: {}, totalLogged: 0, droppedCount: 0 };
}

export function logEvent(state: EventLogState, level: EventLevel, category: string, message: string, data?: any): EventLogState {
  if (state.filter.level && !shouldLogLevel(state.filter.level, level)) {
    return { ...state, droppedCount: state.droppedCount + 1 };
  }
  if (state.filter.category && state.filter.category !== category) {
    return { ...state, droppedCount: state.droppedCount + 1 };
  }
  const event: LoggedEvent = { id: state.nextId, level, category, message, timestamp: Date.now(), data };
  return { ...state, events: [...state.events, event].slice(-1000), nextId: state.nextId + 1, totalLogged: state.totalLogged + 1 };
}

function shouldLogLevel(min: EventLevel, current: EventLevel): boolean {
  const order: EventLevel[] = ['debug', 'info', 'warn', 'error'];
  return order.indexOf(current) >= order.indexOf(min);
}

export function logDebug(state: EventLogState, category: string, message: string, data?: any): EventLogState {
  return logEvent(state, 'debug', category, message, data);
}
export function logInfo(state: EventLogState, category: string, message: string, data?: any): EventLogState {
  return logEvent(state, 'info', category, message, data);
}
export function logWarn(state: EventLogState, category: string, message: string, data?: any): EventLogState {
  return logEvent(state, 'warn', category, message, data);
}
export function logError(state: EventLogState, category: string, message: string, data?: any): EventLogState {
  return logEvent(state, 'error', category, message, data);
}

export function setLevelFilter(state: EventLogState, level: EventLevel): EventLogState {
  return { ...state, filter: { ...state.filter, level } };
}

export function setCategoryFilter(state: EventLogState, category: string): EventLogState {
  return { ...state, filter: { ...state.filter, category } };
}

export function clearFilter(state: EventLogState): EventLogState {
  return { ...state, filter: {} };
}

export function getEventsByLevel(state: EventLogState, level: EventLevel): LoggedEvent[] {
  return state.events.filter(e => e.level === level);
}

export function getEventsByCategory(state: EventLogState, category: string): LoggedEvent[] {
  return state.events.filter(e => e.category === category);
}

export function getRecentEvents(state: EventLogState, count: number = 10): LoggedEvent[] {
  return state.events.slice(-count);
}

export function getLogReport(state: EventLogState): { total: number; dropped: number; byLevel: Record<string, number>; byCategory: Record<string, number> } {
  const byLevel: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const e of state.events) {
    byLevel[e.level] = (byLevel[e.level] || 0) + 1;
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  }
  return { total: state.totalLogged, dropped: state.droppedCount, byLevel, byCategory };
}

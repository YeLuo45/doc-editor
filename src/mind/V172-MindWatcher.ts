/**
 * V172 MindWatcher - Direction A Writing Mind (Iter 18/30)
 * ruflo: stuck/abandon detection (idle threshold, abandonment alert)
 */
export type WatcherAlert = 'idle' | 'stuck' | 'abandoned' | 'rapid_change';

export interface WatchEvent {
  type: 'edit' | 'cursor' | 'selection' | 'save' | 'pause';
  timestamp: number;
  payload?: any;
}

export interface WatcherAlertRecord {
  alert: WatcherAlert;
  timestamp: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface WatcherState {
  events: WatchEvent[];
  alerts: WatcherAlertRecord[];
  idleThresholdMs: number;
  stuckThresholdMs: number;
  abandonThresholdMs: number;
  rapidChangeThreshold: number;
  rapidChangeWindowMs: number;
}

export function createWatcherState(): WatcherState {
  return {
    events: [],
    alerts: [],
    idleThresholdMs: 30000,        // 30s
    stuckThresholdMs: 300000,      // 5min
    abandonThresholdMs: 1800000,   // 30min
    rapidChangeThreshold: 10,
    rapidChangeWindowMs: 5000,
  };
}

export function recordWatchEvent(state: WatcherState, event: WatchEvent): WatcherState {
  const events = [...state.events, event].slice(-200);
  return { ...state, events };
}

export function analyzeWatcher(state: WatcherState, now: number = Date.now()): WatcherState {
  if (state.events.length === 0) return state;
  const last = state.events[state.events.length - 1];
  const idleTime = now - last.timestamp;
  const newAlerts: WatcherAlertRecord[] = [];
  if (idleTime > state.abandonThresholdMs) {
    newAlerts.push({ alert: 'abandoned', timestamp: now, message: 'User may have abandoned document', severity: 'high' });
  } else if (idleTime > state.stuckThresholdMs) {
    newAlerts.push({ alert: 'stuck', timestamp: now, message: 'User may be stuck', severity: 'medium' });
  } else if (idleTime > state.idleThresholdMs) {
    newAlerts.push({ alert: 'idle', timestamp: now, message: 'User is idle', severity: 'low' });
  }
  // Check for rapid changes in window
  const windowStart = now - state.rapidChangeWindowMs;
  const recentEdits = state.events.filter(e => e.type === 'edit' && e.timestamp >= windowStart);
  if (recentEdits.length >= state.rapidChangeThreshold) {
    newAlerts.push({ alert: 'rapid_change', timestamp: now, message: 'Rapid changes detected', severity: 'medium' });
  }
  return { ...state, alerts: [...state.alerts, ...newAlerts].slice(-100) };
}

export function getAlertsByType(state: WatcherState, alert: WatcherAlert): WatcherAlertRecord[] {
  return state.alerts.filter(a => a.alert === alert);
}

export function getLastAlert(state: WatcherState): WatcherAlertRecord | undefined {
  return state.alerts[state.alerts.length - 1];
}

export function clearAlerts(state: WatcherState): WatcherState {
  return { ...state, alerts: [] };
}

export function setThresholds(state: WatcherState, idle: number, stuck: number, abandon: number): WatcherState {
  return { ...state, idleThresholdMs: idle, stuckThresholdMs: stuck, abandonThresholdMs: abandon };
}

export function getWatcherReport(state: WatcherState): { totalEvents: number; totalAlerts: number; byAlert: Record<string, number>; lastEventAt: number } {
  const byAlert: Record<string, number> = {};
  for (const a of state.alerts) byAlert[a.alert] = (byAlert[a.alert] || 0) + 1;
  return {
    totalEvents: state.events.length,
    totalAlerts: state.alerts.length,
    byAlert,
    lastEventAt: state.events.length > 0 ? state.events[state.events.length - 1].timestamp : 0,
  };
}

/**
 * V232 SyncWatcher - Direction C Doc Federation (Iter 18/30)
 * ruflo: Detect stuck/slow sync operations
 */
export type SyncAlert = 'stuck' | 'slow' | 'idle' | 'overloaded';

export interface SyncEvent {
  type: 'sync_start' | 'sync_end' | 'sync_progress' | 'error';
  timestamp: number;
  docId: string;
  duration?: number;
}

export interface SyncAlertRecord {
  alert: SyncAlert;
  docId: string;
  timestamp: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SyncWatcherState {
  events: SyncEvent[];
  alerts: SyncAlertRecord[];
  stuckThresholdMs: number;
  slowThresholdMs: number;
  idleThresholdMs: number;
}

export function createSyncWatcherState(): SyncWatcherState {
  return { events: [], alerts: [], stuckThresholdMs: 60000, slowThresholdMs: 10000, idleThresholdMs: 30000 };
}

export function recordSyncEvent(state: SyncWatcherState, event: SyncEvent): SyncWatcherState {
  return { ...state, events: [...state.events, event].slice(-500) };
}

export function analyzeSyncWatcher(state: SyncWatcherState, now: number = Date.now()): SyncWatcherState {
  const newAlerts: SyncAlertRecord[] = [];
  // Group events by docId
  const byDoc = new Map<string, SyncEvent[]>();
  for (const e of state.events) {
    const arr = byDoc.get(e.docId) || [];
    byDoc.set(e.docId, [...arr, e]);
  }
  for (const [docId, events] of byDoc.entries()) {
    const last = events[events.length - 1];
    if (last.type === 'sync_start') {
      const idle = now - last.timestamp;
      if (idle > state.stuckThresholdMs) {
        newAlerts.push({ alert: 'stuck', docId, timestamp: now, message: `Sync stuck for ${Math.round(idle / 1000)}s`, severity: 'high' });
      } else if (idle > state.slowThresholdMs) {
        newAlerts.push({ alert: 'slow', docId, timestamp: now, message: `Sync slow (${Math.round(idle / 1000)}s)`, severity: 'medium' });
      }
    }
    const lastEvent = events[events.length - 1];
    const sinceLast = now - lastEvent.timestamp;
    if (sinceLast > state.idleThresholdMs) {
      newAlerts.push({ alert: 'idle', docId, timestamp: now, message: 'Sync idle', severity: 'low' });
    }
  }
  return { ...state, alerts: [...state.alerts, ...newAlerts].slice(-100) };
}

export function getSyncAlertsByType(state: SyncWatcherState, alert: SyncAlert): SyncAlertRecord[] {
  return state.alerts.filter(a => a.alert === alert);
}

export function getSyncAlertsForDoc(state: SyncWatcherState, docId: string): SyncAlertRecord[] {
  return state.alerts.filter(a => a.docId === docId);
}

export function clearSyncAlerts(state: SyncWatcherState): SyncWatcherState {
  return { ...state, alerts: [] };
}

export function setSyncThresholds(state: SyncWatcherState, stuck: number, slow: number, idle: number): SyncWatcherState {
  return { ...state, stuckThresholdMs: stuck, slowThresholdMs: slow, idleThresholdMs: idle };
}

export function getSyncWatcherReport(state: SyncWatcherState): { events: number; alerts: number; byAlert: Record<string, number> } {
  const byAlert: Record<string, number> = {};
  for (const a of state.alerts) byAlert[a.alert] = (byAlert[a.alert] || 0) + 1;
  return { events: state.events.length, alerts: state.alerts.length, byAlert };
}

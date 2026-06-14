/**
 * V261 PerfAudit - Direction D Perf Compression (Iter 17/30)
 * ruflo: Audit perf-critical changes with before/after metrics
 */
export type AuditType = 'config_change' | 'optimization_applied' | 'regression_detected' | 'recovered';

export interface PerfAuditEntry {
  id: number;
  timestamp: number;
  type: AuditType;
  component: string;
  beforeMetrics: Record<string, number>;
  afterMetrics: Record<string, number>;
  delta: Record<string, number>;
  approvedBy?: string;
  reason: string;
}

export interface PerfAuditState {
  entries: PerfAuditEntry[];
  nextId: number;
  totalEntries: number;
  regressions: number;
  recoveries: number;
}

export function createPerfAuditState(): PerfAuditState {
  return { entries: [], nextId: 1, totalEntries: 0, regressions: 0, recoveries: 0 };
}

export function recordAudit(state: PerfAuditState, type: AuditType, component: string, beforeMetrics: Record<string, number>, afterMetrics: Record<string, number>, reason: string, approvedBy?: string): PerfAuditState {
  const delta: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(beforeMetrics), ...Object.keys(afterMetrics)]);
  for (const key of allKeys) {
    delta[key] = (afterMetrics[key] || 0) - (beforeMetrics[key] || 0);
  }
  const entry: PerfAuditEntry = { id: state.nextId, timestamp: Date.now(), type, component, beforeMetrics, afterMetrics, delta, approvedBy, reason };
  let regressions = state.regressions;
  let recoveries = state.recoveries;
  if (type === 'regression_detected') regressions++;
  if (type === 'recovered') recoveries++;
  return { ...state, entries: [...state.entries, entry].slice(-500), nextId: state.nextId + 1, totalEntries: state.totalEntries + 1, regressions, recoveries };
}

export function getAuditsByType(state: PerfAuditState, type: AuditType): PerfAuditEntry[] {
  return state.entries.filter(e => e.type === type);
}

export function getAuditsByComponent(state: PerfAuditState, component: string): PerfAuditEntry[] {
  return state.entries.filter(e => e.component === component);
}

export function getRecentAudits(state: PerfAuditState, count: number = 10): PerfAuditEntry[] {
  return state.entries.slice(-count);
}

export function getRegressions(state: PerfAuditState): PerfAuditEntry[] {
  return getAuditsByType(state, 'regression_detected');
}

export function clearAudits(state: PerfAuditState): PerfAuditState {
  return { ...state, entries: [], totalEntries: 0, regressions: 0, recoveries: 0 };
}

export function getPerfAuditReport(state: PerfAuditState): { total: number; regressions: number; recoveries: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {};
  for (const e of state.entries) byType[e.type] = (byType[e.type] || 0) + 1;
  return { total: state.totalEntries, regressions: state.regressions, recoveries: state.recoveries, byType };
}

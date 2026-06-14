/**
 * V252 PerfOverlay - Direction D Perf Compression (Iter 8/30)
 * thunderbolt: Dev overlay: FPS / memory / long task / AI trace
 */
export interface PerfMetric {
  name: string;          // fps / memory / longTask / ai
  value: number;
  unit: string;
  timestamp: number;
  threshold?: number;     // warning if exceeded
  severity: 'ok' | 'warn' | 'crit';
}

export interface OverlayState {
  metrics: MetricBuffer[];
  enabled: boolean;
  totalMetrics: number;
  warningCount: number;
  criticalCount: number;
}

export interface MetricBuffer {
  name: string;
  recent: PerfMetric[];
}

export function createOverlayState(): OverlayState {
  return { metrics: [], enabled: false, totalMetrics: 0, warningCount: 0, criticalCount: 0 };
}

export function setOverlayEnabled(state: OverlayState, enabled: boolean): OverlayState {
  return { ...state, enabled };
}

export function recordMetric(state: OverlayState, name: string, value: number, unit: string, threshold?: number): OverlayState {
  const severity: 'ok' | 'warn' | 'crit' = threshold === undefined ? 'ok' : value > threshold * 2 ? 'crit' : value > threshold ? 'warn' : 'ok';
  const metric: PerfMetric = { name, value, unit, timestamp: Date.now(), threshold, severity };
  const existing = state.metrics.find(m => m.name === name);
  if (existing) {
    return { ...state, metrics: state.metrics.map(m => m.name === name ? { ...m, recent: [...m.recent, metric].slice(-100) } : m), totalMetrics: state.totalMetrics + 1, warningCount: state.warningCount + (severity === 'warn' ? 1 : 0), criticalCount: state.criticalCount + (severity === 'crit' ? 1 : 0) };
  }
  return { ...state, metrics: [...state.metrics, { name, recent: [metric] }], totalMetrics: state.totalMetrics + 1, warningCount: state.warningCount + (severity === 'warn' ? 1 : 0), criticalCount: state.criticalCount + (severity === 'crit' ? 1 : 0) };
}

export function getMetricBuffer(state: OverlayState, name: string): MetricBuffer | undefined {
  return state.metrics.find(m => m.name === name);
}

export function getLatestMetric(state: OverlayState, name: string): PerfMetric | undefined {
  const buf = state.metrics.find(m => m.name === name);
  return buf?.recent[buf.recent.length - 1];
}

export function getCriticalMetrics(state: OverlayState): PerfMetric[] {
  const result: PerfMetric[] = [];
  for (const buf of state.metrics) {
    for (const m of buf.recent) {
      if (m.severity === 'crit') result.push(m);
    }
  }
  return result;
}

export function clearOverlayMetrics(state: OverlayState): OverlayState {
  return { ...state, metrics: [], totalMetrics: 0, warningCount: 0, criticalCount: 0 };
}

export function getOverlayReport(state: OverlayState): { totalMetrics: number; enabled: boolean; warnings: number; critical: number; byMetric: Record<string, number> } {
  const byMetric: Record<string, number> = {};
  for (const m of state.metrics) byMetric[m.name] = m.recent.length;
  return { totalMetrics: state.totalMetrics, enabled: state.enabled, warnings: state.warningCount, critical: state.criticalCount, byMetric };
}

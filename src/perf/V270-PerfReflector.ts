/**
 * V270 PerfReflector - Direction D Perf Compression (Iter 26/30)
 * generic-agent: Periodic reflection on perf trends
 */
export type ReflectorWindow = 'hourly' | 'daily' | 'weekly';

export interface PerfReflection {
  id: string;
  window: ReflectorWindow;
  timestamp: number;
  insights: string[];
  metrics: Record<string, number>;
  recommendations: string[];
}

export interface PerfReflectorState {
  reflections: PerfReflection[];
  metrics: Record<string, number[]>;
  nextId: number;
}

export function createPerfReflectorState(): PerfReflectorState {
  return { reflections: [], metrics: {}, nextId: 1 };
}

export function recordPerfMetric(state: PerfReflectorState, name: string, value: number): PerfReflectorState {
  const metrics = { ...state.metrics };
  metrics[name] = [...(metrics[name] || []), value].slice(-1000);
  return { ...state, metrics };
}

export function getPerfMetricStats(state: PerfReflectorState, name: string): { avg: number; min: number; max: number; trend: 'rising' | 'falling' | 'stable' } {
  const values = state.metrics[name] || [];
  if (values.length === 0) return { avg: 0, min: 0, max: 0, trend: 'stable' };
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (values.length >= 5) {
    const recent = values.slice(-5);
    const diff = recent[recent.length - 1] - recent[0];
    const threshold = Math.max(0.01, Math.abs(recent[0]) * 0.05);
    if (diff > threshold) trend = 'rising';
    else if (diff < -threshold) trend = 'falling';
  }
  return { avg, min, max, trend };
}

export function generatePerfInsights(state: PerfReflectorState): string[] {
  const insights: string[] = [];
  for (const name of Object.keys(state.metrics)) {
    const stats = getPerfMetricStats(state, name);
    if (stats.trend === 'rising') insights.push(`${name} is rising (avg ${stats.avg.toFixed(2)})`);
    if (stats.trend === 'falling') insights.push(`${name} is falling (avg ${stats.avg.toFixed(2)})`);
  }
  return insights;
}

export function generatePerfRecs(state: PerfReflectorState): string[] {
  const recs: string[] = [];
  for (const name of Object.keys(state.metrics)) {
    const stats = getPerfMetricStats(state, name);
    if (stats.trend === 'rising' && (name.includes('latency') || name.includes('time'))) recs.push(`Address increasing ${name}`);
  }
  if (recs.length === 0) recs.push('Perf is stable');
  return recs;
}

export function createReflection(state: PerfReflectorState, window: ReflectorWindow): PerfReflectorState {
  const insights = generatePerfInsights(state);
  const recommendations = generatePerfRecs(state);
  const metrics: Record<string, number> = {};
  for (const name of Object.keys(state.metrics)) {
    metrics[name] = getPerfMetricStats(state, name).avg;
  }
  const reflection: PerfReflection = { id: `pref-${state.nextId}`, window, timestamp: Date.now(), insights, metrics, recommendations };
  return { ...state, reflections: [...state.reflections, reflection].slice(-50), nextId: state.nextId + 1 };
}

export function getReflectionsByWindow(state: PerfReflectorState, window: ReflectorWindow): PerfReflection[] {
  return state.reflections.filter(r => r.window === window);
}

export function clearReflections(state: PerfReflectorState): PerfReflectorState {
  return { ...state, reflections: [] };
}

export function getPerfReflectorReport(state: PerfReflectorState): { total: number; metricsTracked: number; recentInsights: number } {
  const last = state.reflections[state.reflections.length - 1];
  return { total: state.reflections.length, metricsTracked: Object.keys(state.metrics).length, recentInsights: last?.insights.length || 0 };
}

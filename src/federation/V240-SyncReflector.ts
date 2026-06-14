/**
 * V240 SyncReflector - Direction C Doc Federation (Iter 26/30)
 * generic-agent: Periodic reflection on sync patterns
 */
export type ReflectorPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface SyncReflection {
  id: string;
  period: ReflectorPeriod;
  timestamp: number;
  insights: string[];
  metrics: Record<string, number>;
  recommendations: string[];
}

export interface SyncReflectorState {
  reflections: SyncReflection[];
  metrics: Record<string, number[]>;
  nextId: number;
}

export function createSyncReflectorState(): SyncReflectorState {
  return { reflections: [], metrics: {}, nextId: 1 };
}

export function recordSyncMetric(state: SyncReflectorState, name: string, value: number): SyncReflectorState {
  const metrics = { ...state.metrics };
  metrics[name] = [...(metrics[name] || []), value].slice(-1000);
  return { ...state, metrics };
}

export function getSyncMetricStats(state: SyncReflectorState, name: string): { avg: number; min: number; max: number; trend: 'rising' | 'falling' | 'stable' } {
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

export function generateSyncInsights(state: SyncReflectorState): string[] {
  const insights: string[] = [];
  for (const name of Object.keys(state.metrics)) {
    const stats = getSyncMetricStats(state, name);
    if (stats.trend === 'rising') insights.push(`${name} is rising (avg ${stats.avg.toFixed(2)})`);
    if (stats.trend === 'falling') insights.push(`${name} is falling (avg ${stats.avg.toFixed(2)})`);
    if (stats.max - stats.min > stats.avg * 0.5) insights.push(`${name} shows high variance`);
  }
  return insights;
}

export function generateSyncRecommendations(state: SyncReflectorState): string[] {
  const recs: string[] = [];
  for (const name of Object.keys(state.metrics)) {
    const stats = getSyncMetricStats(state, name);
    if (stats.trend === 'falling' && name.includes('success')) recs.push(`Address declining ${name}`);
    if (stats.avg < 0.3) recs.push(`Improve ${name}`);
  }
  if (recs.length === 0) recs.push('Sync is performing well');
  return recs;
}

export function createSyncReflection(state: SyncReflectorState, period: ReflectorPeriod): SyncReflectorState {
  const insights = generateSyncInsights(state);
  const recommendations = generateSyncRecommendations(state);
  const metrics: Record<string, number> = {};
  for (const name of Object.keys(state.metrics)) {
    metrics[name] = getSyncMetricStats(state, name).avg;
  }
  const reflection: SyncReflection = { id: `ref-${state.nextId}`, period, timestamp: Date.now(), insights, metrics, recommendations };
  return { ...state, reflections: [...state.reflections, reflection].slice(-50), nextId: state.nextId + 1 };
}

export function getSyncReflectionsByPeriod(state: SyncReflectorState, period: ReflectorPeriod): SyncReflection[] {
  return state.reflections.filter(r => r.period === period);
}

export function getLastSyncReflection(state: SyncReflectorState): SyncReflection | undefined {
  return state.reflections[state.reflections.length - 1];
}

export function clearSyncReflections(state: SyncReflectorState): SyncReflectorState {
  return { ...state, reflections: [] };
}

export function getSyncReflectorReport(state: SyncReflectorState): { total: number; metricsTracked: number; recentInsights: number } {
  const last = getLastSyncReflection(state);
  return { total: state.reflections.length, metricsTracked: Object.keys(state.metrics).length, recentInsights: last?.insights.length || 0 };
}

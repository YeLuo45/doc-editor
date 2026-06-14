/**
 * V300 TrustReflector - Direction E Trust Verification (Iter 26/30)
 * generic-agent: Periodic reflection on trust trends
 */
export type TrustReflectionWindow = 'hourly' | 'daily' | 'weekly';

export interface TrustReflection {
  id: string;
  window: TrustReflectionWindow;
  timestamp: number;
  insights: string[];
  metrics: Record<string, number>;
  recommendations: string[];
}

export interface TrustReflectorState {
  reflections: TrustReflection[];
  metrics: Record<string, number[]>;
  nextId: number;
}

export function createTrustReflectorState(): TrustReflectorState {
  return { reflections: [], metrics: {}, nextId: 1 };
}

export function recordTrustMetric(state: TrustReflectorState, name: string, value: number): TrustReflectorState {
  const metrics = { ...state.metrics };
  metrics[name] = [...(metrics[name] || []), value].slice(-1000);
  return { ...state, metrics };
}

export function getTrustMetricStats(state: TrustReflectorState, name: string): { avg: number; min: number; max: number; trend: 'rising' | 'falling' | 'stable' } {
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

export function generateTrustInsights(state: TrustReflectorState): string[] {
  const insights: string[] = [];
  for (const name of Object.keys(state.metrics)) {
    const stats = getTrustMetricStats(state, name);
    if (stats.trend === 'rising') insights.push(`${name} is rising (avg ${stats.avg.toFixed(2)})`);
    if (stats.trend === 'falling') insights.push(`${name} is falling (avg ${stats.avg.toFixed(2)})`);
  }
  return insights;
}

export function generateTrustRecs(state: TrustReflectorState): string[] {
  const recs: string[] = [];
  for (const name of Object.keys(state.metrics)) {
    const stats = getTrustMetricStats(state, name);
    if (stats.trend === 'falling' && (name.includes('score') || name.includes('trust'))) recs.push(`Address declining ${name}`);
  }
  if (recs.length === 0) recs.push('Trust metrics stable');
  return recs;
}

export function createTrustReflection(state: TrustReflectorState, window: TrustReflectionWindow): TrustReflectorState {
  const insights = generateTrustInsights(state);
  const recommendations = generateTrustRecs(state);
  const metrics: Record<string, number> = {};
  for (const name of Object.keys(state.metrics)) {
    metrics[name] = getTrustMetricStats(state, name).avg;
  }
  const reflection: TrustReflection = { id: `tref-${state.nextId}`, window, timestamp: Date.now(), insights, metrics, recommendations };
  return { ...state, reflections: [...state.reflections, reflection].slice(-50), nextId: state.nextId + 1 };
}

export function getReflectionsByWindow(state: TrustReflectorState, window: TrustReflectionWindow): TrustReflection[] {
  return state.reflections.filter(r => r.window === window);
}

export function clearTrustReflections(state: TrustReflectorState): TrustReflectorState {
  return { ...state, reflections: [] };
}

export function getTrustReflectorReport(state: TrustReflectorState): { total: number; metricsTracked: number; recentInsights: number } {
  const last = state.reflections[state.reflections.length - 1];
  return { total: state.reflections.length, metricsTracked: Object.keys(state.metrics).length, recentInsights: last?.insights.length || 0 };
}

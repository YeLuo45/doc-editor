/**
 * V210 AgentReflector - Direction B Agent Forge (Iter 26/30)
 * generic-agent: Periodic reflection on agent performance
 */
export type ReflectionPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface Reflection {
  id: string;
  period: ReflectionPeriod;
  timestamp: number;
  agentId: string | null;     // null = global
  insights: string[];
  metrics: Record<string, number>;
  recommendations: string[];
}

export interface ReflectorState {
  reflections: Reflection[];
  metrics: Record<string, number[]>;
  nextId: number;
}

export function createReflectorState(): ReflectorState {
  return { reflections: [], metrics: {}, nextId: 1 };
}

export function recordMetric(state: ReflectorState, name: string, value: number): ReflectorState {
  const metrics = { ...state.metrics };
  metrics[name] = [...(metrics[name] || []), value].slice(-1000);
  return { ...state, metrics };
}

export function getMetricStats(state: ReflectorState, name: string): { avg: number; min: number; max: number; trend: 'rising' | 'falling' | 'stable' } {
  const values = state.metrics[name] || [];
  if (values.length === 0) return { avg: 0, min: 0, max: 0, trend: 'stable' };
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (values.length >= 5) {
    const recent = values.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const diff = last - first;
    const threshold = Math.max(0.01, Math.abs(first) * 0.05);
    if (diff > threshold) trend = 'rising';
    else if (diff < -threshold) trend = 'falling';
  }
  return { avg, min, max, trend };
}

export function generateInsights(state: ReflectorState): string[] {
  const insights: string[] = [];
  for (const name of Object.keys(state.metrics)) {
    const stats = getMetricStats(state, name);
    if (stats.trend === 'rising') insights.push(`${name} is trending upward (avg ${stats.avg.toFixed(3)})`);
    if (stats.trend === 'falling') insights.push(`${name} is trending downward (avg ${stats.avg.toFixed(3)})`);
    if (stats.max - stats.min > stats.avg * 0.5) insights.push(`${name} shows high variance`);
  }
  return insights;
}

export function generateRecommendations(state: ReflectorState): string[] {
  const recs: string[] = [];
  for (const name of Object.keys(state.metrics)) {
    const stats = getMetricStats(state, name);
    if (stats.trend === 'falling' && name.includes('success')) recs.push(`Address declining ${name}`);
    if (stats.avg < 0.3) recs.push(`Improve ${name} which is below threshold`);
  }
  if (recs.length === 0) recs.push('Maintain current performance levels');
  return recs;
}

export function createReflection(state: ReflectorState, period: ReflectionPeriod, agentId: string | null = null): ReflectorState {
  const insights = generateInsights(state);
  const recommendations = generateRecommendations(state);
  const metrics: Record<string, number> = {};
  for (const name of Object.keys(state.metrics)) {
    metrics[name] = getMetricStats(state, name).avg;
  }
  const reflection: Reflection = { id: `ref-${state.nextId}`, period, timestamp: Date.now(), agentId, insights, metrics, recommendations };
  return { ...state, reflections: [...state.reflections, reflection].slice(-50), nextId: state.nextId + 1 };
}

export function getReflectionsByPeriod(state: ReflectorState, period: ReflectionPeriod): Reflection[] {
  return state.reflections.filter(r => r.period === period);
}

export function getLastReflection(state: ReflectorState): Reflection | undefined {
  return state.reflections[state.reflections.length - 1];
}

export function clearReflections(state: ReflectorState): ReflectorState {
  return { ...state, reflections: [] };
}

export function getReflectorReport(state: ReflectorState): { total: number; metricsTracked: number; recentInsights: number } {
  const last = getLastReflection(state);
  return { total: state.reflections.length, metricsTracked: Object.keys(state.metrics).length, recentInsights: last?.insights.length || 0 };
}

/**
 * V181 MindReflector - Direction A Writing Mind (Iter 27/30)
 * generic-agent: weekly/monthly reflection on writing patterns
 */
export type ReflectionPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Reflection {
  id: string;
  period: ReflectionPeriod;
  startTime: number;
  endTime: number;
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
  const list = metrics[name] || [];
  metrics[name] = [...list, value].slice(-1000);
  return { ...state, metrics };
}

export function getMetricStats(state: ReflectorState, name: string): { count: number; avg: number; min: number; max: number; trend: 'rising' | 'falling' | 'stable' } {
  const values = state.metrics[name] || [];
  if (values.length === 0) return { count: 0, avg: 0, min: 0, max: 0, trend: 'stable' };
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (values.length >= 2) {
    const recent = values.slice(-10);
    const diff = recent[recent.length - 1] - recent[0];
    const threshold = Math.max(1, Math.abs(avg) * 0.05);
    if (diff > threshold) trend = 'rising';
    else if (diff < -threshold) trend = 'falling';
  }
  return { count: values.length, avg, min, max, trend };
}

export function generateInsights(state: ReflectorState, period: ReflectionPeriod): string[] {
  const insights: string[] = [];
  for (const [name, values] of Object.entries(state.metrics)) {
    if (values.length < 3) continue;
    const stats = getMetricStats(state, name);
    if (stats.trend === 'rising') insights.push(`${name} is trending upward (avg: ${stats.avg.toFixed(2)})`);
    else if (stats.trend === 'falling') insights.push(`${name} is trending downward (avg: ${stats.avg.toFixed(2)})`);
    if (stats.max - stats.min > stats.avg * 0.5) insights.push(`${name} shows high variance (${stats.min.toFixed(2)} to ${stats.max.toFixed(2)})`);
  }
  if (insights.length === 0) insights.push(`Not enough data for ${period} reflection`);
  return insights;
}

export function generateRecommendations(state: ReflectorState): string[] {
  const recs: string[] = [];
  for (const [name, values] of Object.entries(state.metrics)) {
    if (values.length < 3) continue;
    const stats = getMetricStats(state, name);
    if (stats.trend === 'falling') recs.push(`Consider strategies to improve ${name}`);
    if (stats.avg < 0.3 && name.includes('accept')) recs.push(`Low ${name} rate — review suggestions more carefully`);
  }
  if (recs.length === 0) recs.push('Keep going! Patterns look healthy.');
  return recs;
}

export function createReflection(state: ReflectorState, period: ReflectionPeriod, startTime: number, endTime: number): ReflectorState {
  const insights = generateInsights(state, period);
  const recommendations = generateRecommendations(state);
  const metrics: Record<string, number> = {};
  for (const [name, values] of Object.entries(state.metrics)) {
    if (values.length > 0) {
      const stats = getMetricStats(state, name);
      metrics[name] = stats.avg;
    }
  }
  const reflection: Reflection = { id: `ref-${state.nextId}`, period, startTime, endTime, insights, metrics, recommendations };
  return { ...state, reflections: [...state.reflections, reflection].slice(-50), nextId: state.nextId + 1 };
}

export function getReflectionsByPeriod(state: ReflectorState, period: ReflectionPeriod): Reflection[] {
  return state.reflections.filter(r => r.period === period);
}

export function getLastReflection(state: ReflectorState): Reflection | undefined {
  return state.reflections[state.reflections.length - 1];
}

export function getReflectorReport(state: ReflectorState): { total: number; metrics: number; reflections: number; lastInsight?: string } {
  return {
    total: state.reflections.length,
    metrics: Object.keys(state.metrics).length,
    reflections: state.reflections.length,
    lastInsight: state.reflections[state.reflections.length - 1]?.insights[0],
  };
}

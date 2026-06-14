/**
 * V254 PerfAggregator - Direction D Perf Compression (Iter 10/30)
 * nanobot: Aggregate perf metrics (count, p50, p95, mean)
 */
export interface MetricSample {
  value: number;
  timestamp: number;
}

export interface AggregatedStats {
  name: string;
  count: number;
  mean: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface AggregatorState {
  samples: Map<string, MetricSample[]>;
  nextId: number;
  totalSamples: number;
}

export function createAggregatorState(): AggregatorState {
  return { samples: new Map(), nextId: 1, totalSamples: 0 };
}

export function addSample(state: AggregatorState, name: string, value: number): AggregatorState {
  const sample: MetricSample = { value, timestamp: Date.now() };
  const existing = state.samples.get(name) || [];
  return { ...state, samples: new Map(state.samples).set(name, [...existing, sample].slice(-1000)), nextId: state.nextId + 1, totalSamples: state.totalSamples + 1 };
}

export function getAggregatedStats(state: AggregatorState, name: string): AggregatedStats {
  const samples = state.samples.get(name) || [];
  if (samples.length === 0) {
    return { name, count: 0, mean: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, trend: 'stable' };
  }
  const values = samples.map(s => s.value);
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p50 = sorted[Math.max(0, Math.floor((sorted.length - 1) * 0.5))];
  const p95 = sorted[Math.max(0, Math.floor((sorted.length - 1) * 0.95))];
  const p99 = sorted[Math.max(0, Math.floor((sorted.length - 1) * 0.99))];
  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  if (values.length >= 5) {
    const recent = values.slice(-5);
    const diff = recent[recent.length - 1] - recent[0];
    const threshold = Math.max(0.01, Math.abs(recent[0]) * 0.05);
    if (diff > threshold) trend = 'rising';
    else if (diff < -threshold) trend = 'falling';
  }
  return { name, count: samples.length, mean, min, max, p50, p95, p99, trend };
}

export function getAllStats(state: AggregatorState): AggregatedStats[] {
  return Array.from(state.samples.keys()).map(name => getAggregatedStats(state, name));
}

export function clearAggregatorSamples(state: AggregatorState, name?: string): AggregatorState {
  if (name) {
    const samples = new Map(state.samples);
    samples.delete(name);
    return { ...state, samples };
  }
  return { ...state, samples: new Map() };
}

export function getAggregatorReport(state: AggregatorState): { totalSamples: number; metricsTracked: number; avgTrend: string } {
  const trends = { rising: 0, falling: 0, stable: 0 };
  for (const name of state.samples.keys()) {
    const stats = getAggregatedStats(state, name);
    trends[stats.trend]++;
  }
  const dominantTrend = Object.entries(trends).sort((a, b) => b[1] - a[1])[0];
  return { totalSamples: state.totalSamples, metricsTracked: state.samples.size, avgTrend: dominantTrend ? dominantTrend[0] : 'stable' };
}

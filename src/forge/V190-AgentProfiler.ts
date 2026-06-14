/**
 * V190 AgentProfiler - Direction B Agent Forge (Iter 6/30)
 * thunderbolt: Profile agent performance (latency/tokens/success rate)
 */
export interface ProfileSample {
  agentId: string;
  timestamp: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
}

export interface ProfileStats {
  agentId: string;
  sampleCount: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  successRate: number;
  totalCost: number;
}

export interface ProfilerState {
  samples: ProfileSample[];
  nextId: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}

let counter = 0;
function nextId(): string { return `prof-${++counter}`; }

export function createProfilerState(): ProfilerState {
  return { samples: [], nextId: 1, costPerInputToken: 0.000001, costPerOutputToken: 0.000002 };
}

export function recordSample(state: ProfilerState, agentId: string, latencyMs: number, inputTokens: number, outputTokens: number, success: boolean): ProfilerState {
  const sample: ProfileSample = { agentId, timestamp: Date.now(), latencyMs, inputTokens, outputTokens, success };
  return { ...state, samples: [...state.samples, sample].slice(-1000), nextId: state.nextId + 1 };
}

export function getStatsForAgent(state: ProfilerState, agentId: string): ProfileStats {
  const agentSamples = state.samples.filter(s => s.agentId === agentId);
  if (agentSamples.length === 0) {
    return { agentId, sampleCount: 0, avgLatency: 0, p50Latency: 0, p95Latency: 0, avgInputTokens: 0, avgOutputTokens: 0, successRate: 0, totalCost: 0 };
  }
  const latencies = agentSamples.map(s => s.latencyMs).sort((a, b) => a - b);
  const p50 = latencies[Math.max(0, Math.floor((latencies.length - 1) * 0.5))];
  const p95 = latencies[Math.max(0, Math.floor((latencies.length - 1) * 0.95))];
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const avgInputTokens = agentSamples.reduce((a, b) => a + b.inputTokens, 0) / agentSamples.length;
  const avgOutputTokens = agentSamples.reduce((a, b) => a + b.outputTokens, 0) / agentSamples.length;
  const successRate = agentSamples.filter(s => s.success).length / agentSamples.length;
  const totalCost = agentSamples.reduce((a, b) => a + b.inputTokens * state.costPerInputToken + b.outputTokens * state.costPerOutputToken, 0);
  return { agentId, sampleCount: agentSamples.length, avgLatency, p50Latency: p50, p95Latency: p95, avgInputTokens, avgOutputTokens, successRate, totalCost };
}

export function getAllAgentStats(state: ProfilerState): ProfileStats[] {
  const agentIds = Array.from(new Set(state.samples.map(s => s.agentId)));
  return agentIds.map(id => getStatsForAgent(state, id));
}

export function clearSamples(state: ProfilerState): ProfilerState {
  return { ...state, samples: [] };
}

export function setPricing(state: ProfilerState, inputCost: number, outputCost: number): ProfilerState {
  return { ...state, costPerInputToken: inputCost, costPerOutputToken: outputCost };
}

export function getProfilerReport(state: ProfilerState): { totalSamples: number; agents: number; avgSuccessRate: number; totalCost: number } {
  const stats = getAllAgentStats(state);
  return {
    totalSamples: state.samples.length,
    agents: stats.length,
    avgSuccessRate: stats.length > 0 ? stats.reduce((a, b) => a + b.successRate, 0) / stats.length : 0,
    totalCost: stats.reduce((a, b) => a + b.totalCost, 0),
  };
}

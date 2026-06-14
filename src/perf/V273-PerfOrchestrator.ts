/**
 * V273 PerfOrchestrator - Direction D Perf Compression (Iter 29/30)
 * generic-agent [ORCHESTRATOR 1]: integrate 28 perf engines + density/coherence/resonance
 */
export interface PerfEngineSnapshot {
  id: string;
  category: 'thunderbolt' | 'nanobot' | 'ruflo' | 'chatdev' | 'generic-agent';
  score: number;
  metric: number;
  active: boolean;
}

export interface PerfOrchestratorState {
  engines: Map<string, PerfEngineSnapshot>;
  density: number;
  coherence: number;
  resonance: number;
  totalEngines: number;
  activeEngines: number;
}

export function createPerfOrchestratorState(): PerfOrchestratorState {
  return { engines: new Map(), density: 0, coherence: 0, resonance: 0, totalEngines: 0, activeEngines: 0 };
}

export function registerPerfEngine(state: PerfOrchestratorState, snapshot: PerfEngineSnapshot): PerfOrchestratorState {
  const engines = new Map(state.engines);
  engines.set(snapshot.id, snapshot);
  return recompute({ ...state, engines, totalEngines: engines.size });
}

export function registerAllPerfEngines(state: PerfOrchestratorState, snapshots: PerfEngineSnapshot[]): PerfOrchestratorState {
  const engines = new Map<string, PerfEngineSnapshot>();
  for (const s of snapshots) engines.set(s.id, s);
  return recompute({ ...state, engines, totalEngines: engines.size });
}

export function updatePerfEngine(state: PerfOrchestratorState, id: string, score: number, metric: number): PerfOrchestratorState {
  const engines = new Map(state.engines);
  const existing = engines.get(id);
  if (!existing) return state;
  engines.set(id, { ...existing, score, metric, active: true });
  return recompute({ ...state, engines });
}

export function deactivatePerfEngine(state: PerfOrchestratorState, id: string): PerfOrchestratorState {
  const engines = new Map(state.engines);
  const existing = engines.get(id);
  if (!existing) return state;
  engines.set(id, { ...existing, active: false });
  return recompute({ ...state, engines });
}

function recompute(state: PerfOrchestratorState): PerfOrchestratorState {
  const snapshots = Array.from(state.engines.values());
  const active = snapshots.filter(s => s.active);
  if (snapshots.length === 0) return { ...state, density: 0, coherence: 0, resonance: 0, activeEngines: 0 };
  const mean = snapshots.reduce((a, b) => a + b.metric, 0) / snapshots.length;
  const stddev = Math.sqrt(snapshots.reduce((s, e) => s + Math.pow(e.metric - mean, 2), 0) / snapshots.length);
  const coherence = Math.max(0, 1 - stddev);
  const key = snapshots.filter(s => s.category === 'thunderbolt' || s.category === 'chatdev');
  const resonance = key.length > 0 ? key.reduce((a, b) => a + b.metric, 0) / key.length : 0;
  return { ...state, density: mean, coherence, resonance, activeEngines: active.length };
}

export function getPerfEngineSnapshot(state: PerfOrchestratorState, id: string): PerfEngineSnapshot | undefined {
  return state.engines.get(id);
}

export function getAllPerfSnapshots(state: PerfOrchestratorState): PerfEngineSnapshot[] {
  return Array.from(state.engines.values());
}

export function getPerfOrchestratorReport(state: PerfOrchestratorState): { total: number; active: number; density: number; coherence: number; resonance: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  for (const s of state.engines.values()) byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  return { total: state.totalEngines, active: state.activeEngines, density: state.density, coherence: state.coherence, resonance: state.resonance, byCategory };
}

// Predefined 28 engines
export const V245_V272_ENGINES: PerfEngineSnapshot[] = [
  // thunderbolt (8) V245-V252
  { id: 'V245', category: 'thunderbolt', score: 0.9, metric: 0.85, active: true },
  { id: 'V246', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true },
  { id: 'V247', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true },
  { id: 'V248', category: 'thunderbolt', score: 0.9, metric: 0.85, active: true },
  { id: 'V249', category: 'thunderbolt', score: 0.9, metric: 0.85, active: true },
  { id: 'V250', category: 'thunderbolt', score: 0.9, metric: 0.9, active: true },
  { id: 'V251', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true },
  { id: 'V252', category: 'thunderbolt', score: 0.9, metric: 0.85, active: true },
  // nanobot (7) V253-V259
  { id: 'V253', category: 'nanobot', score: 0.9, metric: 0.85, active: true },
  { id: 'V254', category: 'nanobot', score: 0.9, metric: 0.8, active: true },
  { id: 'V255', category: 'nanobot', score: 0.9, metric: 0.8, active: true },
  { id: 'V256', category: 'nanobot', score: 0.9, metric: 0.85, active: true },
  { id: 'V257', category: 'nanobot', score: 0.9, metric: 0.85, active: true },
  { id: 'V258', category: 'nanobot', score: 0.9, metric: 0.8, active: true },
  { id: 'V259', category: 'nanobot', score: 0.9, metric: 0.85, active: true },
  // ruflo (5) V260-V264
  { id: 'V260', category: 'ruflo', score: 0.9, metric: 0.85, active: true },
  { id: 'V261', category: 'ruflo', score: 0.9, metric: 0.8, active: true },
  { id: 'V262', category: 'ruflo', score: 0.9, metric: 0.8, active: true },
  { id: 'V263', category: 'ruflo', score: 0.9, metric: 0.8, active: true },
  { id: 'V264', category: 'ruflo', score: 0.9, metric: 0.85, active: true },
  // chatdev (4) V265-V268
  { id: 'V265', category: 'chatdev', score: 0.9, metric: 0.85, active: true },
  { id: 'V266', category: 'chatdev', score: 0.9, metric: 0.8, active: true },
  { id: 'V267', category: 'chatdev', score: 0.9, metric: 0.8, active: true },
  { id: 'V268', category: 'chatdev', score: 0.9, metric: 0.85, active: true },
  // generic-agent (4) V269-V272
  { id: 'V269', category: 'generic-agent', score: 0.9, metric: 0.8, active: true },
  { id: 'V270', category: 'generic-agent', score: 0.9, metric: 0.8, active: true },
  { id: 'V271', category: 'generic-agent', score: 0.9, metric: 0.75, active: true },
  { id: 'V272', category: 'generic-agent', score: 0.9, metric: 0.85, active: true },
];

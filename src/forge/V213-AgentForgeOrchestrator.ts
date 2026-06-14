/**
 * V213 AgentForgeOrchestrator - Direction B Agent Forge (Iter 29/30)
 * generic-agent [ORCHESTRATOR]: integrate 28 engines + density/coherence/resonance
 */
export interface AgentEngineSnapshot {
  id: string;
  category: 'thunderbolt' | 'nanobot' | 'ruflo' | 'chatdev' | 'generic-agent';
  score: number;
  metric: number;
  active: boolean;
}

export interface ForgeOrchestratorState {
  engines: Map<string, AgentEngineSnapshot>;
  density: number;
  coherence: number;
  resonance: number;
  totalEngines: number;
  activeEngines: number;
}

export function createForgeOrchestratorState(): ForgeOrchestratorState {
  return { engines: new Map(), density: 0, coherence: 0, resonance: 0, totalEngines: 0, activeEngines: 0 };
}

export function registerEngine(state: ForgeOrchestratorState, snapshot: AgentEngineSnapshot): ForgeOrchestratorState {
  const engines = new Map(state.engines);
  engines.set(snapshot.id, snapshot);
  return recompute({ ...state, engines, totalEngines: engines.size });
}

export function registerAllEngines(state: ForgeOrchestratorState, snapshots: AgentEngineSnapshot[]): ForgeOrchestratorState {
  const engines = new Map<string, AgentEngineSnapshot>();
  for (const s of snapshots) engines.set(s.id, s);
  return recompute({ ...state, engines, totalEngines: engines.size });
}

export function updateEngineMetric(state: ForgeOrchestratorState, id: string, score: number, metric: number): ForgeOrchestratorState {
  const engines = new Map(state.engines);
  const existing = engines.get(id);
  if (!existing) return state;
  engines.set(id, { ...existing, score, metric, active: true });
  return recompute({ ...state, engines });
}

export function deactivateEngine(state: ForgeOrchestratorState, id: string): ForgeOrchestratorState {
  const engines = new Map(state.engines);
  const existing = engines.get(id);
  if (!existing) return state;
  engines.set(id, { ...existing, active: false });
  return recompute({ ...state, engines });
}

function recompute(state: ForgeOrchestratorState): ForgeOrchestratorState {
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

export function getEngineSnapshot(state: ForgeOrchestratorState, id: string): AgentEngineSnapshot | undefined {
  return state.engines.get(id);
}

export function getAllSnapshots(state: ForgeOrchestratorState): AgentEngineSnapshot[] {
  return Array.from(state.engines.values());
}

export function getForgeOrchestratorReport(state: ForgeOrchestratorState): { total: number; active: number; density: number; coherence: number; resonance: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  for (const s of state.engines.values()) byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  return { total: state.totalEngines, active: state.activeEngines, density: state.density, coherence: state.coherence, resonance: state.resonance, byCategory };
}

// Predefined 28 engines for the AgentForgeOrchestrator (excludes V213 + V214)
export const V185_V212_ENGINES: AgentEngineSnapshot[] = [
  // thunderbolt (8) V185-V192
  { id: 'V185', category: 'thunderbolt', score: 0.9, metric: 0.85, active: true },
  { id: 'V186', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true },
  { id: 'V187', category: 'thunderbolt', score: 0.9, metric: 0.9, active: true },
  { id: 'V188', category: 'thunderbolt', score: 0.9, metric: 0.75, active: true },
  { id: 'V189', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true },
  { id: 'V190', category: 'thunderbolt', score: 0.9, metric: 0.85, active: true },
  { id: 'V191', category: 'thunderbolt', score: 0.9, metric: 0.75, active: true },
  { id: 'V192', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true },
  // nanobot (7) V193-V199
  { id: 'V193', category: 'nanobot', score: 0.9, metric: 0.85, active: true },
  { id: 'V194', category: 'nanobot', score: 0.9, metric: 0.8, active: true },
  { id: 'V195', category: 'nanobot', score: 0.9, metric: 0.9, active: true },
  { id: 'V196', category: 'nanobot', score: 0.9, metric: 0.8, active: true },
  { id: 'V197', category: 'nanobot', score: 0.9, metric: 0.7, active: true },
  { id: 'V198', category: 'nanobot', score: 0.9, metric: 0.85, active: true },
  { id: 'V199', category: 'nanobot', score: 0.9, metric: 0.8, active: true },
  // ruflo (5) V200-V204
  { id: 'V200', category: 'ruflo', score: 0.9, metric: 0.85, active: true },
  { id: 'V201', category: 'ruflo', score: 0.9, metric: 0.8, active: true },
  { id: 'V202', category: 'ruflo', score: 0.9, metric: 0.85, active: true },
  { id: 'V203', category: 'ruflo', score: 0.9, metric: 0.9, active: true },
  { id: 'V204', category: 'ruflo', score: 0.9, metric: 0.85, active: true },
  // chatdev (4) V205-V208
  { id: 'V205', category: 'chatdev', score: 0.9, metric: 0.85, active: true },
  { id: 'V206', category: 'chatdev', score: 0.9, metric: 0.8, active: true },
  { id: 'V207', category: 'chatdev', score: 0.9, metric: 0.85, active: true },
  { id: 'V208', category: 'chatdev', score: 0.9, metric: 0.8, active: true },
  // generic-agent (4) V209-V212
  { id: 'V209', category: 'generic-agent', score: 0.9, metric: 0.85, active: true },
  { id: 'V210', category: 'generic-agent', score: 0.9, metric: 0.75, active: true },
  { id: 'V211', category: 'generic-agent', score: 0.9, metric: 0.7, active: true },
  { id: 'V212', category: 'generic-agent', score: 0.9, metric: 0.8, active: true },
];

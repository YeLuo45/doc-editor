/**
 * V184 MindOrchestrator - Direction A Writing Mind (Iter 30/30) [ORCHESTRATOR]
 * generic-agent: integrate all 29 engines + master metric
 * master = 0.4 * density + 0.3 * coherence + 0.3 * resonance
 */
export interface EngineSnapshot {
  id: string;          // engine name e.g. V155
  category: 'thunderbolt' | 'nanobot' | 'ruflo' | 'chatdev' | 'generic-agent' | 'orchestrator';
  score: number;       // 0..1, current engine health/activity
  metric: number;      // 0..1, key metric value
  active: boolean;
}

export interface OrchestratorState {
  engines: Map<string, EngineSnapshot>;
  density: number;       // mean of all metric values
  coherence: number;     // 1 - stddev (lower stddev = more coherent)
  resonance: number;     // weighted sum of key engines
  mastery: number;       // master metric
  adaptDirective: 'bootstrap' | 'balance' | 'activate' | 'maintain';
  totalEngines: number;
  activeEngines: number;
}

export function createOrchestratorState(): OrchestratorState {
  return {
    engines: new Map(),
    density: 0,
    coherence: 0,
    resonance: 0,
    mastery: 0,
    adaptDirective: 'bootstrap',
    totalEngines: 0,
    activeEngines: 0,
  };
}

export function registerEngine(state: OrchestratorState, snapshot: EngineSnapshot): OrchestratorState {
  const engines = new Map(state.engines);
  engines.set(snapshot.id, snapshot);
  return recomputeMaster({ ...state, engines, totalEngines: engines.size });
}

export function registerAllEngines(state: OrchestratorState, snapshots: EngineSnapshot[]): OrchestratorState {
  const engines = new Map<string, EngineSnapshot>();
  for (const s of snapshots) engines.set(s.id, s);
  return recomputeMaster({ ...state, engines, totalEngines: engines.size });
}

export function updateEngineScore(state: OrchestratorState, id: string, score: number, metric: number): OrchestratorState {
  const engines = new Map(state.engines);
  const existing = engines.get(id);
  if (!existing) return state;
  engines.set(id, { ...existing, score, metric, active: true });
  return recomputeMaster({ ...state, engines });
}

export function deactivateEngine(state: OrchestratorState, id: string): OrchestratorState {
  const engines = new Map(state.engines);
  const existing = engines.get(id);
  if (!existing) return state;
  engines.set(id, { ...existing, active: false });
  return recomputeMaster({ ...state, engines });
}

function recomputeMaster(state: OrchestratorState): OrchestratorState {
  const snapshots = Array.from(state.engines.values());
  const active = snapshots.filter(s => s.active);
  if (snapshots.length === 0) {
    return { ...state, density: 0, coherence: 0, resonance: 0, mastery: 0, activeEngines: 0, adaptDirective: 'bootstrap' };
  }
  // density = mean of metric values
  const mean = snapshots.reduce((a, b) => a + b.metric, 0) / snapshots.length;
  // coherence = 1 - stddev
  const stddev = Math.sqrt(snapshots.reduce((s, e) => s + Math.pow(e.metric - mean, 2), 0) / snapshots.length);
  const coherence = Math.max(0, 1 - stddev);
  // resonance = weighted sum of thunderbolt/chatdev (signal/coordinating engines)
  const keyEngines = snapshots.filter(s => s.category === 'thunderbolt' || s.category === 'chatdev');
  const resonance = keyEngines.length > 0 ? keyEngines.reduce((a, b) => a + b.metric, 0) / keyEngines.length : 0;
  // mastery = 0.4*density + 0.3*coherence + 0.3*resonance
  const mastery = 0.4 * mean + 0.3 * coherence + 0.3 * resonance;
  // adapt directive
  let adaptDirective: OrchestratorState['adaptDirective'] = 'maintain';
  if (mean < 0.3 || mastery < 0.4) adaptDirective = 'bootstrap';
  else if (coherence < 0.4) adaptDirective = 'balance';
  else if (mean < 0.6) adaptDirective = 'activate';
  return { ...state, density: mean, coherence, resonance, mastery, activeEngines: active.length, adaptDirective };
}

export function getEngineSnapshot(state: OrchestratorState, id: string): EngineSnapshot | undefined {
  return state.engines.get(id);
}

export function getAllSnapshots(state: OrchestratorState): EngineSnapshot[] {
  return Array.from(state.engines.values());
}

export function getOrchestratorReport(state: OrchestratorState): { totalEngines: number; activeEngines: number; density: number; coherence: number; resonance: number; mastery: number; directive: string; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  for (const s of state.engines.values()) byCategory[s.category] = (byCategory[s.category] || 0) + 1;
  return {
    totalEngines: state.totalEngines,
    activeEngines: state.activeEngines,
    density: state.density,
    coherence: state.coherence,
    resonance: state.resonance,
    mastery: state.mastery,
    directive: state.adaptDirective,
    byCategory,
  };
}

export function adaptRecommendation(state: OrchestratorState): string {
  switch (state.adaptDirective) {
    case 'bootstrap': return 'Load more engines and increase baseline activity to reach usable mastery.';
    case 'balance': return 'Engine metrics are spread out; balance the underperformers to improve coherence.';
    case 'activate': return 'Engines are coherent but under-active; activate idle ones to raise density.';
    case 'maintain': return 'Mind is healthy — maintain current configuration.';
    default: return 'Unknown directive';
  }
}

// Predefined 29 engine registry for one-shot setup
export const V155_V184_ENGINES: EngineSnapshot[] = [
  // thunderbolt (8) - real-time writing signals
  { id: 'V155', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true },
  { id: 'V156', category: 'thunderbolt', score: 0.9, metric: 0.85, active: true },
  { id: 'V157', category: 'thunderbolt', score: 0.9, metric: 0.75, active: true },
  { id: 'V158', category: 'thunderbolt', score: 0.9, metric: 0.7, active: true },
  { id: 'V159', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true },
  { id: 'V160', category: 'thunderbolt', score: 0.9, metric: 0.75, active: true },
  { id: 'V161', category: 'thunderbolt', score: 0.9, metric: 0.85, active: true },
  { id: 'V162', category: 'thunderbolt', score: 0.9, metric: 0.7, active: true },
  // nanobot (7) - distributed mind layer
  { id: 'V163', category: 'nanobot', score: 0.9, metric: 0.8, active: true },
  { id: 'V164', category: 'nanobot', score: 0.9, metric: 0.8, active: true },
  { id: 'V165', category: 'nanobot', score: 0.9, metric: 0.85, active: true },
  { id: 'V166', category: 'nanobot', score: 0.9, metric: 0.9, active: true },
  { id: 'V167', category: 'nanobot', score: 0.9, metric: 0.75, active: true },
  { id: 'V168', category: 'nanobot', score: 0.9, metric: 0.7, active: true },
  { id: 'V169', category: 'nanobot', score: 0.9, metric: 0.85, active: true },
  // ruflo (6) - lifecycle/audit
  { id: 'V170', category: 'ruflo', score: 0.9, metric: 0.9, active: true },
  { id: 'V171', category: 'ruflo', score: 0.9, metric: 0.85, active: true },
  { id: 'V172', category: 'ruflo', score: 0.9, metric: 0.7, active: true },
  { id: 'V173', category: 'ruflo', score: 0.9, metric: 0.8, active: true },
  { id: 'V174', category: 'ruflo', score: 0.9, metric: 0.75, active: true },
  { id: 'V175', category: 'ruflo', score: 0.9, metric: 0.7, active: true },
  // chatdev (4) - coordination
  { id: 'V176', category: 'chatdev', score: 0.9, metric: 0.85, active: true },
  { id: 'V177', category: 'chatdev', score: 0.9, metric: 0.8, active: true },
  { id: 'V178', category: 'chatdev', score: 0.9, metric: 0.8, active: true },
  { id: 'V179', category: 'chatdev', score: 0.9, metric: 0.75, active: true },
  // generic-agent (4) - self-improvement
  { id: 'V180', category: 'generic-agent', score: 0.9, metric: 0.8, active: true },
  { id: 'V181', category: 'generic-agent', score: 0.9, metric: 0.75, active: true },
  { id: 'V182', category: 'generic-agent', score: 0.9, metric: 0.7, active: true },
  { id: 'V183', category: 'generic-agent', score: 0.9, metric: 0.8, active: true },
];

/**
 * V214 AgentForgeMaster - Direction B Agent Forge (Iter 30/30) [MASTER ORCHESTRATOR]
 * generic-agent: master metric integrating 28 + 2 orchestrators = 30 engines
 * mastery = 0.4 * density + 0.3 * coherence + 0.3 * resonance
 * adapt directive: bootstrap | balance | activate | maintain
 */
import { V185_V212_ENGINES, type AgentEngineSnapshot } from './V213-AgentForgeOrchestrator';

export type AdaptDirective = 'bootstrap' | 'balance' | 'activate' | 'maintain';

export interface MasterSnapshot {
  density: number;
  coherence: number;
  resonance: number;
  mastery: number;
  directive: AdaptDirective;
  totalEngines: number;
  activeEngines: number;
}

export interface MasterState {
  engines: Map<string, AgentEngineSnapshot>;
  snapshot: MasterSnapshot;
  history: MasterSnapshot[];
  recommendation: string;
}

export function createMasterState(): MasterState {
  return {
    engines: new Map(),
    snapshot: { density: 0, coherence: 0, resonance: 0, mastery: 0, directive: 'bootstrap', totalEngines: 0, activeEngines: 0 },
    history: [],
    recommendation: 'No engines registered yet',
  };
}

export function registerAll30Engines(state: MasterState): MasterState {
  const engines = new Map<string, AgentEngineSnapshot>();
  for (const s of V185_V212_ENGINES) engines.set(s.id, s);
  // Add V213 and V214 as orchestrators
  engines.set('V213', { id: 'V213', category: 'generic-agent', score: 0.9, metric: 0.85, active: true });
  engines.set('V214', { id: 'V214', category: 'generic-agent', score: 0.9, metric: 0.9, active: true });
  return compute(state, engines);
}

export function updateEngine(state: MasterState, id: string, metric: number): MasterState {
  const engines = new Map(state.engines);
  const e = engines.get(id);
  if (!e) return state;
  engines.set(id, { ...e, metric, active: true });
  return compute(state, engines);
}

export function deactivateEngine(state: MasterState, id: string): MasterState {
  const engines = new Map(state.engines);
  const e = engines.get(id);
  if (!e) return state;
  engines.set(id, { ...e, active: false });
  return compute(state, engines);
}

function compute(state: MasterState, engines: Map<string, AgentEngineSnapshot>): MasterState {
  const snapshots = Array.from(engines.values());
  const active = snapshots.filter(s => s.active);
  if (snapshots.length === 0) return state;
  const mean = snapshots.reduce((a, b) => a + b.metric, 0) / snapshots.length;
  const stddev = Math.sqrt(snapshots.reduce((s, e) => s + Math.pow(e.metric - mean, 2), 0) / snapshots.length);
  const coherence = Math.max(0, 1 - stddev);
  const key = snapshots.filter(s => s.category === 'thunderbolt' || s.category === 'chatdev');
  const resonance = key.length > 0 ? key.reduce((a, b) => a + b.metric, 0) / key.length : 0;
  const mastery = 0.4 * mean + 0.3 * coherence + 0.3 * resonance;
  let directive: AdaptDirective = 'maintain';
  if (mean < 0.3 || mastery < 0.4) directive = 'bootstrap';
  else if (coherence < 0.4) directive = 'balance';
  else if (mean < 0.6) directive = 'activate';
  const snapshot: MasterSnapshot = { density: mean, coherence, resonance, mastery, directive, totalEngines: snapshots.length, activeEngines: active.length };
  const recommendation = generateRecommendation(directive, snapshot);
  return { ...state, engines, snapshot, history: [...state.history, snapshot].slice(-50), recommendation };
}

function generateRecommendation(directive: AdaptDirective, s: MasterSnapshot): string {
  switch (directive) {
    case 'bootstrap': return `Need to bootstrap: density=${s.density.toFixed(2)} mastery=${s.mastery.toFixed(2)} - load more engines`;
    case 'balance': return `Need to balance: coherence=${s.coherence.toFixed(2)} - align engine metrics`;
    case 'activate': return `Need to activate: density=${s.density.toFixed(2)} - engage idle engines`;
    case 'maintain': return `Healthy: density=${s.density.toFixed(2)} coherence=${s.coherence.toFixed(2)} mastery=${s.mastery.toFixed(2)} - maintain`;
  }
}

export function getSnapshot(state: MasterState): MasterSnapshot {
  return state.snapshot;
}

export function getHistory(state: MasterState): MasterSnapshot[] {
  return state.history;
}

export function getRecommendation(state: MasterState): string {
  return state.recommendation;
}

export function getMasterReport(state: MasterState): { totalEngines: number; activeEngines: number; density: number; coherence: number; resonance: number; mastery: number; directive: AdaptDirective; historySize: number } {
  return { ...state.snapshot, historySize: state.history.length };
}

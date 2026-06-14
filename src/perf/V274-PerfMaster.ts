/**
 * V274 PerfMaster - Direction D Perf Compression (Iter 30/30) [MASTER]
 * generic-agent: master metric integrating 30 perf engines + 4 adapt directives
 */
import { V245_V272_ENGINES, type PerfEngineSnapshot } from './V273-PerfOrchestrator';

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

export interface PerfMasterState {
  engines: Map<string, PerfEngineSnapshot>;
  snapshot: MasterSnapshot;
  history: MasterSnapshot[];
  recommendation: string;
}

export function createPerfMasterState(): PerfMasterState {
  return {
    engines: new Map(),
    snapshot: { density: 0, coherence: 0, resonance: 0, mastery: 0, directive: 'bootstrap', totalEngines: 0, activeEngines: 0 },
    history: [],
    recommendation: 'No engines registered yet',
  };
}

export function registerAll30PerfEngines(state: PerfMasterState): PerfMasterState {
  const engines = new Map<string, PerfEngineSnapshot>();
  for (const s of V245_V272_ENGINES) engines.set(s.id, s);
  engines.set('V273', { id: 'V273', category: 'generic-agent', score: 0.9, metric: 0.85, active: true });
  engines.set('V274', { id: 'V274', category: 'generic-agent', score: 0.9, metric: 0.9, active: true });
  return compute(state, engines);
}

export function updatePerfEngineMetric(state: PerfMasterState, id: string, metric: number): PerfMasterState {
  const engines = new Map(state.engines);
  const e = engines.get(id);
  if (!e) return state;
  engines.set(id, { ...e, metric, active: true });
  return compute(state, engines);
}

export function deactivatePerfEngine(state: PerfMasterState, id: string): PerfMasterState {
  const engines = new Map(state.engines);
  const e = engines.get(id);
  if (!e) return state;
  engines.set(id, { ...e, active: false });
  return compute(state, engines);
}

function compute(state: PerfMasterState, engines: Map<string, PerfEngineSnapshot>): PerfMasterState {
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
    case 'bootstrap': return `Bootstrap: density=${s.density.toFixed(2)} mastery=${s.mastery.toFixed(2)}`;
    case 'balance': return `Balance: coherence=${s.coherence.toFixed(2)}`;
    case 'activate': return `Activate: density=${s.density.toFixed(2)}`;
    case 'maintain': return `Healthy: density=${s.density.toFixed(2)} mastery=${s.mastery.toFixed(2)}`;
  }
}

export function getPerfSnapshot(state: PerfMasterState): MasterSnapshot {
  return state.snapshot;
}

export function getPerfHistory(state: PerfMasterState): MasterSnapshot[] {
  return state.history;
}

export function getPerfRecommendation(state: PerfMasterState): string {
  return state.recommendation;
}

export function getPerfMasterReport(state: PerfMasterState): { totalEngines: number; activeEngines: number; density: number; coherence: number; resonance: number; mastery: number; directive: AdaptDirective; historySize: number } {
  return { ...state.snapshot, historySize: state.history.length };
}

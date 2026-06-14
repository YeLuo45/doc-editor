/**
 * V244 DocFederationMaster - Direction C Doc Federation (Iter 30/30) [MASTER]
 * generic-agent: master metric integrating 30 sync engines + 4 adapt directives
 */
import { V215_V242_ENGINES, type SyncEngineSnapshot } from './V243-DocFederationOrchestrator';

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

export interface DocFederationMasterState {
  engines: Map<string, SyncEngineSnapshot>;
  snapshot: MasterSnapshot;
  history: MasterSnapshot[];
  recommendation: string;
}

export function createDocFederationMasterState(): DocFederationMasterState {
  return {
    engines: new Map(),
    snapshot: { density: 0, coherence: 0, resonance: 0, mastery: 0, directive: 'bootstrap', totalEngines: 0, activeEngines: 0 },
    history: [],
    recommendation: 'No engines registered yet',
  };
}

export function registerAll30Engines(state: DocFederationMasterState): DocFederationMasterState {
  const engines = new Map<string, SyncEngineSnapshot>();
  for (const s of V215_V242_ENGINES) engines.set(s.id, s);
  engines.set('V243', { id: 'V243', category: 'generic-agent', score: 0.9, metric: 0.85, active: true });
  engines.set('V244', { id: 'V244', category: 'generic-agent', score: 0.9, metric: 0.9, active: true });
  return compute(state, engines);
}

export function updateEngine(state: DocFederationMasterState, id: string, metric: number): DocFederationMasterState {
  const engines = new Map(state.engines);
  const e = engines.get(id);
  if (!e) return state;
  engines.set(id, { ...e, metric, active: true });
  return compute(state, engines);
}

export function deactivateEngine(state: DocFederationMasterState, id: string): DocFederationMasterState {
  const engines = new Map(state.engines);
  const e = engines.get(id);
  if (!e) return state;
  engines.set(id, { ...e, active: false });
  return compute(state, engines);
}

function compute(state: DocFederationMasterState, engines: Map<string, SyncEngineSnapshot>): DocFederationMasterState {
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
    case 'bootstrap': return `Bootstrap needed: density=${s.density.toFixed(2)} mastery=${s.mastery.toFixed(2)}`;
    case 'balance': return `Balance needed: coherence=${s.coherence.toFixed(2)}`;
    case 'activate': return `Activate: density=${s.density.toFixed(2)}`;
    case 'maintain': return `Healthy: density=${s.density.toFixed(2)} mastery=${s.mastery.toFixed(2)}`;
  }
}

export function getSnapshot(state: DocFederationMasterState): MasterSnapshot {
  return state.snapshot;
}

export function getHistory(state: DocFederationMasterState): MasterSnapshot[] {
  return state.history;
}

export function getRecommendation(state: DocFederationMasterState): string {
  return state.recommendation;
}

export function getDocFederationMasterReport(state: DocFederationMasterState): { totalEngines: number; activeEngines: number; density: number; coherence: number; resonance: number; mastery: number; directive: AdaptDirective; historySize: number } {
  return { ...state.snapshot, historySize: state.history.length };
}

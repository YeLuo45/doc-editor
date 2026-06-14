/**
 * V225 DocDistribution - Direction C Doc Federation (Iter 11/30)
 * nanobot: Distribute documents to multiple instances
 */
export type DistributionMode = 'primary_replica' | 'multi_primary' | 'lazy' | 'eager';

export interface DistributionTarget {
  instanceId: string;
  deviceId: string;
  docId: string;
  version: number;
  lastSyncAt: number;
  status: 'pending' | 'synced' | 'failed' | 'out_of_sync';
}

export interface DocDistributionState {
  distributions: Map<string, DistributionTarget[]>;  // docId -> targets
  mode: DistributionMode;
  totalDistributions: number;
  totalSynced: number;
  totalFailed: number;
}

export function createDocDistributionState(): DocDistributionState {
  return { distributions: new Map(), mode: 'primary_replica', totalDistributions: 0, totalSynced: 0, totalFailed: 0 };
}

export function setDistributionMode(state: DocDistributionState, mode: DistributionMode): DocDistributionState {
  return { ...state, mode };
}

export function addTarget(state: DocDistributionState, target: Omit<DistributionTarget, 'lastSyncAt' | 'status' | 'version'> & { version?: number }): DocDistributionState {
  const t: DistributionTarget = { ...target, version: target.version || 1, lastSyncAt: Date.now(), status: 'pending' };
  const existing = state.distributions.get(target.docId) || [];
  return {
    ...state,
    distributions: new Map(state.distributions).set(target.docId, [...existing, t]),
    totalDistributions: state.totalDistributions + 1,
  };
}

export function markSynced(state: DocDistributionState, docId: string, instanceId: string, version: number): DocDistributionState {
  const targets = state.distributions.get(docId) || [];
  const updated = targets.map(t => t.instanceId === instanceId ? { ...t, status: 'synced' as const, lastSyncAt: Date.now(), version } : t);
  return { ...state, distributions: new Map(state.distributions).set(docId, updated), totalSynced: state.totalSynced + 1 };
}

export function markFailed(state: DocDistributionState, docId: string, instanceId: string): DocDistributionState {
  const targets = state.distributions.get(docId) || [];
  const updated = targets.map(t => t.instanceId === instanceId ? { ...t, status: 'failed' as const } : t);
  return { ...state, distributions: new Map(state.distributions).set(docId, updated), totalFailed: state.totalFailed + 1 };
}

export function markOutOfSync(state: DocDistributionState, docId: string, instanceId: string): DocDistributionState {
  const targets = state.distributions.get(docId) || [];
  const updated = targets.map(t => t.instanceId === instanceId ? { ...t, status: 'out_of_sync' as const } : t);
  return { ...state, distributions: new Map(state.distributions).set(docId, updated) };
}

export function getTargetsForDoc(state: DocDistributionState, docId: string): DistributionTarget[] {
  return state.distributions.get(docId) || [];
}

export function getTarget(state: DocDistributionState, docId: string, instanceId: string): DistributionTarget | undefined {
  return (state.distributions.get(docId) || []).find(t => t.instanceId === instanceId);
}

export function removeTarget(state: DocDistributionState, docId: string, instanceId: string): DocDistributionState {
  const targets = state.distributions.get(docId) || [];
  const filtered = targets.filter(t => t.instanceId !== instanceId);
  return { ...state, distributions: new Map(state.distributions).set(docId, filtered) };
}

export function getDocDistributionReport(state: DocDistributionState): { totalTargets: number; synced: number; failed: number; byDoc: Record<string, number> } {
  const byDoc: Record<string, number> = {};
  for (const [docId, targets] of state.distributions.entries()) byDoc[docId] = targets.length;
  return { totalTargets: state.totalDistributions, synced: state.totalSynced, failed: state.totalFailed, byDoc };
}

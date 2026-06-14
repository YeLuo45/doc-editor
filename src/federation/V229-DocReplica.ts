/**
 * V229 DocReplica - Direction C Doc Federation (Iter 15/30)
 * nanobot: Document replica state tracking (primary/secondary/offline)
 */
export type ReplicaRole = 'primary' | 'secondary' | 'offline' | 'promoting' | 'demoting';

export interface DocReplicaInfo {
  docId: string;
  instanceId: string;
  role: ReplicaRole;
  version: number;
  vectorClock: Record<string, number>;
  lastSyncAt: number;
  isHealthy: boolean;
}

export interface DocReplicaState {
  replicas: Map<string, DocReplicaInfo[]>;  // docId -> list of replicas
  totalReplicas: number;
  healthyReplicas: number;
}

export function createDocReplicaState(): DocReplicaState {
  return { replicas: new Map(), totalReplicas: 0, healthyReplicas: 0 };
}

export function addReplica(state: DocReplicaState, replica: Omit<DocReplicaInfo, 'lastSyncAt' | 'isHealthy' | 'vectorClock'> & { vectorClock?: Record<string, number>; isHealthy?: boolean }): DocReplicaState {
  const r: DocReplicaInfo = { ...replica, vectorClock: replica.vectorClock || {}, lastSyncAt: Date.now(), isHealthy: replica.isHealthy ?? true };
  const existing = state.replicas.get(replica.docId) || [];
  return { ...state, replicas: new Map(state.replicas).set(replica.docId, [...existing, r]), totalReplicas: state.totalReplicas + 1, healthyReplicas: state.healthyReplicas + (r.isHealthy ? 1 : 0) };
}

export function setReplicaRole(state: DocReplicaState, docId: string, instanceId: string, role: ReplicaRole): DocReplicaState {
  const replicas = state.replicas.get(docId) || [];
  const updated = replicas.map(r => r.instanceId === instanceId ? { ...r, role } : r);
  return { ...state, replicas: new Map(state.replicas).set(docId, updated) };
}

export function updateReplicaVersion(state: DocReplicaState, docId: string, instanceId: string, version: number, vectorClock: Record<string, number>): DocReplicaState {
  const replicas = state.replicas.get(docId) || [];
  const updated = replicas.map(r => r.instanceId === instanceId ? { ...r, version, vectorClock, lastSyncAt: Date.now() } : r);
  return { ...state, replicas: new Map(state.replicas).set(docId, updated) };
}

export function markReplicaHealthy(state: DocReplicaState, docId: string, instanceId: string, healthy: boolean): DocReplicaState {
  const replicas = state.replicas.get(docId) || [];
  const updated = replicas.map(r => r.instanceId === instanceId ? { ...r, isHealthy: healthy } : r);
  const healthyCount = updated.filter(r => r.isHealthy).length;
  return { ...state, replicas: new Map(state.replicas).set(docId, updated), healthyReplicas: healthyCount };
}

export function getReplicasForDoc(state: DocReplicaState, docId: string): DocReplicaInfo[] {
  return state.replicas.get(docId) || [];
}

export function getPrimaryReplica(state: DocReplicaState, docId: string): DocReplicaInfo | undefined {
  return (state.replicas.get(docId) || []).find(r => r.role === 'primary');
}

export function getSecondaryReplicas(state: DocReplicaState, docId: string): DocReplicaInfo[] {
  return (state.replicas.get(docId) || []).filter(r => r.role === 'secondary');
}

export function removeReplica(state: DocReplicaState, docId: string, instanceId: string): DocReplicaState {
  const replicas = state.replicas.get(docId) || [];
  const filtered = replicas.filter(r => r.instanceId !== instanceId);
  return { ...state, replicas: new Map(state.replicas).set(docId, filtered), totalReplicas: Math.max(0, state.totalReplicas - 1) };
}

export function getDocReplicaReport(state: DocReplicaState): { total: number; healthy: number; byDoc: Record<string, number>; byRole: Record<string, number> } {
  const byDoc: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  for (const [docId, replicas] of state.replicas.entries()) {
    byDoc[docId] = replicas.length;
    for (const r of replicas) byRole[r.role] = (byRole[r.role] || 0) + 1;
  }
  return { total: state.totalReplicas, healthy: state.healthyReplicas, byDoc, byRole };
}

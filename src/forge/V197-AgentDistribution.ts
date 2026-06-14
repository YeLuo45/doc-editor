/**
 * V197 AgentDistribution - Direction B Agent Forge (Iter 13/30)
 * nanobot: Distribute agents to federated instances
 */
export type DistributionStatus = 'pending' | 'in_progress' | 'success' | 'failed';
export type InstanceStatus = 'online' | 'offline' | 'syncing';

export interface Instance {
  id: string;
  name: string;
  url: string;
  status: InstanceStatus;
  lastSeen: number;
}

export interface Distribution {
  id: string;
  agentId: string;
  version: string;
  instanceId: string;
  status: DistributionStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface DistributionState {
  instances: Map<string, Instance>;
  distributions: Distribution[];
  nextId: number;
}

export function createDistributionState(): DistributionState {
  return { instances: new Map(), distributions: [], nextId: 1 };
}

export function addInstance(state: DistributionState, instance: Omit<Instance, 'lastSeen' | 'status'> & { status?: InstanceStatus }): DistributionState {
  return { ...state, instances: new Map(state.instances).set(instance.id, { ...instance, status: instance.status || 'offline', lastSeen: Date.now() }) };
}

export function removeInstance(state: DistributionState, id: string): DistributionState {
  const instances = new Map(state.instances);
  instances.delete(id);
  return { ...state, instances };
}

export function setInstanceStatus(state: DistributionState, id: string, status: InstanceStatus): DistributionState {
  const inst = state.instances.get(id);
  if (!inst) return state;
  return { ...state, instances: new Map(state.instances).set(id, { ...inst, status, lastSeen: Date.now() }) };
}

export function startDistribution(state: DistributionState, agentId: string, version: string, instanceId: string): DistributionState {
  const dist: Distribution = { id: `dist-${state.nextId}`, agentId, version, instanceId, status: 'pending', startedAt: Date.now() };
  return { ...state, distributions: [...state.distributions, dist].slice(-200), nextId: state.nextId + 1 };
}

export function markDistributionStatus(state: DistributionState, id: string, status: DistributionStatus, error?: string): DistributionState {
  return {
    ...state,
    distributions: state.distributions.map(d => d.id === id ? { ...d, status, error, completedAt: status === 'success' || status === 'failed' ? Date.now() : d.completedAt } : d),
  };
}

export function getDistributionsByStatus(state: DistributionState, status: DistributionStatus): Distribution[] {
  return state.distributions.filter(d => d.status === status);
}

export function getDistributionsByInstance(state: DistributionState, instanceId: string): Distribution[] {
  return state.distributions.filter(d => d.instanceId === instanceId);
}

export function getDistributionsByAgent(state: DistributionState, agentId: string): Distribution[] {
  return state.distributions.filter(d => d.agentId === agentId);
}

export function getOnlineInstances(state: DistributionState): Instance[] {
  return Array.from(state.instances.values()).filter(i => i.status === 'online');
}

export function getDistributionReport(state: DistributionState): { instances: number; distributions: number; onlineInstances: number; successRate: number } {
  const completed = state.distributions.filter(d => d.status === 'success' || d.status === 'failed');
  const success = completed.filter(d => d.status === 'success').length;
  return {
    instances: state.instances.size,
    distributions: state.distributions.length,
    onlineInstances: getOnlineInstances(state).length,
    successRate: completed.length > 0 ? success / completed.length : 0,
  };
}

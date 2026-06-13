/**
 * V177 MindDelegate - Direction A Writing Mind (Iter 23/30)
 * chatdev: delegate work to specific writing agent
 */
export type DelegatePriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Delegation {
  id: string;
  fromRole: string;
  toRole: string;
  workItem: string;
  priority: DelegatePriority;
  context: any;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  result?: string;
}

export interface DelegationState {
  delegations: Delegation[];
  delegationCounts: Map<string, number>;
  rejectionCounts: Map<string, number>;
  nextId: number;
}

export function createDelegationState(): DelegationState {
  return { delegations: [], delegationCounts: new Map(), rejectionCounts: new Map(), nextId: 1 };
}

export function delegate(state: DelegationState, fromRole: string, toRole: string, workItem: string, context: any, priority: DelegatePriority = 'normal'): { state: DelegationState; id: string } {
  const id = `del-${state.nextId}`;
  const d: Delegation = { id, fromRole, toRole, workItem, priority, context, status: 'pending', createdAt: Date.now() };
  const counts = new Map(state.delegationCounts);
  counts.set(toRole, (counts.get(toRole) || 0) + 1);
  return { state: { ...state, delegations: [...state.delegations, d].slice(-200), delegationCounts: counts, nextId: state.nextId + 1 }, id };
}

export function acceptDelegation(state: DelegationState, id: string): DelegationState {
  return { ...state, delegations: state.delegations.map(d => d.id === id ? { ...d, status: 'accepted' as const, acceptedAt: Date.now() } : d) };
}

export function rejectDelegation(state: DelegationState, id: string, reason: string): DelegationState {
  const rejections = new Map(state.rejectionCounts);
  const d = state.delegations.find(x => x.id === id);
  if (d) rejections.set(d.toRole, (rejections.get(d.toRole) || 0) + 1);
  return { ...state, delegations: state.delegations.map(x => x.id === id ? { ...x, status: 'rejected' as const, result: reason } : x), rejectionCounts: rejections };
}

export function completeDelegation(state: DelegationState, id: string, result: string): DelegationState {
  return { ...state, delegations: state.delegations.map(d => d.id === id ? { ...d, status: 'completed' as const, result, completedAt: Date.now() } : d) };
}

export function getDelegationsByStatus(state: DelegationState, status: Delegation['status']): Delegation[] {
  return state.delegations.filter(d => d.status === status);
}

export function getDelegationsForRole(state: DelegationState, role: string): Delegation[] {
  return state.delegations.filter(d => d.toRole === role);
}

export function getDelegationReport(state: DelegationState): { total: number; pending: number; accepted: number; rejected: number; completed: number; byRole: Record<string, number> } {
  const byRole: Record<string, number> = {};
  for (const [role, count] of state.delegationCounts.entries()) byRole[role] = count;
  return {
    total: state.delegations.length,
    pending: getDelegationsByStatus(state, 'pending').length,
    accepted: getDelegationsByStatus(state, 'accepted').length,
    rejected: getDelegationsByStatus(state, 'rejected').length,
    completed: getDelegationsByStatus(state, 'completed').length,
    byRole,
  };
}

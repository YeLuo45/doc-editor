/**
 * V298 TrustRole - Direction E Trust Verification (Iter 24/30)
 * chatdev: Assign trust roles (verifier/auditor/reviewer)
 */
export type TrustRole = 'verifier' | 'auditor' | 'reviewer' | 'admin' | 'observer';

export interface TrustRoleAssignment {
  agentId: string;
  role: TrustRole;
  scopes: string[];
  canIssue: boolean;
  canRevoke: boolean;
  assignedAt: number;
}

export interface TrustRoleState {
  assignments: Map<string, TrustRoleAssignment>;
  nextId: number;
  totalAssignments: number;
  byRole: Record<TrustRole, number>;
}

const DEFAULT_PERMISSIONS: Record<TrustRole, { canIssue: boolean; canRevoke: boolean }> = {
  verifier: { canIssue: false, canRevoke: false },
  auditor: { canIssue: false, canRevoke: false },
  reviewer: { canIssue: true, canRevoke: false },
  admin: { canIssue: true, canRevoke: true },
  observer: { canIssue: false, canRevoke: false },
};

export function createTrustRoleState(): TrustRoleState {
  return { assignments: new Map(), nextId: 1, totalAssignments: 0, byRole: { verifier: 0, auditor: 0, reviewer: 0, admin: 0, observer: 0 } };
}

export function assignTrustRole(state: TrustRoleState, agentId: string, role: TrustRole, scopes: string[]): TrustRoleState {
  const perms = DEFAULT_PERMISSIONS[role];
  const assignment: TrustRoleAssignment = { agentId, role, scopes, canIssue: perms.canIssue, canRevoke: perms.canRevoke, assignedAt: Date.now() };
  return { ...state, assignments: new Map(state.assignments).set(agentId, assignment), nextId: state.nextId + 1, totalAssignments: state.totalAssignments + 1, byRole: { ...state.byRole, [role]: state.byRole[role] + 1 } };
}

export function unassignTrustRole(state: TrustRoleState, agentId: string): TrustRoleState {
  const existing = state.assignments.get(agentId);
  if (!existing) return state;
  const assignments = new Map(state.assignments);
  assignments.delete(agentId);
  return { ...state, assignments, byRole: { ...state.byRole, [existing.role]: Math.max(0, state.byRole[existing.role] - 1) } };
}

export function canAgentIssue(state: TrustRoleState, agentId: string): boolean {
  return state.assignments.get(agentId)?.canIssue || false;
}

export function canAgentRevoke(state: TrustRoleState, agentId: string): boolean {
  return state.assignments.get(agentId)?.canRevoke || false;
}

export function getTrustRoleAssignment(state: TrustRoleState, agentId: string): TrustRoleAssignment | undefined {
  return state.assignments.get(agentId);
}

export function getAgentsByRole(state: TrustRoleState, role: TrustRole): TrustRoleAssignment[] {
  return Array.from(state.assignments.values()).filter(a => a.role === role);
}

export function clearTrustRoles(state: TrustRoleState): TrustRoleState {
  return createTrustRoleState();
}

export function getTrustRoleReport(state: TrustRoleState): { total: number; byRole: Record<string, number> } {
  return { total: state.totalAssignments, byRole: state.byRole };
}

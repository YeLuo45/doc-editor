/**
 * V268 PerfRole - Direction D Perf Compression (Iter 24/30)
 * chatdev: Assign perf roles (heavy/light) to agents
 */
export type PerfRole = 'heavy' | 'medium' | 'light' | 'idle';

export interface RoleAssignment {
  agentId: string;
  role: PerfRole;
  budgetTokens: number;
  maxConcurrent: number;
  assignedAt: number;
}

export interface RoleState {
  assignments: Map<string, RoleAssignment>;
  totalHeavy: number;
  totalLight: number;
}

export function createRoleState(): RoleState {
  return { assignments: new Map(), totalHeavy: 0, totalLight: 0 };
}

const DEFAULT_BUDGETS: Record<PerfRole, { budgetTokens: number; maxConcurrent: number }> = {
  heavy: { budgetTokens: 10000, maxConcurrent: 3 },
  medium: { budgetTokens: 5000, maxConcurrent: 5 },
  light: { budgetTokens: 1000, maxConcurrent: 10 },
  idle: { budgetTokens: 0, maxConcurrent: 0 },
};

export function assignRole(state: RoleState, agentId: string, role: PerfRole, customBudget?: number, customMax?: number): RoleState {
  const defaults = DEFAULT_BUDGETS[role];
  const assignment: RoleAssignment = { agentId, role, budgetTokens: customBudget ?? defaults.budgetTokens, maxConcurrent: customMax ?? defaults.maxConcurrent, assignedAt: Date.now() };
  const existing = state.assignments.get(agentId);
  const newAssignments = new Map(state.assignments);
  newAssignments.set(agentId, assignment);
  let totalHeavy = state.totalHeavy;
  let totalLight = state.totalLight;
  if (existing) {
    if (existing.role === 'heavy') totalHeavy--;
    if (existing.role === 'light') totalLight--;
  }
  if (role === 'heavy') totalHeavy++;
  if (role === 'light') totalLight++;
  return { ...state, assignments: newAssignments, totalHeavy, totalLight };
}

export function unassignRole(state: RoleState, agentId: string): RoleState {
  const existing = state.assignments.get(agentId);
  if (!existing) return state;
  const assignments = new Map(state.assignments);
  assignments.delete(agentId);
  let totalHeavy = state.totalHeavy;
  let totalLight = state.totalLight;
  if (existing.role === 'heavy') totalHeavy--;
  if (existing.role === 'light') totalLight--;
  return { ...state, assignments, totalHeavy, totalLight };
}

export function getAssignment(state: RoleState, agentId: string): RoleAssignment | undefined {
  return state.assignments.get(agentId);
}

export function getAssignmentsByRole(state: RoleState, role: PerfRole): RoleAssignment[] {
  return Array.from(state.assignments.values()).filter(a => a.role === role);
}

export function getTotalBudget(state: RoleState): number {
  return Array.from(state.assignments.values()).reduce((a, b) => a + b.budgetTokens, 0);
}

export function getMaxConcurrent(state: RoleState): number {
  return Array.from(state.assignments.values()).reduce((a, b) => a + b.maxConcurrent, 0);
}

export function getRoleReport(state: RoleState): { total: number; heavy: number; light: number; totalBudget: number; byRole: Record<string, number> } {
  const byRole: Record<string, number> = {};
  for (const a of state.assignments.values()) byRole[a.role] = (byRole[a.role] || 0) + 1;
  return { total: state.assignments.size, heavy: state.totalHeavy, light: state.totalLight, totalBudget: getTotalBudget(state), byRole };
}

/**
 * V207 AgentRoleAssignment - Direction B Agent Forge (Iter 23/30)
 * chatdev: Dynamic role assignment to agents
 */
export type RoleType = 'primary' | 'secondary' | 'reviewer' | 'observer' | 'fallback';

export interface RoleAssignment {
  agentId: string;
  taskId: string;
  role: RoleType;
  assignedAt: number;
  confidence: number;     // 0..1
  reason?: string;
}

export interface RoleState {
  assignments: RoleAssignment[];
  taskRoles: Map<string, RoleType[]>;   // task -> list of roles
  agentRoles: Map<string, RoleType[]>;   // agent -> list of roles assigned
}

export function createRoleState(): RoleState {
  return { assignments: [], taskRoles: new Map(), agentRoles: new Map() };
}

export function defineTaskRoles(state: RoleState, taskId: string, roles: RoleType[]): RoleState {
  return { ...state, taskRoles: new Map(state.taskRoles).set(taskId, roles) };
}

export function assignRole(state: RoleState, agentId: string, taskId: string, role: RoleType, confidence: number, reason?: string): RoleState {
  const assignment: RoleAssignment = { agentId, taskId, role, assignedAt: Date.now(), confidence, reason };
  const taskRoles = new Map(state.taskRoles);
  const tRoles = taskRoles.get(taskId) || [];
  if (!tRoles.includes(role)) taskRoles.set(taskId, [...tRoles, role]);
  const agentRoles = new Map(state.agentRoles);
  const aRoles = agentRoles.get(agentId) || [];
  agentRoles.set(agentId, [...aRoles, role]);
  return { ...state, assignments: [...state.assignments, assignment], taskRoles, agentRoles };
}

export function unassignRole(state: RoleState, agentId: string, taskId: string, role: RoleType): RoleState {
  return { ...state, assignments: state.assignments.filter(a => !(a.agentId === agentId && a.taskId === taskId && a.role === role)) };
}

export function getAssignmentsForTask(state: RoleState, taskId: string): RoleAssignment[] {
  return state.assignments.filter(a => a.taskId === taskId);
}

export function getAssignmentsForAgent(state: RoleState, agentId: string): RoleAssignment[] {
  return state.assignments.filter(a => a.agentId === agentId);
}

export function getBestAgentForRole(state: RoleState, taskId: string, role: RoleType): RoleAssignment | undefined {
  const candidates = state.assignments.filter(a => a.taskId === taskId && a.role === role);
  return candidates.sort((a, b) => b.confidence - a.confidence)[0];
}

export function clearAssignments(state: RoleState): RoleState {
  return { ...state, assignments: [] };
}

export function getRoleReport(state: RoleState): { total: number; byRole: Record<string, number>; uniqueAgents: number; uniqueTasks: number } {
  const byRole: Record<string, number> = {};
  const agents = new Set<string>();
  const tasks = new Set<string>();
  for (const a of state.assignments) {
    byRole[a.role] = (byRole[a.role] || 0) + 1;
    agents.add(a.agentId);
    tasks.add(a.taskId);
  }
  return { total: state.assignments.length, byRole, uniqueAgents: agents.size, uniqueTasks: tasks.size };
}

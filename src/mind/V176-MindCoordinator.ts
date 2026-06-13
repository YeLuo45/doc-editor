/**
 * V176 MindCoordinator - Direction A Writing Mind (Iter 22/30)
 * chatdev: writing mind + editor + reviewer coordination
 */
export type AgentRole = 'editor' | 'reviewer' | 'researcher' | 'summarizer' | 'formatter';

export interface Task {
  id: string;
  type: 'review' | 'format' | 'expand' | 'summarize' | 'translate';
  input: string;
  assignedTo: AgentRole | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  createdAt: number;
  completedAt?: number;
}

export interface CoordinationState {
  tasks: Task[];
  agents: Map<AgentRole, { active: boolean; lastActive: number; tasksCompleted: number }>;
  round: number;
  completedCount: number;
  failedCount: number;
}

let counter = 0;
function nextId(): string { return `task-${++counter}`; }

export function createCoordinationState(): CoordinationState {
  return {
    tasks: [],
    agents: new Map([
      ['editor', { active: true, lastActive: 0, tasksCompleted: 0 }],
      ['reviewer', { active: true, lastActive: 0, tasksCompleted: 0 }],
      ['researcher', { active: true, lastActive: 0, tasksCompleted: 0 }],
      ['summarizer', { active: true, lastActive: 0, tasksCompleted: 0 }],
      ['formatter', { active: true, lastActive: 0, tasksCompleted: 0 }],
    ]),
    round: 0,
    completedCount: 0,
    failedCount: 0,
  };
}

export function createTask(state: CoordinationState, type: Task['type'], input: string, assignedTo: AgentRole | null = null): { state: CoordinationState; taskId: string } {
  const task: Task = { id: nextId(), type, input, assignedTo, status: 'pending', createdAt: Date.now() };
  return { state: { ...state, tasks: [...state.tasks, task].slice(-200) }, taskId: task.id };
}

export function startTask(state: CoordinationState, taskId: string): CoordinationState {
  return {
    ...state,
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'in_progress' as const } : t),
  };
}

export function completeTask(state: CoordinationState, taskId: string, result: string): CoordinationState {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return state;
  const agents = new Map(state.agents);
  if (task.assignedTo) {
    const a = agents.get(task.assignedTo);
    if (a) agents.set(task.assignedTo, { ...a, lastActive: Date.now(), tasksCompleted: a.tasksCompleted + 1 });
  }
  return {
    ...state,
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' as const, result, completedAt: Date.now() } : t),
    agents,
    completedCount: state.completedCount + 1,
  };
}

export function failTask(state: CoordinationState, taskId: string, reason: string): CoordinationState {
  return {
    ...state,
    tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'failed' as const, result: reason, completedAt: Date.now() } : t),
    failedCount: state.failedCount + 1,
  };
}

export function nextRound(state: CoordinationState): CoordinationState {
  return { ...state, round: state.round + 1 };
}

export function setAgentActive(state: CoordinationState, role: AgentRole, active: boolean): CoordinationState {
  const agents = new Map(state.agents);
  const a = agents.get(role);
  if (a) agents.set(role, { ...a, active });
  return { ...state, agents };
}

export function getPendingTasks(state: CoordinationState): Task[] {
  return state.tasks.filter(t => t.status === 'pending');
}

export function getActiveAgents(state: CoordinationState): AgentRole[] {
  return Array.from(state.agents.entries()).filter(([_, a]) => a.active).map(([r]) => r);
}

export function getCoordinationReport(state: CoordinationState): { round: number; pending: number; completed: number; failed: number; activeAgents: number } {
  return { round: state.round, pending: getPendingTasks(state).length, completed: state.completedCount, failed: state.failedCount, activeAgents: getActiveAgents(state).length };
}

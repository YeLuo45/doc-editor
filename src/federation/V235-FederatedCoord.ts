/**
 * V235 FederatedCoord - Direction C Doc Federation (Iter 21/30)
 * chatdev: Coordinate operations across federated devices
 */
export interface CoordTask {
  id: string;
  docId: string;
  type: 'edit' | 'sync' | 'archive' | 'distribute';
  initiatedBy: string;
  participants: string[];   // device IDs
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
}

export interface FederatedCoordState {
  tasks: Map<string, CoordTask>;
  deviceStates: Map<string, 'ready' | 'busy' | 'offline'>;
  nextId: number;
  totalCoordinated: number;
}

export function createFederatedCoordState(): FederatedCoordState {
  return { tasks: new Map(), deviceStates: new Map(), nextId: 1, totalCoordinated: 0 };
}

export function setDeviceState(state: FederatedCoordState, deviceId: string, devState: 'ready' | 'busy' | 'offline'): FederatedCoordState {
  return { ...state, deviceStates: new Map(state.deviceStates).set(deviceId, devState) };
}

export function startCoordination(state: FederatedCoordState, docId: string, type: 'edit' | 'sync' | 'archive' | 'distribute', initiatedBy: string, participants: string[]): { state: FederatedCoordState; taskId: string } {
  const id = `coord-${state.nextId}`;
  const task: CoordTask = { id, docId, type, initiatedBy, participants, status: 'pending', startedAt: Date.now() };
  return { state: { ...state, tasks: new Map(state.tasks).set(id, task), nextId: state.nextId + 1 }, taskId: id };
}

export function markCoordRunning(state: FederatedCoordState, taskId: string): FederatedCoordState {
  const t = state.tasks.get(taskId);
  if (!t) return state;
  return { ...state, tasks: new Map(state.tasks).set(taskId, { ...t, status: 'in_progress' }) };
}

export function markCoordCompleted(state: FederatedCoordState, taskId: string): FederatedCoordState {
  const t = state.tasks.get(taskId);
  if (!t) return state;
  return { ...state, tasks: new Map(state.tasks).set(taskId, { ...t, status: 'completed', completedAt: Date.now() }), totalCoordinated: state.totalCoordinated + 1 };
}

export function markCoordFailed(state: FederatedCoordState, taskId: string): FederatedCoordState {
  const t = state.tasks.get(taskId);
  if (!t) return state;
  return { ...state, tasks: new Map(state.tasks).set(taskId, { ...t, status: 'failed', completedAt: Date.now() }) };
}

export function getCoordTask(state: FederatedCoordState, taskId: string): CoordTask | undefined {
  return state.tasks.get(taskId);
}

export function getCoordTasksForDoc(state: FederatedCoordState, docId: string): CoordTask[] {
  return Array.from(state.tasks.values()).filter(t => t.docId === docId);
}

export function getCoordTasksByStatus(state: FederatedCoordState, status: CoordTask['status']): CoordTask[] {
  return Array.from(state.tasks.values()).filter(t => t.status === status);
}

export function clearCoordTasks(state: FederatedCoordState): FederatedCoordState {
  return { ...state, tasks: new Map() };
}

export function getFederatedCoordReport(state: FederatedCoordState): { tasks: number; completed: number; failed: number; devices: Record<string, string> } {
  const devices: Record<string, string> = {};
  for (const [id, s] of state.deviceStates.entries()) devices[id] = s;
  return { tasks: state.tasks.size, completed: state.totalCoordinated, failed: getCoordTasksByStatus(state, 'failed').length, devices };
}

/**
 * V192 AgentHotReloader - Direction B Agent Forge (Iter 8/30)
 * thunderbolt: Hot-reload agent changes without restart
 */
export interface ReloadEvent {
  agentId: string;
  timestamp: number;
  oldVersion: string;
  newVersion: string;
  success: boolean;
  error?: string;
  duration: number;
}

export interface ReloaderState {
  activeReloads: Map<string, { startedAt: number; oldVersion: string }>;
  history: ReloadEvent[];
  totalReloads: number;
  failures: number;
}

export function createReloaderState(): ReloaderState {
  return { activeReloads: new Map(), history: [], totalReloads: 0, failures: 0 };
}

export function startReload(state: ReloaderState, agentId: string, oldVersion: string): ReloaderState {
  return { ...state, activeReloads: new Map(state.activeReloads).set(agentId, { startedAt: Date.now(), oldVersion }) };
}

export function completeReload(state: ReloaderState, agentId: string, newVersion: string, success: boolean, error?: string): ReloaderState {
  const active = state.activeReloads.get(agentId);
  if (!active) return state;
  const event: ReloadEvent = {
    agentId,
    timestamp: Date.now(),
    oldVersion: active.oldVersion,
    newVersion,
    success,
    error,
    duration: Date.now() - active.startedAt,
  };
  const activeReloads = new Map(state.activeReloads);
  activeReloads.delete(agentId);
  return {
    ...state,
    activeReloads,
    history: [...state.history, event].slice(-100),
    totalReloads: state.totalReloads + 1,
    failures: success ? state.failures : state.failures + 1,
  };
}

export function cancelReload(state: ReloaderState, agentId: string): ReloaderState {
  const activeReloads = new Map(state.activeReloads);
  activeReloads.delete(agentId);
  return { ...state, activeReloads };
}

export function getActiveReloads(state: ReloaderState): string[] {
  return Array.from(state.activeReloads.keys());
}

export function getReloadHistory(state: ReloaderState, agentId?: string): ReloadEvent[] {
  return agentId ? state.history.filter(h => h.agentId === agentId) : state.history;
}

export function isReloading(state: ReloaderState, agentId: string): boolean {
  return state.activeReloads.has(agentId);
}

export function clearHistory(state: ReloaderState): ReloaderState {
  return { ...state, history: [] };
}

export function getReloaderReport(state: ReloaderState): { totalReloads: number; failures: number; active: number; successRate: number } {
  return { totalReloads: state.totalReloads, failures: state.failures, active: state.activeReloads.size, successRate: state.totalReloads > 0 ? (state.totalReloads - state.failures) / state.totalReloads : 0 };
}

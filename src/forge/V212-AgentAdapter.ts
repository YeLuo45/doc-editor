/**
 * V212 AgentAdapter - Direction B Agent Forge (Iter 28/30)
 * generic-agent: Adapt agent behavior to user context
 */
export type AdaptationTrigger = 'user_input' | 'task_change' | 'time_elapsed' | 'manual';

export interface Adaptation {
  id: string;
  agentId: string;
  trigger: AdaptationTrigger;
  beforeConfig: Record<string, any>;
  afterConfig: Record<string, any>;
  reason: string;
  effectiveness?: number;
  timestamp: number;
}

export interface AdapterState {
  adaptations: Map<string, Adaptation>;
  agentConfig: Map<string, Record<string, any>>;
  nextId: number;
}

export function createAdapterState(): AdapterState {
  return { adaptations: new Map(), agentConfig: new Map(), nextId: 1 };
}

export function setAgentConfig(state: AdapterState, agentId: string, config: Record<string, any>): AdapterState {
  return { ...state, agentConfig: new Map(state.agentConfig).set(agentId, { ...config }) };
}

export function adaptAgent(state: AdapterState, agentId: string, trigger: AdaptationTrigger, newConfig: Record<string, any>, reason: string): AdapterState {
  const before = state.agentConfig.get(agentId) || {};
  const id = `adapt-${state.nextId}`;
  const adaptation: Adaptation = { id, agentId, trigger, beforeConfig: { ...before }, afterConfig: { ...newConfig }, reason, timestamp: Date.now() };
  return {
    ...state,
    agentConfig: new Map(state.agentConfig).set(agentId, { ...newConfig }),
    adaptations: new Map(state.adaptations).set(id, adaptation),
    nextId: state.nextId + 1,
  };
}

export function recordEffectiveness(state: AdapterState, adaptationId: string, effectiveness: number): AdapterState {
  const a = state.adaptations.get(adaptationId);
  if (!a) return state;
  return { ...state, adaptations: new Map(state.adaptations).set(adaptationId, { ...a, effectiveness }) };
}

export function revertAdaptation(state: AdapterState, adaptationId: string): AdapterState {
  const a = state.adaptations.get(adaptationId);
  if (!a) return state;
  return { ...state, agentConfig: new Map(state.agentConfig).set(a.agentId, { ...a.beforeConfig }), adaptations: new Map(state.adaptations) };
}

export function getAdaptationsForAgent(state: AdapterState, agentId: string): Adaptation[] {
  return Array.from(state.adaptations.values()).filter(a => a.agentId === agentId);
}

export function getConfig(state: AdapterState, agentId: string): Record<string, any> {
  return state.agentConfig.get(agentId) || {};
}

export function clearAdaptations(state: AdapterState): AdapterState {
  return { ...state, adaptations: new Map() };
}

export function getAdapterReport(state: AdapterState): { adaptations: number; agents: number; avgEffectiveness: number } {
  const all = Array.from(state.adaptations.values()).filter(a => a.effectiveness !== undefined);
  const avg = all.length > 0 ? all.reduce((s, a) => s + a.effectiveness!, 0) / all.length : 0;
  return { adaptations: state.adaptations.size, agents: state.agentConfig.size, avgEffectiveness: avg };
}

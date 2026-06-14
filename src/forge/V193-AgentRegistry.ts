/**
 * V193 AgentRegistry - Direction B Agent Forge (Iter 9/30)
 * nanobot: Agent definition registry (register/list/invoke)
 */
export type AgentStatus = 'active' | 'inactive' | 'deprecated' | 'testing';

export interface RegisteredAgent {
  id: string;
  name: string;
  version: string;
  status: AgentStatus;
  capabilities: string[];
  registeredAt: number;
  invocationCount: number;
  lastInvoked: number;
}

export interface RegistryState {
  agents: Map<string, RegisteredAgent>;
  callLog: Array<{ agentId: string; timestamp: number; success: boolean; durationMs: number }>;
}

export function createAgentRegistryState(): RegistryState {
  return { agents: new Map(), callLog: [] };
}

export function registerAgent(state: RegistryState, agent: Omit<RegisteredAgent, 'registeredAt' | 'invocationCount' | 'lastInvoked'>): RegistryState {
  const fullAgent: RegisteredAgent = { ...agent, registeredAt: Date.now(), invocationCount: 0, lastInvoked: 0 };
  return { ...state, agents: new Map(state.agents).set(agent.id, fullAgent) };
}

export function unregisterAgent(state: RegistryState, id: string): RegistryState {
  const agents = new Map(state.agents);
  agents.delete(id);
  return { ...state, agents };
}

export function setAgentStatus(state: RegistryState, id: string, status: AgentStatus): RegistryState {
  const agent = state.agents.get(id);
  if (!agent) return state;
  return { ...state, agents: new Map(state.agents).set(id, { ...agent, status }) };
}

export function invokeAgent(state: RegistryState, id: string, success: boolean, durationMs: number): RegistryState {
  const agent = state.agents.get(id);
  if (!agent) return state;
  const updated: RegisteredAgent = { ...agent, invocationCount: agent.invocationCount + 1, lastInvoked: Date.now() };
  return {
    ...state,
    agents: new Map(state.agents).set(id, updated),
    callLog: [...state.callLog, { agentId: id, timestamp: Date.now(), success, durationMs }].slice(-500),
  };
}

export function findByCapability(state: RegistryState, capability: string): RegisteredAgent[] {
  return Array.from(state.agents.values()).filter(a => a.capabilities.includes(capability));
}

export function findByStatus(state: RegistryState, status: AgentStatus): RegisteredAgent[] {
  return Array.from(state.agents.values()).filter(a => a.status === status);
}

export function listAllAgents(state: RegistryState): RegisteredAgent[] {
  return Array.from(state.agents.values());
}

export function getAgent(state: RegistryState, id: string): RegisteredAgent | undefined {
  return state.agents.get(id);
}

export function clearRegistry(state: RegistryState): RegistryState {
  return createAgentRegistryState();
}

export function getRegistryReport(state: RegistryState): { total: number; byStatus: Record<string, number>; totalCalls: number } {
  const byStatus: Record<string, number> = {};
  for (const a of state.agents.values()) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  return { total: state.agents.size, byStatus, totalCalls: state.callLog.length };
}

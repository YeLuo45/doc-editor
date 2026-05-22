// AgentState - Type definitions for agent state management

export type AgentStatus = 'idle' | 'working' | 'waiting_feedback' | 'completed';

export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  lastUpdate: number;
}

export const AGENT_IDS = {
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
  RESEARCHER: 'researcher',
} as const;

export type AgentId = typeof AGENT_IDS[keyof typeof AGENT_IDS];

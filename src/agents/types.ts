// Agent类型定义
export type AgentRole = 'planner' | 'editor' | 'reviewer';

export interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId | 'broadcast';
  type: 'request' | 'response' | 'status' | 'error';
  payload: any;
  timestamp: number;
}

export type AgentId = string;

export interface AgentConfig {
  id: AgentId;
  role: AgentRole;
  prompt_template: string;
  max_turns: number;
}

export interface WorkflowStage {
  id: string;
  stage: string;
  agents: AgentId[];
  parallel: boolean;
  output_key: string;
}

export interface Workflow {
  name: string;
  version: string;
  agents: AgentConfig[];
  workflow: WorkflowStage[];
}

export interface WorkflowNode {
  id: string;
  stage: string;
  agents: AgentId[];
  parallel: boolean;
  output_key: string;
}

export interface WorkflowResult {
  success: boolean;
  stages_completed: number;
  final_output: string;
}

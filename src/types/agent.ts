// Agent Type Definitions for doc-editor V2 Multi-Agent System

export enum AgentType {
  EDITOR = 'editor',
  REVIEWER = 'reviewer',
  RESEARCHER = 'researcher',
  MANAGER = 'manager'
}

export enum MessageType {
  EDIT_REQUEST = 'EDIT_REQUEST',
  REVIEW_REQUEST = 'REVIEW_REQUEST',
  RESEARCH_REQUEST = 'RESEARCH_REQUEST',
  ORCHESTRATE = 'ORCHESTRATE',
  APPROVAL_REQUEST = 'APPROVAL_REQUEST',
  APPROVAL_RESPONSE = 'APPROVAL_RESPONSE',
  ERROR = 'ERROR'
}

export enum DocStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  REVISED = 'REVISED',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED'
}

export interface AgentMessage {
  id: string;
  sender: AgentType;
  receiver: AgentType | 'broadcast';
  type: MessageType;
  payload: any;
  timestamp: number;
  requiresApproval?: boolean;
  conversationId?: string;
  parentId?: string;
  retryCount?: number;
  // Chat-style fields for context messages
  role?: 'user' | 'assistant' | 'system';
  content?: string;
}

export interface AgentContext {
  conversationId: string;
  docId: string;
  messages: AgentMessage[];
  currentStatus: DocStatus;
  metadata: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  agentType: AgentType[];
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface ReviewResult {
  score: number; // 0-1
  issues: string[];
  suggestions: string[];
}

export interface StateTransition {
  from: DocStatus;
  event: string;
  to: DocStatus;
  action?: string;
}

export type Handler = (message: AgentMessage) => Promise<void>;
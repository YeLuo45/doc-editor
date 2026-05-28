// ============================================================
// Agent Types - Swarm Coordination v13
// ============================================================

export type AgentRole = 'planner' | 'editor' | 'reviewer';

// Core identity
export type AgentId = string;

export interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId | 'broadcast';
  type: 'request' | 'response' | 'status' | 'error' | 'event';
  payload: unknown;
  timestamp: number;
  channel?: string;
  replyTo?: string;
}

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

// ============================================================
// Swarm Topology Types
// ============================================================

export type SwarmTopology = 'hierarchical' | 'mesh' | 'hybrid';

export interface AgentManifest {
  id: AgentId;
  name: string;
  role: AgentRole;
  capabilities: string[];
  version: string;
  metadata?: Record<string, unknown>;
  topology?: SwarmTopology;
}

export interface AgentRegistration {
  manifest: AgentManifest;
  registeredAt: number;
  lastSeen: number;
  status: 'active' | 'inactive' | 'busy';
  peerId?: string;
}

export interface SwarmConfig {
  topology: SwarmTopology;
  maxAgents: number;
  communicationTimeout: number;
  heartbeatInterval: number;
  reconnectAttempts: number;
}

// ============================================================
// MessageBus Types
// ============================================================

export type SubscriptionId = string;

export interface Subscription {
  id: SubscriptionId;
  agentId: AgentId;
  channel: string;
  pattern?: RegExp;
  callback: (message: AgentMessage) => void | Promise<void>;
  createdAt: number;
}

export interface PubSubMessage {
  channel: string;
  message: AgentMessage;
  publishedAt: number;
}

export interface MessageBusConfig {
  maxQueueSize: number;
  deliveryGuarantee: 'at-least-once' | 'at-most-once' | 'exactly-once';
  wildcardSupport: boolean;
  maxSubscribersPerChannel: number;
}

// ============================================================
// PhaseWorkflow Types (DAG-based)
// ============================================================

export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface Phase {
  id: string;
  name: string;
  dependsOn: string[];
  agents: AgentId[];
  parallel: boolean;
  timeout?: number;
  retryCount?: number;
}

export interface PhaseResult {
  phaseId: string;
  success: boolean;
  output: unknown;
  duration: number;
  attempts: number;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  phases: Phase[];
  status: PhaseStatus;
  startedAt: number;
  completedAt?: number;
  results: Map<string, PhaseResult>;
  currentPhase?: string;
}

// ============================================================
// Federation Gateway Types (mTLS + ed25519)
// ============================================================

export interface FederatedAgent {
  agentId: AgentId;
  peerId: string;
  publicKey: string;
  trusted: boolean;
  federationId: string;
}

export interface FederationConfig {
  federationId: string;
 mtlsEnabled: boolean;
  ed25519Enabled: boolean;
  trustedAgents: string[];
  connectionTimeout: number;
  maxConnections: number;
}

export interface HandshakeResult {
  success: boolean;
  peerId?: string;
  sharedSecret?: string;
  error?: string;
}

export interface SecureMessage extends AgentMessage {
  signature?: string;
  encrypted?: boolean;
  nonce?: string;
}

// ============================================================
// SwarmOrchestrator Types
// ============================================================

export interface OrchestratorEvent {
  type: 'agent_joined' | 'agent_left' | 'phase_complete' | 'workflow_complete' | 'error';
  timestamp: number;
  data: unknown;
}

export interface SwarmMetrics {
  totalAgents: number;
  activeAgents: number;
  messagesProcessed: number;
  averageLatency: number;
  phasesCompleted: number;
}

export interface OrchestratorConfig {
  topology: SwarmTopology;
  phaseWorkflow: boolean;
  federationEnabled: boolean;
  autoScale: boolean;
  maxConcurrentPhases: number;
}

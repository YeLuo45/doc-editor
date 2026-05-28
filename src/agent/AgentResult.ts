/**
 * AgentResult.ts - Result interface for agent task execution
 * Contains the output, metrics, and artifacts from agent processing
 */

export type ResultStatus = 'success' | 'failure' | 'partial' | 'cancelled';

export interface ResultMetrics {
  durationMs: number;
  tokensUsed?: number;
  memoryUsedMb?: number;
  cacheHits?: number;
  cacheMisses?: number;
  [key: string]: unknown;
}

export interface ResultArtifact {
  id: string;
  type: string;
  name: string;
  path?: string;
  content: unknown;
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  taskId: string;
  status: ResultStatus;
  output: unknown;
  error?: string;
  metrics: ResultMetrics;
  artifacts: ResultArtifact[];
  agentId: string;
  agentName: string;
  completedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateResultOptions {
  taskId: string;
  status: ResultStatus;
  output: unknown;
  error?: string;
  agentId: string;
  agentName: string;
  metrics?: Partial<ResultMetrics>;
  artifacts?: ResultArtifact[];
  metadata?: Record<string, unknown>;
}

export function createResult(options: CreateResultOptions): AgentResult {
  const now = new Date();
  return {
    taskId: options.taskId,
    status: options.status,
    output: options.output,
    error: options.error,
    metrics: {
      durationMs: 0,
      ...options.metrics,
    },
    artifacts: options.artifacts || [],
    agentId: options.agentId,
    agentName: options.agentName,
    completedAt: now,
    metadata: options.metadata,
  };
}

export function isSuccessful(result: AgentResult): boolean {
  return result.status === 'success';
}

export function isFailed(result: AgentResult): boolean {
  return result.status === 'failure';
}

export function mergeResults(results: AgentResult[]): AgentResult {
  const totalDuration = results.reduce((sum, r) => sum + r.metrics.durationMs, 0);
  const allArtifacts = results.flatMap((r) => r.artifacts);
  const hasFailure = results.some((r) => r.status === 'failure');

  return {
    taskId: results[0]?.taskId || 'merged',
    status: hasFailure ? 'failure' : 'success',
    output: results.map((r) => r.output),
    metrics: {
      durationMs: totalDuration,
      totalTasks: results.length,
    },
    artifacts: allArtifacts,
    agentId: 'coordinator',
    agentName: 'Coordinator',
    completedAt: new Date(),
  };
}
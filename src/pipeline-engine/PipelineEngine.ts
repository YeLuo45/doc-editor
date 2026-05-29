/**
 * PipelineEngine.ts - V92 Pipeline Engine Core
 * Handles pipeline creation, management, and execution coordination
 */

export type PipelineConfig = {
  maxConcurrent: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
};

export type PipelineStage = {
  id: string;
  name: string;
  handler: () => Promise<void>;
  dependencies?: string[];
};

export type Pipeline = {
  id: string;
  name: string;
  stages: PipelineStage[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  createdAt: number;
  stats: PipelineStats;
};

export type PipelineStats = {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecutedAt: number | null;
};

export type PipelineEngineSnapshot = {
  metrics: { totalPipelines: number; activePipelines: number; totalExecutions: number; successRate: number };
  timestamp: number;
};

export class PipelineEngine {
  config: PipelineConfig;
  private pipelines: Map<string, Pipeline> = new Map();
  private executionCount: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;

  constructor(config: PipelineConfig) {
    this.config = { ...config };
  }

  create(id: string, name: string, stages: PipelineStage[] = []): Pipeline {
    const pipeline: Pipeline = {
      id, name, stages, status: 'idle', createdAt: Date.now(),
      stats: { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, averageDuration: 0, lastExecutedAt: null },
    };
    this.pipelines.set(id, pipeline);
    return pipeline;
  }

  add(pipelineId: string, stage: PipelineStage): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    pipeline.stages.push(stage);
    return true;
  }

  async execute(pipelineId: string, context: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);
    pipeline.status = 'running';
    const startTime = Date.now();
    const result = { ...context };

    try {
      for (const stage of pipeline.stages) {
        if (pipeline.status === 'paused') await this.waitForResume(pipelineId);
        await stage.handler();
      }
      pipeline.status = 'completed';
      pipeline.stats.successfulExecutions++;
      this.successCount++;
    } catch (err) {
      pipeline.status = 'failed';
      pipeline.stats.failedExecutions++;
      this.failureCount++;
      throw err;
    } finally {
      pipeline.stats.totalExecutions++;
      pipeline.stats.lastExecutedAt = Date.now();
      pipeline.stats.averageDuration =
        (pipeline.stats.averageDuration * (pipeline.stats.totalExecutions - 1) + (Date.now() - startTime)) /
        pipeline.stats.totalExecutions;
      this.executionCount++;
    }
    return result;
  }

  private async waitForResume(pipelineId: string): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline || pipeline.status !== 'paused') { resolve(); return; }
        setTimeout(check, 100);
      };
      check();
    });
  }

  getPipeline(id: string): Pipeline | undefined { return this.pipelines.get(id); }

  getStats(): PipelineStats & { successRate: number } {
    const total = this.successCount + this.failureCount;
    return { totalExecutions: this.executionCount, successfulExecutions: this.successCount, failedExecutions: this.failureCount, averageDuration: 0, lastExecutedAt: null, successRate: total > 0 ? this.successCount / total : 0 };
  }

  getSnapshot(): PipelineEngineSnapshot {
    let activeCount = 0;
    this.pipelines.forEach((p) => { if (p.status === 'running' || p.status === 'paused') activeCount++; });
    const total = this.successCount + this.failureCount;
    return { metrics: { totalPipelines: this.pipelines.size, activePipelines: activeCount, totalExecutions: this.executionCount, successRate: total > 0 ? this.successCount / total : 0 }, timestamp: Date.now() };
  }

  reset(): void { this.pipelines.clear(); this.executionCount = 0; this.successCount = 0; this.failureCount = 0; }

  getReport(): string {
    const s = this.getSnapshot();
    return [`=== Pipeline Engine Report ===`, `Total Pipelines: ${s.metrics.totalPipelines}`, `Active Pipelines: ${s.metrics.activePipelines}`, `Total Executions: ${s.metrics.totalExecutions}`, `Success Rate: ${(s.metrics.successRate * 100).toFixed(2)}%`, `Timestamp: ${new Date(s.timestamp).toISOString()}`].join('\n');
  }

  exportMetrics(): { version: string } & PipelineEngineSnapshot['metrics'] {
    return { version: 'V92', ...this.getSnapshot().metrics };
  }
}
/**
 * IntegrationPipeline.ts - Pipeline Orchestration
 * V30 Integration Hub for doc-editor
 */

export interface PipelineStep {
  name: string;
  handler: (input: unknown) => Promise<unknown>;
  timeout?: number;
}

export interface PipelineExecution {
  stepName: string;
  success: boolean;
  duration: number;
  output?: unknown;
  error?: string;
}

export interface PipelineResult {
  success: boolean;
  executions: PipelineExecution[];
  totalDuration: number;
  output?: unknown;
}

export type PipeTransformer = (data: unknown) => Promise<unknown>;

export class IntegrationPipeline {
  private pipelines: Map<string, PipelineStep[]> = new Map();
  private executionHistory: PipelineExecution[] = [];
  private snapshots: Record<string, unknown>[] = [];
  private metrics = { executed: 0, succeeded: 0, failed: 0 };

  createPipeline(name: string, steps: PipelineStep[]): void {
    if (this.pipelines.has(name)) {
      throw new Error(`Pipeline ${name} already exists`);
    }
    this.pipelines.set(name, [...steps]);
  }

  getPipeline(name: string): PipelineStep[] | undefined {
    return this.pipelines.get(name);
  }

  listPipelines(): string[] {
    return Array.from(this.pipelines.keys());
  }

  async execute(
    name: string,
    initialInput?: unknown
  ): Promise<PipelineResult> {
    const steps = this.pipelines.get(name);
    if (!steps) {
      throw new Error(`Pipeline ${name} not found`);
    }

    this.metrics.executed++;
    const start = Date.now();
    const executions: PipelineExecution[] = [];
    let currentInput = initialInput;

    for (const step of steps) {
      const stepStart = Date.now();
      try {
        const timeout = step.timeout ?? 30000;
        const result = await Promise.race([
          step.handler(currentInput),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Step ${step.name} timed out`)), timeout)
          ),
        ]);
        executions.push({
          stepName: step.name,
          success: true,
          duration: Date.now() - stepStart,
          output: result,
        });
        currentInput = result;
      } catch (error) {
        executions.push({
          stepName: step.name,
          success: false,
          duration: Date.now() - stepStart,
          error: String(error),
        });
        this.metrics.failed++;
        return {
          success: false,
          executions,
          totalDuration: Date.now() - start,
          output: currentInput,
        };
      }
    }

    this.metrics.succeeded++;
    return {
      success: true,
      executions,
      totalDuration: Date.now() - start,
      output: currentInput,
    };
  }

  async pipe(data: unknown, transformers: PipeTransformer[]): Promise<unknown> {
    let result: unknown = data;
    for (const transformer of transformers) {
      result = await transformer(result);
    }
    return result;
  }

  getExecutionHistory(): PipelineExecution[] {
    return [...this.executionHistory];
  }

  clearHistory(): void {
    this.executionHistory = [];
  }

  removePipeline(name: string): boolean {
    return this.pipelines.delete(name);
  }

  getSnapshot(): Record<string, unknown> {
    const snapshot = {
      pipelineCount: this.pipelines.size,
      pipelines: this.listPipelines(),
      metrics: { ...this.metrics },
      historySize: this.executionHistory.length,
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  reset(): void {
    this.pipelines.clear();
    this.executionHistory = [];
    this.snapshots = [];
    this.metrics = { executed: 0, succeeded: 0, failed: 0 };
  }

  getReport(): Record<string, unknown> {
    return {
      pipelineCount: this.pipelines.size,
      totalExecuted: this.metrics.executed,
      succeeded: this.metrics.succeeded,
      failed: this.metrics.failed,
      successRate:
        this.metrics.executed > 0
          ? (this.metrics.succeeded / this.metrics.executed) * 100
          : 0,
    };
  }

  exportMetrics(): Record<string, unknown> {
    return {
      ...this.metrics,
      pipelines: this.listPipelines(),
      pipelineCount: this.pipelines.size,
    };
  }
}

export default IntegrationPipeline;
/**
 * V66 Data Pipeline - PipelineRunner
 * Run pipelines with run/stop/pause/resume/getStatus
 */

import { CompiledPipeline } from './PipelineBuilder';

export type RunnerConfig = {
  timeout?: number;
  concurrency?: number;
  onStageComplete?: (stageId: string, result: unknown) => void;
};

export type PipelineStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';

export type ExecutionResult = {
  pipelineId: string;
  status: PipelineStatus;
  results: unknown[];
  errors: Error[];
  startTime: number;
  endTime?: number;
};

export class PipelineRunner {
  config: RunnerConfig;
  private currentPipeline: CompiledPipeline | null = null;
  private status: PipelineStatus = 'idle';
  private executionResult: ExecutionResult | null = null;
  private pauseRequested = false;
  private abortRequested = false;

  constructor(config: RunnerConfig = {}) {
    this.config = config;
  }

  async run(pipeline: CompiledPipeline, input: unknown): Promise<ExecutionResult> {
    if (this.status === 'running') {
      throw new Error('Pipeline already running');
    }

    this.currentPipeline = pipeline;
    this.status = 'running';
    this.pauseRequested = false;
    this.abortRequested = false;
    this.executionResult = {
      pipelineId: pipeline.id,
      status: 'running',
      results: [],
      errors: [],
      startTime: Date.now(),
    };

    try {
      for (const stage of pipeline.stages) {
        if (this.abortRequested) {
          this.status = 'stopped';
          break;
        }

        while (this.pauseRequested && !this.abortRequested) {
          await this.sleep(100);
        }

        if (this.abortRequested) break;

        try {
          const result = await this.executeStage(stage, input);
          this.executionResult.results.push(result);
          this.config.onStageComplete?.(stage.id, result);
        } catch (error) {
          this.executionResult.errors.push(error as Error);
          if (pipeline.config.onError === 'stop') {
            this.status = 'failed';
            break;
          }
        }
      }

      this.status = this.abortRequested ? 'stopped' :
                   this.executionResult.errors.length > 0 ? 'failed' : 'completed';
    } catch (error) {
      this.status = 'failed';
      this.executionResult.errors.push(error as Error);
    }

    this.executionResult.endTime = Date.now();
    this.executionResult.status = this.status;
    return this.executionResult;
  }

  private async executeStage(stage: { id: string; handler: (input: unknown) => unknown; timeout?: number }, input: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = stage.timeout || this.config.timeout || 5000;
      const timer = setTimeout(() => reject(new Error(`Stage ${stage.id} timed out`)), timeout);

      try {
        const result = stage.handler(input);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  stop(): void {
    this.abortRequested = true;
    this.status = 'stopped';
  }

  pause(): void {
    if (this.status === 'running') {
      this.pauseRequested = true;
      this.status = 'paused';
    }
  }

  resume(): void {
    if (this.status === 'paused') {
      this.pauseRequested = false;
      this.status = 'running';
    }
  }

  getStatus(): PipelineStatus {
    return this.status;
  }

  getSnapshot(): { metrics: { status: PipelineStatus; resultCount: number; errorCount: number } } {
    return {
      metrics: {
        status: this.status,
        resultCount: this.executionResult?.results.length || 0,
        errorCount: this.executionResult?.errors.length || 0,
      },
    };
  }

  reset(): void {
    this.currentPipeline = null;
    this.status = 'idle';
    this.executionResult = null;
    this.pauseRequested = false;
    this.abortRequested = false;
  }

  getReport(): string {
    return `PipelineRunner Report
========================
Status: ${this.status}
Pipeline: ${this.currentPipeline?.id || 'none'}
Results: ${this.executionResult?.results.length || 0}
Errors: ${this.executionResult?.errors.length || 0}`;
  }

  exportMetrics(): { version: string; status: PipelineStatus; pipelineId: string | null } {
    return {
      version: 'v66',
      status: this.status,
      pipelineId: this.currentPipeline?.id || null,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default PipelineRunner;
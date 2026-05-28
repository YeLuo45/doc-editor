// ============================================================
// ContentPipeline - Sequential content processing pipeline
// ============================================================

import { PipelineStage, type StageId } from './PipelineStage.js';

export type PipelineStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface PipelineConfig {
  name: string;
  description?: string;
  enableFeedbackLoop?: boolean;
  maxIterations?: number;
  continueOnError?: boolean;
  trackMetrics?: boolean;
}

export interface PipelineMetrics {
  totalDuration: number;
  stageMetrics: Map<StageId, { count: number; totalDuration: number; failures: number }>;
  iterations: number;
  feedbackLoopCount: number;
}

export interface PipelineResult {
  success: boolean;
  output: unknown;
  stagesExecuted: number;
  stagesSkipped: number;
  iterations: number;
  duration: number;
  errors: string[];
  metrics: PipelineMetrics;
}

export interface PipelineEvent {
  type: 'stage_start' | 'stage_complete' | 'stage_skip' | 'stage_error' | 'pipeline_complete' | 'feedback_loop';
  stageId?: StageId;
  timestamp: number;
  data?: unknown;
}

interface PipelineConfigInternal {
  enableFeedbackLoop: boolean;
  maxIterations: number;
  continueOnError: boolean;
  trackMetrics: boolean;
}

export class ContentPipeline<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description?: string;

  private stages: Array<PipelineStage<TInput, TOutput>> = [];
  private status: PipelineStatus = 'idle';
  private config: PipelineConfigInternal;

  getConfig(): PipelineConfigInternal {
    return this.config;
  }
  private metrics: PipelineMetrics;
  private eventListeners: Map<string, Array<(event: PipelineEvent) => void>> = new Map();
  private iteration = 0;

  constructor(config: PipelineConfig) {
    this.name = config.name;
    this.description = config.description;
    this.config = {
      enableFeedbackLoop: config.enableFeedbackLoop ?? false,
      maxIterations: config.maxIterations ?? 10,
      continueOnError: config.continueOnError ?? true,
      trackMetrics: config.trackMetrics ?? true,
    };
    this.metrics = {
      totalDuration: 0,
      stageMetrics: new Map(),
      iterations: 0,
      feedbackLoopCount: 0,
    };
  }

  addStage(stage: PipelineStage<TInput, TOutput>): this {
    if (this.status === 'running') {
      throw new Error('Cannot add stages while pipeline is running');
    }
    this.stages.push(stage);
    return this;
  }

  addStageAt(stage: PipelineStage<TInput, TOutput>, index: number): this {
    if (this.status === 'running') {
      throw new Error('Cannot add stages while pipeline is running');
    }
    if (index < 0 || index > this.stages.length) {
      throw new Error(`Invalid stage index: ${index}`);
    }
    this.stages.splice(index, 0, stage);
    return this;
  }

  removeStage(stageId: StageId): boolean {
    if (this.status === 'running') {
      throw new Error('Cannot remove stages while pipeline is running');
    }
    const index = this.stages.findIndex(s => s.id === stageId);
    if (index === -1) return false;
    this.stages.splice(index, 1);
    return true;
  }

  getStage(stageId: StageId): PipelineStage<TInput, TOutput> | undefined {
    return this.stages.find(s => s.id === stageId);
  }

  getAllStages(): Array<PipelineStage<TInput, TOutput>> {
    return [...this.stages];
  }

  hasStage(stageId: StageId): boolean {
    return this.stages.some(s => s.id === stageId);
  }

  async execute(input: TInput): Promise<PipelineResult> {
    if (this.stages.length === 0) {
      return {
        success: true,
        output: input,
        stagesExecuted: 0,
        stagesSkipped: 0,
        iterations: 0,
        duration: 0,
        errors: [],
        metrics: this.metrics,
      };
    }

    this.status = 'running';
    this.iteration = 0;
    const startTime = Date.now();
    const errors: string[] = [];
    let stagesExecuted = 0;
    let stagesSkipped = 0;

    try {
      let currentInput = input;
      let feedbackOutput: unknown = null;

      while (this.iteration < this.config.maxIterations) {
        this.iteration++;

        for (const stage of this.stages) {
          this.emit({
            type: 'stage_start',
            stageId: stage.id,
            timestamp: Date.now(),
          });

          const result = await stage.execute(currentInput);

          if (result.skipped) {
            stagesSkipped++;
            this.emit({
              type: 'stage_skip',
              stageId: stage.id,
              timestamp: Date.now(),
            });
            continue;
          }

          if (!result.success) {
            errors.push(`Stage ${stage.name} failed: ${result.error}`);
            this.emit({
              type: 'stage_error',
              stageId: stage.id,
              timestamp: Date.now(),
              data: { error: result.error },
            });

            if (!this.config.continueOnError) {
              this.status = 'failed';
              break;
            }
            continue;
          }

          stagesExecuted++;
          currentInput = result.output as TInput;

          if (this.config.trackMetrics) {
            const existing = this.metrics.stageMetrics.get(stage.id) || {
              count: 0,
              totalDuration: 0,
              failures: 0,
            };
            this.metrics.stageMetrics.set(stage.id, {
              count: existing.count + 1,
              totalDuration: existing.totalDuration + result.duration,
              failures: existing.failures,
            });
          }

          this.emit({
            type: 'stage_complete',
            stageId: stage.id,
            timestamp: Date.now(),
            data: { output: result.output, duration: result.duration },
          });

          if (this.config.enableFeedbackLoop && feedbackOutput !== null) {
            const needsFeedback = this.checkFeedbackCondition(feedbackOutput, result.output);
            if (needsFeedback) {
              this.metrics.feedbackLoopCount++;
              this.emit({
                type: 'feedback_loop',
                stageId: stage.id,
                timestamp: Date.now(),
              });
              currentInput = this.applyFeedback(feedbackOutput, result.output) as TInput;
            }
          }

          feedbackOutput = result.output;
        }

        if (this.shouldTerminate()) {
          break;
        }
      }

      this.metrics.iterations = this.iteration;
      this.metrics.totalDuration = Date.now() - startTime;
      this.status = errors.length > 0 && !this.config.continueOnError ? 'failed' : 'completed';

      this.emit({
        type: 'pipeline_complete',
        timestamp: Date.now(),
        data: { success: errors.length === 0, output: currentInput },
      });

      return {
        success: errors.length === 0,
        output: currentInput,
        stagesExecuted,
        stagesSkipped,
        iterations: this.iteration,
        duration: Date.now() - startTime,
        errors,
        metrics: this.metrics,
      };
    } catch (error) {
      this.status = 'failed';
      return {
        success: false,
        output: input,
        stagesExecuted,
        stagesSkipped,
        iterations: this.iteration,
        duration: Date.now() - startTime,
        errors: [...errors, error instanceof Error ? error.message : String(error)],
        metrics: this.metrics,
      };
    }
  }

  private checkFeedbackCondition(_previous: unknown, current: unknown): boolean {
    if (typeof current === 'string' && typeof _previous === 'string') {
      const diff = Math.abs(current.length - _previous.length);
      return diff > current.length * 0.1;
    }
    return false;
  }

  private applyFeedback(_previous: unknown, current: unknown): unknown {
    if (typeof current === 'string' && typeof _previous === 'string') {
      return current + '\n[Feedback applied]';
    }
    return current;
  }

  private shouldTerminate(): boolean {
    return this.iteration >= 1 && this.status !== 'failed';
  }

  on(event: string, listener: (event: PipelineEvent) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  off(event: string, listener: (event: PipelineEvent) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    const filtered = listeners.filter(l => l !== listener);
    this.eventListeners.set(event, filtered);
  }

  private emit(event: PipelineEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error(`Error in pipeline event listener:`, e);
      }
    }

    const wildcardListeners = this.eventListeners.get('*') || [];
    for (const listener of wildcardListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error(`Error in wildcard event listener:`, e);
      }
    }
  }

  getStatus(): PipelineStatus {
    return this.status;
  }

  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.status = 'idle';
    this.iteration = 0;
    this.metrics = {
      totalDuration: 0,
      stageMetrics: new Map(),
      iterations: 0,
      feedbackLoopCount: 0,
    };
    for (const stage of this.stages) {
      stage.resetRetries();
    }
  }

  clone(): ContentPipeline<TInput, TOutput> {
    const cloned = new ContentPipeline<TInput, TOutput>({
      name: this.name,
      description: this.description,
      enableFeedbackLoop: this.config.enableFeedbackLoop,
      maxIterations: this.config.maxIterations,
      continueOnError: this.config.continueOnError,
      trackMetrics: this.config.trackMetrics,
    });

    for (const stage of this.stages) {
      cloned.addStage(stage);
    }

    return cloned;
  }
}

export function createContentPipeline(config: PipelineConfig): ContentPipeline {
  return new ContentPipeline(config);
}

export class ContentPipelineBuilder<TInput = unknown, TOutput = unknown> {
  private pipeline: ContentPipeline<TInput, TOutput>;

  constructor(name: string) {
    this.pipeline = new ContentPipeline<TInput, TOutput>({ name });
  }

  description(desc: string): this {
    this.pipeline = new ContentPipeline<TInput, TOutput>({
      name: this.pipeline.name,
      description: desc,
      enableFeedbackLoop: this.pipeline.getConfig().enableFeedbackLoop,
      maxIterations: this.pipeline.getConfig().maxIterations,
      continueOnError: this.pipeline.getConfig().continueOnError,
      trackMetrics: this.pipeline.getConfig().trackMetrics,
    });
    return this;
  }

  withStage(stage: PipelineStage<any, any>): this {
    this.pipeline.addStage(stage);
    return this;
  }

  withFeedbackLoop(enabled: boolean = true): this {
    this.pipeline = new ContentPipeline<TInput, TOutput>({
      name: this.pipeline.name,
      description: this.pipeline.description,
      enableFeedbackLoop: enabled,
      maxIterations: this.pipeline.getConfig().maxIterations,
      continueOnError: this.pipeline.getConfig().continueOnError,
      trackMetrics: this.pipeline.getConfig().trackMetrics,
    });
    return this;
  }

  withMaxIterations(max: number): this {
    this.pipeline = new ContentPipeline<TInput, TOutput>({
      name: this.pipeline.name,
      description: this.pipeline.description,
      enableFeedbackLoop: this.pipeline.getConfig().enableFeedbackLoop,
      maxIterations: max,
      continueOnError: this.pipeline.getConfig().continueOnError,
      trackMetrics: this.pipeline.getConfig().trackMetrics,
    });
    return this;
  }

  continueOnError(continueOnError: boolean = true): this {
    this.pipeline = new ContentPipeline<TInput, TOutput>({
      name: this.pipeline.name,
      description: this.pipeline.description,
      enableFeedbackLoop: this.pipeline.getConfig().enableFeedbackLoop,
      maxIterations: this.pipeline.getConfig().maxIterations,
      continueOnError,
      trackMetrics: this.pipeline.getConfig().trackMetrics,
    });
    return this;
  }

  build(): ContentPipeline<TInput, TOutput> {
    return this.pipeline;
  }
}

export function pipeline<TInput = unknown, TOutput = unknown>(name: string): ContentPipelineBuilder<TInput, TOutput> {
  return new ContentPipelineBuilder<TInput, TOutput>(name);
}
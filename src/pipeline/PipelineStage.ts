// ============================================================
// PipelineStage - Stage definition for ContentPipeline
// ============================================================

export type StageId = string;

export interface StageResult {
  success: boolean;
  output: unknown;
  error?: string;
  duration: number;
  skipped?: boolean;
}

export type ProcessorFn<TInput = unknown, TOutput = unknown> = (
  input: TInput
) => Promise<TOutput> | TOutput;

export interface PipelineStageConfig<TInput = unknown, TOutput = unknown> {
  id: StageId;
  name: string;
  description?: string;
  processor: ProcessorFn<TInput, TOutput>;
  transform?: (input: TInput) => TInput;
  rollback?: (input: TInput, error: Error) => Promise<void> | void;
  skipIf?: (input: TInput) => boolean;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  metadata?: Record<string, unknown>;
}

export class PipelineStage<TInput = unknown, TOutput = unknown> {
  readonly id: StageId;
  readonly name: string;
  readonly description?: string;
  readonly processor: ProcessorFn<TInput, TOutput>;
  readonly transform?: (input: TInput) => TInput;
  readonly rollback?: (input: TInput, error: Error) => Promise<void> | void;
  readonly skipIf?: (input: TInput) => boolean;
  readonly timeout?: number;
  readonly retryCount: number;
  readonly retryDelay: number;
  readonly metadata: Record<string, unknown>;

  private retriesRemaining: number = 0;

  constructor(config: PipelineStageConfig<TInput, TOutput>) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.processor = config.processor;
    this.transform = config.transform;
    this.rollback = config.rollback;
    this.skipIf = config.skipIf;
    this.timeout = config.timeout;
    this.retryCount = config.retryCount ?? 0;
    this.retryDelay = config.retryDelay ?? 1000;
    this.metadata = config.metadata ?? {};
    this.retriesRemaining = this.retryCount;
  }

  shouldSkip(input: TInput): boolean {
    return this.skipIf ? this.skipIf(input) : false;
  }

  async execute(input: TInput): Promise<StageResult> {
    if (this.shouldSkip(input)) {
      return {
        success: true,
        output: input,
        duration: 0,
        skipped: true,
      };
    }

    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const effectiveInput = this.transform ? this.transform(input) : input;
        const output = await this.executeWithTimeout(effectiveInput);

        return {
          success: true,
          output,
          duration: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retryCount) {
          await this.delay(this.retryDelay * (attempt + 1));
          this.retriesRemaining--;
        }
      }
    }

    return {
      success: false,
      output: input,
      error: lastError?.message ?? 'Unknown error',
      duration: Date.now() - startTime,
    };
  }

  private async executeWithTimeout(input: TInput): Promise<TOutput> {
    if (!this.timeout) {
      return this.processor(input);
    }

    return Promise.race([
      Promise.resolve(this.processor(input)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Stage ${this.name} timed out after ${this.timeout}ms`)), this.timeout)
      ),
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  resetRetries(): void {
    this.retriesRemaining = this.retryCount;
  }
}

export function createPipelineStage<TInput, TOutput>(
  config: PipelineStageConfig<TInput, TOutput>
): PipelineStage<TInput, TOutput> {
  return new PipelineStage(config);
}
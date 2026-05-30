/**
 * V111 Adapter Module
 * Core adapter interface for doc-editor plugin system
 */

export type AdapterConfig = {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  retryCount: number;
  metadata?: Record<string, unknown>;
};

export type AdaptResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  duration: number;
};

export type AdapterStats = {
  adaptCount: number;
  convertCount: number;
  errorCount: number;
  totalDuration: number;
  lastAdapt?: number;
  lastConvert?: number;
};

export abstract class Adapter {
  protected _config: AdapterConfig;
  protected _stats: AdapterStats;

  constructor(config: AdapterConfig) {
    this._config = { ...config };
    this._stats = {
      adaptCount: 0,
      convertCount: 0,
      errorCount: 0,
      totalDuration: 0,
    };
  }

  get config(): AdapterConfig {
    return { ...this._config };
  }

  getStats(): AdapterStats {
    return { ...this._stats };
  }

  async adapt<TInput, TOutput>(input: TInput): Promise<AdaptResult<TOutput>> {
    const startTime = Date.now();
    try {
      const result = await this.doAdapt<TInput, TOutput>(input);
      this._stats.adaptCount++;
      this._stats.lastAdapt = startTime;
      this._stats.totalDuration += Date.now() - startTime;
      return {
        success: true,
        data: result,
        timestamp: startTime,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this._stats.errorCount++;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: startTime,
        duration: Date.now() - startTime,
      };
    }
  }

  async convert<TInput, TOutput>(input: TInput): Promise<AdaptResult<TOutput>> {
    const startTime = Date.now();
    try {
      const result = await this.doConvert<TInput, TOutput>(input);
      this._stats.convertCount++;
      this._stats.lastConvert = startTime;
      this._stats.totalDuration += Date.now() - startTime;
      return {
        success: true,
        data: result,
        timestamp: startTime,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this._stats.errorCount++;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: startTime,
        duration: Date.now() - startTime,
      };
    }
  }

  getAdapter(): AdapterConfig {
    return this.config;
  }

  protected abstract doAdapt<TInput, TOutput>(input: TInput): Promise<TOutput>;
  protected abstract doConvert<TInput, TOutput>(input: TInput): Promise<TOutput>;

  getSnapshot(): { metrics: AdapterStats } {
    return { metrics: this.getStats() };
  }

  reset(): void {
    this._stats = {
      adaptCount: 0,
      convertCount: 0,
      errorCount: 0,
      totalDuration: 0,
    };
  }

  getReport(): string {
    const cfg = this._config;
    const s = this._stats;
    return [
      `Adapter Report: ${cfg.name} v${cfg.version}`,
      `ID: ${cfg.id} | Enabled: ${cfg.enabled} | Priority: ${cfg.priority}`,
      `Adapt: ${s.adaptCount} | Convert: ${s.convertCount} | Errors: ${s.errorCount}`,
      `Total Duration: ${s.totalDuration}ms`,
      `Last Adapt: ${s.lastAdapt ? new Date(s.lastAdapt).toISOString() : 'N/A'}`,
      `Last Convert: ${s.lastConvert ? new Date(s.lastConvert).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: AdapterStats; config: AdapterConfig } {
    return {
      version: '1.0.0',
      stats: this.getStats(),
      config: this.config,
    };
  }
}

export class GenericAdapter extends Adapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  protected async doAdapt<TInput, TOutput>(input: TInput): Promise<TOutput> {
    return input as unknown as TOutput;
  }

  protected async doConvert<TInput, TOutput>(input: TInput): Promise<TOutput> {
    return input as unknown as TOutput;
  }
}
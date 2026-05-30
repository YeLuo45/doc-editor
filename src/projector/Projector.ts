/**
 * V138 Projector - Core projection engine for doc-editor
 * Handles document projection and state management
 */

export type ProjectorConfig = {
  id: string;
  name: string;
  enabled: boolean;
  timeout: number;
  maxRetries: number;
};

export type ProjectionResult = {
  success: boolean;
  data: unknown;
  error?: string;
  timestamp: number;
};

export type ProjectorStats = {
  totalProjections: number;
  successfulProjections: number;
  failedProjections: number;
  averageDuration: number;
};

export class Projector {
  private _config: ProjectorConfig;
  private _stats: ProjectorStats;
  private _lastProjection: ProjectionResult | null = null;

  constructor(config: ProjectorConfig) {
    this._config = { ...config };
    this._stats = {
      totalProjections: 0,
      successfulProjections: 0,
      failedProjections: 0,
      averageDuration: 0,
    };
  }

  get config(): ProjectorConfig {
    return { ...this._config };
  }

  getStats(): ProjectorStats {
    return { ...this._stats };
  }

  project(input: unknown): ProjectionResult {
    const startTime = Date.now();
    this._stats.totalProjections++;

    try {
      if (!this._config.enabled) {
        throw new Error(`Projector ${this._config.id} is disabled`);
      }

      const result = this.processProjection(input);
      const duration = Date.now() - startTime;

      this._lastProjection = {
        success: true,
        data: result,
        timestamp: Date.now(),
      };

      this._stats.successfulProjections++;
      this.updateAverageDuration(duration);

      return this._lastProjection;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this._lastProjection = {
        success: false,
        data: null,
        error: errorMessage,
        timestamp: Date.now(),
      };

      this._stats.failedProjections++;
      this.updateAverageDuration(duration);

      return this._lastProjection;
    }
  }

  getProjector(id: string): Projector | null {
    if (this._config.id === id) {
      return this;
    }
    return null;
  }

  private processProjection(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input.map((item) => this.transformItem(item));
    }
    return this.transformItem(input);
  }

  private transformItem(item: unknown): unknown {
    if (typeof item === 'object' && item !== null) {
      return { ...item as object, projected: true };
    }
    return item;
  }

  private updateAverageDuration(duration: number): void {
    const total = this._stats.averageDuration * (this._stats.totalProjections - 1);
    this._stats.averageDuration = (total + duration) / this._stats.totalProjections;
  }

  getSnapshot(): { metrics: ProjectorStats; config: ProjectorConfig; lastResult: ProjectionResult | null } {
    return {
      metrics: this.getStats(),
      config: this.config,
      lastResult: this._lastProjection,
    };
  }

  reset(): void {
    this._stats = {
      totalProjections: 0,
      successfulProjections: 0,
      failedProjections: 0,
      averageDuration: 0,
    };
    this._lastProjection = null;
  }

  getReport(): string {
    const stats = this.getStats();
    const successRate = stats.totalProjections > 0
      ? ((stats.successfulProjections / stats.totalProjections) * 100).toFixed(2)
      : '0.00';

    return [
      `Projector Report: ${this._config.name} (${this._config.id})`,
      `Enabled: ${this._config.enabled}`,
      `Total Projections: ${stats.totalProjections}`,
      `Successful: ${stats.successfulProjections}`,
      `Failed: ${stats.failedProjections}`,
      `Success Rate: ${successRate}%`,
      `Average Duration: ${stats.averageDuration.toFixed(2)}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: ProjectorStats; config: ProjectorConfig } {
    return {
      version: 'V138',
      stats: this.getStats(),
      config: this.config,
    };
  }
}
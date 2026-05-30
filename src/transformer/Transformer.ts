/**
 * V139 Transformer Module
 * Core transformation functionality for doc-editor
 */

export type TransformerConfig = {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  priority: number;
};

export type TransformResult = {
  success: boolean;
  data: unknown;
  errors: string[];
  timestamp: number;
};

export class Transformer {
  private _config: TransformerConfig;
  private _stats: {
    transformCount: number;
    successCount: number;
    failureCount: number;
    lastTransform: number | null;
  };

  constructor(config: Partial<TransformerConfig> = {}) {
    this._config = {
      id: config.id || `transformer-${Date.now()}`,
      name: config.name || 'DefaultTransformer',
      version: config.version || '1.0.0',
      enabled: config.enabled !== false,
      priority: config.priority || 0,
    };
    this._stats = {
      transformCount: 0,
      successCount: 0,
      failureCount: 0,
      lastTransform: null,
    };
  }

  get config(): TransformerConfig {
    return { ...this._config };
  }

  getStats(): Readonly<typeof this._stats> {
    return { ...this._stats };
  }

  transform(input: unknown): TransformResult {
    if (!this._config.enabled) {
      return {
        success: false,
        data: null,
        errors: ['Transformer is disabled'],
        timestamp: Date.now(),
      };
    }

    this._stats.transformCount++;
    this._stats.lastTransform = Date.now();

    try {
      const data = this.processTransform(input);
      this._stats.successCount++;
      return {
        success: true,
        data,
        errors: [],
        timestamp: Date.now(),
      };
    } catch (error) {
      this._stats.failureCount++;
      return {
        success: false,
        data: null,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: Date.now(),
      };
    }
  }

  getTransformer(id: string): Transformer | null {
    if (this._config.id === id) {
      return this;
    }
    return null;
  }

  private processTransform(input: unknown): unknown {
    if (typeof input === 'string') {
      return input.toUpperCase();
    }
    if (typeof input === 'object' && input !== null) {
      return { ...input as object };
    }
    return input;
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        id: this._config.id,
        name: this._config.name,
        version: this._config.version,
        enabled: this._config.enabled,
        priority: this._config.priority,
        transformCount: this._stats.transformCount,
        successCount: this._stats.successCount,
        failureCount: this._stats.failureCount,
        lastTransform: this._stats.lastTransform,
      },
    };
  }

  reset(): void {
    this._stats.transformCount = 0;
    this._stats.successCount = 0;
    this._stats.failureCount = 0;
    this._stats.lastTransform = null;
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return JSON.stringify(snap, null, 2);
  }

  exportMetrics(): { version: string } & ReturnType<typeof this.getSnapshot>['metrics'] {
    return {
      version: '1.0.0',
      ...this.getSnapshot().metrics,
    };
  }
}
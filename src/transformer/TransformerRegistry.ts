/**
 * V139 Transformer Registry
 * Manages registration and lookup of transformer instances
 */

import { Transformer, TransformerConfig } from './Transformer';

export type RegistryConfig = {
  autoRegister: boolean;
  defaultPriority: number;
};

export class TransformerRegistry {
  private _transformers: Map<string, Transformer> = new Map();
  private _config: RegistryConfig;

  constructor(config: Partial<RegistryConfig> = {}) {
    this._config = {
      autoRegister: config.autoRegister !== false,
      defaultPriority: config.defaultPriority || 0,
    };
  }

  get config(): RegistryConfig {
    return { ...this._config };
  }

  register(transformer: Transformer): boolean {
    if (!transformer || !transformer.config.id) {
      return false;
    }
    const id = transformer.config.id;
    if (this._transformers.has(id)) {
      return false;
    }
    this._transformers.set(id, transformer);
    return true;
  }

  unregister(id: string): boolean {
    return this._transformers.delete(id);
  }

  get(id: string): Transformer | undefined {
    return this._transformers.get(id);
  }

  getAll(): Transformer[] {
    return Array.from(this._transformers.values());
  }

  has(id: string): boolean {
    return this._transformers.has(id);
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        count: this._transformers.size,
        ids: Array.from(this._transformers.keys()),
        autoRegister: this._config.autoRegister,
        defaultPriority: this._config.defaultPriority,
      },
    };
  }

  reset(): void {
    this._transformers.clear();
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
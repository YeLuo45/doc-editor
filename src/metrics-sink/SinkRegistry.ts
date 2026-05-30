/**
 * SinkRegistry.ts - Registry for managing metric sinks
 * Version 1.0.7
 */

import { MetricsSink, SinkConfig } from './MetricsSink';

export type RegistryConfig = {
  maxSinks: number;
  defaultEndpoint: string;
  autoInitialize: boolean;
  onRegister?: (name: string, sink: MetricsSink) => void;
  onUnregister?: (name: string) => void;
};

export interface RegistryMetrics {
  totalSinks: number;
  activeSinks: number;
  totalRegistrations: number;
  totalUnregistrations: number;
}

export class SinkRegistry {
  private _config: RegistryConfig;
  private sinks: Map<string, MetricsSink> = new Map();
  private totalRegistrations = 0;
  private totalUnregistrations = 0;

  constructor(config: Partial<RegistryConfig> = {}) {
    this._config = {
      maxSinks: 50,
      defaultEndpoint: 'http://localhost:9090/metrics',
      autoInitialize: true,
      onRegister: undefined,
      onUnregister: undefined,
      ...config,
    };
  }

  get config(): RegistryConfig {
    return { ...this._config };
  }

  set config(value: Partial<RegistryConfig>) {
    this._config = { ...this._config, ...value };
  }

  register(name: string, config?: Partial<SinkConfig>): boolean {
    if (!name || typeof name !== 'string') {
      return false;
    }

    if (this.sinks.size >= this._config.maxSinks) {
      return false;
    }

    if (this.sinks.has(name)) {
      return false;
    }

    const sinkConfig: Partial<SinkConfig> = {
      endpoint: this._config.defaultEndpoint,
      ...config,
    };

    const sink = new MetricsSink(sinkConfig);
    this.sinks.set(name, sink);
    this.totalRegistrations++;
    
    this._config.onRegister?.(name, sink);
    
    return true;
  }

  unregister(name: string): boolean {
    if (!name || !this.sinks.has(name)) {
      return false;
    }

    const sink = this.sinks.get(name);
    if (sink && typeof sink.destroy === 'function') {
      sink.destroy();
    }
    
    this.sinks.delete(name);
    this.totalUnregistrations++;
    
    this._config.onUnregister?.(name);
    
    return true;
  }

  get(name: string): MetricsSink | undefined {
    return this.sinks.get(name);
  }

  getAll(): Map<string, MetricsSink> {
    return new Map(this.sinks);
  }

  has(name: string): boolean {
    return this.sinks.has(name);
  }

  getNames(): string[] {
    return Array.from(this.sinks.keys());
  }

  clear(): void {
    for (const [name, sink] of this.sinks) {
      if (typeof sink.destroy === 'function') {
        sink.destroy();
      }
    }
    this.sinks.clear();
  }

  getStatus(): {
    totalSinks: number;
    sinkNames: string[];
    maxSinks: number;
  } {
    return {
      totalSinks: this.sinks.size,
      sinkNames: this.getNames(),
      maxSinks: this._config.maxSinks,
    };
  }

  getStats(): RegistryMetrics {
    const activeSinks = Array.from(this.sinks.values()).filter(sink => {
      const status = sink.getStatus();
      return status.enabled;
    }).length;

    return {
      totalSinks: this.sinks.size,
      activeSinks,
      totalRegistrations: this.totalRegistrations,
      totalUnregistrations: this.totalUnregistrations,
    };
  }

  getSnapshot(): { metrics: RegistryMetrics; config: RegistryConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  reset(): void {
    this.clear();
    this.totalRegistrations = 0;
    this.totalUnregistrations = 0;
  }

  getReport(): string {
    const stats = this.getStats();
    const status = this.getStatus();
    return [
      'Sink Registry Report',
      '=====================',
      `Total Sinks: ${stats.totalSinks}`,
      `Active Sinks: ${stats.activeSinks}`,
      `Max Sinks: ${status.maxSinks}`,
      '',
      `Total Registrations: ${stats.totalRegistrations}`,
      `Total Unregistrations: ${stats.totalUnregistrations}`,
      '',
      'Registered Sinks:',
      ...status.sinkNames.map(name => `  - ${name}`),
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: RegistryMetrics; config: RegistryConfig } {
    return {
      version: '1.0.7',
      metrics: this.getStats(),
      config: this.config,
    };
  }
}
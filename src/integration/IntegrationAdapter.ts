/**
 * IntegrationAdapter.ts - Adapter Management
 * V30 Integration Hub for doc-editor
 */

export interface AdapterInterface {
  name: string;
  version: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(command: string, args?: Record<string, unknown>): Promise<unknown>;
  healthCheck(): Promise<boolean>;
}

export interface AdapterMetrics {
  invocations: number;
  errors: number;
  lastUsed: number;
  averageDuration: number;
}

export class IntegrationAdapter {
  private adapters: Map<string, AdapterInterface> = new Map();
  private metrics: Map<string, AdapterMetrics> = new Map();
  private snapshots: Record<string, unknown>[] = [];

  registerAdapter(adapter: AdapterInterface): void {
    if (this.adapters.has(adapter.name)) {
      throw new Error(`Adapter ${adapter.name} already registered`);
    }
    this.adapters.set(adapter.name, adapter);
    this.metrics.set(adapter.name, {
      invocations: 0,
      errors: 0,
      lastUsed: 0,
      averageDuration: 0,
    });
  }

  getAdapter(name: string): AdapterInterface | undefined {
    return this.adapters.get(name);
  }

  listAdapters(): Array<{ name: string; version: string; healthy: boolean }> {
    return Array.from(this.adapters.values()).map((adapter) => ({
      name: adapter.name,
      version: adapter.version,
      healthy: false,
    }));
  }

  async executeAdapter(
    name: string,
    command: string,
    args?: Record<string, unknown>
  ): Promise<unknown> {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter ${name} not found`);
    }

    const start = Date.now();
    try {
      const result = await adapter.execute(command, args);
      this.recordInvocation(name, Date.now() - start, false);
      return result;
    } catch (error) {
      this.recordInvocation(name, Date.now() - start, true);
      throw error;
    }
  }

  private recordInvocation(name: string, duration: number, isError: boolean): void {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.invocations++;
      metric.lastUsed = Date.now();
      if (isError) metric.errors++;
      metric.averageDuration =
        (metric.averageDuration * (metric.invocations - 1) + duration) /
        metric.invocations;
    }
  }

  getAdapterMetrics(name: string): AdapterMetrics | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): Map<string, AdapterMetrics> {
    return new Map(this.metrics);
  }

  removeAdapter(name: string): boolean {
    this.metrics.delete(name);
    return this.adapters.delete(name);
  }

  getSnapshot(): Record<string, unknown> {
    const snapshot = {
      adapterCount: this.adapters.size,
      adapters: this.listAdapters(),
      metrics: Object.fromEntries(this.metrics),
      timestamp: Date.now(),
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  reset(): void {
    this.adapters.clear();
    this.metrics.clear();
    this.snapshots = [];
  }

  getReport(): {
    adapterCount: number;
    totalInvocations: number;
    totalErrors: number;
    snapshots: number;
  } {
    let totalInvocations = 0;
    let totalErrors = 0;
    for (const metric of this.metrics.values()) {
      totalInvocations += metric.invocations;
      totalErrors += metric.errors;
    }
    return {
      adapterCount: this.adapters.size,
      totalInvocations,
      totalErrors,
      snapshots: this.snapshots.length,
    };
  }

  exportMetrics(): Record<string, unknown> {
    return {
      adapters: this.listAdapters(),
      metrics: Object.fromEntries(this.metrics),
      totalInvocations: Array.from(this.metrics.values()).reduce(
        (sum, m) => sum + m.invocations,
        0
      ),
      totalErrors: Array.from(this.metrics.values()).reduce(
        (sum, m) => sum + m.errors,
        0
      ),
    };
  }
}

export default IntegrationAdapter;
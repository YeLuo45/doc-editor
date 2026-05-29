/**
 * IntegrationHub.ts - Core Integration Hub
 * V30 Integration Hub for doc-editor
 */

export type HubStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface HubConfig {
  name: string;
  timeout: number;
  retries: number;
  adapters: string[];
}

export interface AdapterInterface {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  execute(command: string, args?: Record<string, unknown>): Promise<unknown>;
}

export interface PipelineResult {
  success: boolean;
  results: unknown[];
  errors: string[];
  duration: number;
}

export class IntegrationHub {
  private status: HubStatus = 'idle';
  private adapters: Map<string, AdapterInterface> = new Map();
  private config: HubConfig;
  private lastSnapshot: Record<string, unknown> = {};
  private metrics: { operations: number; errors: number; startTime: number } = {
    operations: 0,
    errors: 0,
    startTime: Date.now(),
  };

  constructor(config: Partial<HubConfig> = {}) {
    this.config = {
      name: config.name ?? 'IntegrationHub',
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 3,
      adapters: config.adapters ?? [],
    };
  }

  async connect(adapterNames?: string[]): Promise<void> {
    this.status = 'connecting';
    const targets = adapterNames ?? Array.from(this.adapters.keys());
    
    const results = await Promise.allSettled(
      targets.map((name) => {
        const adapter = this.adapters.get(name);
        if (!adapter) throw new Error(`Adapter ${name} not found`);
        return adapter.connect();
      })
    );

    const errors = results.filter((r) => r.status === 'rejected');
    if (errors.length > 0) {
      this.status = 'error';
      this.metrics.errors += errors.length;
      throw new Error(`Failed to connect ${errors.length} adapters`);
    }
    
    this.status = 'connected';
  }

  async orchestrate(command: string, args?: Record<string, unknown>): Promise<unknown> {
    if (this.status !== 'connected') {
      throw new Error(`Cannot orchestrate in ${this.status} status`);
    }

    this.metrics.operations++;
    const results: unknown[] = [];
    
    for (const adapter of this.adapters.values()) {
      try {
        const result = await adapter.execute(command, args);
        results.push(result);
      } catch (error) {
        this.metrics.errors++;
        results.push({ error: String(error) });
      }
    }
    
    return results;
  }

  getHubStatus(): HubStatus {
    return this.status;
  }

  registerAdapter(name: string, adapter: AdapterInterface): void {
    this.adapters.set(name, adapter);
  }

  getAdapter(name: string): AdapterInterface | undefined {
    return this.adapters.get(name);
  }

  listAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  getSnapshot(): Record<string, unknown> {
    this.lastSnapshot = {
      status: this.status,
      adapterCount: this.adapters.size,
      adapterNames: this.listAdapters(),
      metrics: { ...this.metrics },
      uptime: Date.now() - this.metrics.startTime,
    };
    return this.lastSnapshot;
  }

  reset(): void {
    this.status = 'idle';
    this.metrics = { operations: 0, errors: 0, startTime: Date.now() };
    this.lastSnapshot = {};
  }

  getReport(): { status: string; adapters: number; metrics: Record<string, unknown> } {
    return {
      status: this.status,
      adapters: this.adapters.size,
      metrics: this.getSnapshot(),
    };
  }

  exportMetrics(): Record<string, unknown> {
    return {
      operations: this.metrics.operations,
      errors: this.metrics.errors,
      uptime: Date.now() - this.metrics.startTime,
      adapterCount: this.adapters.size,
      status: this.status,
    };
  }
}

export default IntegrationHub;
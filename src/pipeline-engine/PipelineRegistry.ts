/**
 * PipelineRegistry.ts - V92 Pipeline Registry
 * Central registry for pipeline management (register/unregister/get/getAll)
 */

export type RegistryConfig = {
  maxPipelines: number;
  enableValidation: boolean;
  autoCleanup: boolean;
  cleanupInterval: number;
};

export type RegisteredPipeline = {
  id: string;
  name: string;
  description: string;
  version: string;
  registeredAt: number;
  metadata: Record<string, unknown>;
};

export type RegistrySnapshot = {
  metrics: {
    totalRegistered: number;
    activeCount: number;
    version: string;
  };
  timestamp: number;
};

export class PipelineRegistry {
  config: RegistryConfig;
  private pipelines: Map<string, RegisteredPipeline> = new Map();
  private activePipelineIds: Set<string> = new Set();

  constructor(config: RegistryConfig) {
    this.config = { ...config };
  }

  register(pipeline: Omit<RegisteredPipeline, 'registeredAt'>): boolean {
    if (this.config.enableValidation && this.pipelines.size >= this.config.maxPipelines) {
      return false;
    }
    if (this.pipelines.has(pipeline.id)) {
      return false;
    }
    const fullPipeline: RegisteredPipeline = {
      ...pipeline,
      registeredAt: Date.now(),
    };
    this.pipelines.set(pipeline.id, fullPipeline);
    return true;
  }

  unregister(pipelineId: string): boolean {
    const removed = this.pipelines.delete(pipelineId);
    if (removed) {
      this.activePipelineIds.delete(pipelineId);
    }
    return removed;
  }

  get(pipelineId: string): RegisteredPipeline | undefined {
    return this.pipelines.get(pipelineId);
  }

  getAll(): RegisteredPipeline[] {
    return Array.from(this.pipelines.values());
  }

  getByName(name: string): RegisteredPipeline | undefined {
    return Array.from(this.pipelines.values()).find((p) => p.name === name);
  }

  updateMetadata(pipelineId: string, metadata: Record<string, unknown>): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return false;
    pipeline.metadata = { ...pipeline.metadata, ...metadata };
    return true;
  }

  markActive(pipelineId: string): boolean {
    if (!this.pipelines.has(pipelineId)) return false;
    this.activePipelineIds.add(pipelineId);
    return true;
  }

  markInactive(pipelineId: string): boolean {
    return this.activePipelineIds.delete(pipelineId);
  }

  getActiveCount(): number {
    return this.activePipelineIds.size;
  }

  getSnapshot(): RegistrySnapshot {
    return {
      metrics: {
        totalRegistered: this.pipelines.size,
        activeCount: this.activePipelineIds.size,
        version: 'V92',
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.pipelines.clear();
    this.activePipelineIds.clear();
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== Pipeline Registry Report ===',
      `Total Registered: ${snapshot.metrics.totalRegistered}`,
      `Active Count: ${snapshot.metrics.activeCount}`,
      `Max Allowed: ${this.config.maxPipelines}`,
      `Validation: ${this.config.enableValidation ? 'enabled' : 'disabled'}`,
      `Timestamp: ${new Date(snapshot.timestamp).toISOString()}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } & RegistrySnapshot['metrics'] {
    return {
      version: 'V92',
      ...this.getSnapshot().metrics,
    };
  }
}
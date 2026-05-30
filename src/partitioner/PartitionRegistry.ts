/**
 * V109 PartitionRegistry Module
 * Central registry for managing partition instances
 */

export interface RegistryConfig {
  autoCreate: boolean;
  maxPartitions: number;
  enabled: boolean;
}

export interface RegisteredPartition {
  id: string;
  name: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  isActive: boolean;
}

export type RegistryStats = {
  totalRegistered: number;
  activeCount: number;
  byType: Record<string, number>;
};

export class PartitionRegistry {
  private _partitions: Map<string, RegisteredPartition> = new Map();
  private _config: RegistryConfig;

  constructor(config: RegistryConfig) {
    this._config = { ...config };
  }

  get config(): RegistryConfig {
    return { ...this._config };
  }

  get partitions(): Map<string, RegisteredPartition> {
    return new Map(this._partitions);
  }

  /**
   * Register a new partition
   */
  register(id: string, name: string, type: string = 'default', metadata: Record<string, unknown> = {}): RegisteredPartition {
    if (this._partitions.has(id)) {
      throw new Error(`Partition '${id}' is already registered`);
    }

    if (this._partitions.size >= this._config.maxPartitions) {
      throw new Error(`Maximum partitions (${this._config.maxPartitions}) reached`);
    }

    const partition: RegisteredPartition = {
      id,
      name,
      type,
      metadata,
      createdAt: new Date(),
      isActive: true,
    };

    this._partitions.set(id, partition);
    return partition;
  }

  /**
   * Unregister a partition
   */
  unregister(id: string): boolean {
    return this._partitions.delete(id);
  }

  /**
   * Get a registered partition by id
   */
  get(id: string): RegisteredPartition | undefined {
    return this._partitions.get(id);
  }

  /**
   * Get all registered partitions
   */
  getAll(): RegisteredPartition[] {
    return Array.from(this._partitions.values());
  }

  /**
   * Check if a partition is registered
   */
  has(id: string): boolean {
    return this._partitions.has(id);
  }

  /**
   * Update partition metadata
   */
  updateMetadata(id: string, metadata: Record<string, unknown>): boolean {
    const partition = this._partitions.get(id);
    if (!partition) {
      return false;
    }
    partition.metadata = { ...partition.metadata, ...metadata };
    return true;
  }

  /**
   * Deactivate a partition
   */
  deactivate(id: string): boolean {
    const partition = this._partitions.get(id);
    if (!partition) {
      return false;
    }
    partition.isActive = false;
    return true;
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const byType: Record<string, number> = {};
    let activeCount = 0;

    this._partitions.forEach((p) => {
      byType[p.type] = (byType[p.type] || 0) + 1;
      if (p.isActive) {
        activeCount++;
      }
    });

    return {
      totalRegistered: this._partitions.size,
      activeCount,
      byType,
    };
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): { metrics: RegistryStats; config: RegistryConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  /**
   * Reset the registry
   */
  reset(): void {
    this._partitions.clear();
  }

  /**
   * Generate a text report
   */
  getReport(): string {
    const stats = this.getStats();
    const lines = [
      `Partition Registry Report`,
      `Auto Create: ${this._config.autoCreate}`,
      `Max Partitions: ${this._config.maxPartitions}`,
      `Enabled: ${this._config.enabled}`,
      `---`,
      `Total Registered: ${stats.totalRegistered}`,
      `Active Count: ${stats.activeCount}`,
      `---`,
      `By Type:`,
    ];

    Object.entries(stats.byType).forEach(([type, count]) => {
      lines.push(`  ${type}: ${count}`);
    });

    lines.push(`---`, `Partitions:`);

    this._partitions.forEach((p, id) => {
      lines.push(`  [${id}] ${p.name} (${p.type}) - ${p.isActive ? 'active' : 'inactive'}`);
    });

    return lines.join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): { version: string; timestamp: string; stats: RegistryStats; config: RegistryConfig } {
    return {
      version: '1.0.9',
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      config: this.config,
    };
  }
}
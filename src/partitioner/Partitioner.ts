/**
 * V109 Partitioner Module
 * Manages document partitioning with configurable strategies
 */

export interface PartitionConfig {
  id: string;
  name: string;
  maxSize: number;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface PartitionData {
  id: string;
  name: string;
  size: number;
  items: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export type PartitionStats = {
  totalPartitions: number;
  totalItems: number;
  totalSize: number;
  averageSize: number;
  enabledCount: number;
};

export class Partitioner {
  private _partitions: Map<string, PartitionData> = new Map();
  private _config: PartitionConfig;

  constructor(config: PartitionConfig) {
    this._config = { ...config };
  }

  get config(): PartitionConfig {
    return { ...this._config };
  }

  get partitions(): Map<string, PartitionData> {
    return new Map(this._partitions);
  }

  /**
   * Partition items into groups based on maxSize constraint
   */
  partition(items: unknown[], maxSize?: number): PartitionData[] {
    const size = maxSize ?? this._config.maxSize;
    const result: PartitionData[] = [];
    let currentPartition: PartitionData | null = null;

    for (const item of items) {
      if (!currentPartition || currentPartition.size >= size) {
        currentPartition = this.createPartition();
        result.push(currentPartition);
      }
      currentPartition.items.push(item);
      currentPartition.size = currentPartition.items.length;
      currentPartition.updatedAt = new Date();
    }

    return result;
  }

  /**
   * Add a new partition
   */
  add(id: string, name: string, items: unknown[] = []): PartitionData {
    if (this._partitions.has(id)) {
      throw new Error(`Partition with id '${id}' already exists`);
    }
    const partition: PartitionData = {
      id,
      name,
      size: items.length,
      items: [...items],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this._partitions.set(id, partition);
    return partition;
  }

  /**
   * Remove a partition by id
   */
  remove(id: string): boolean {
    return this._partitions.delete(id);
  }

  /**
   * Get a specific partition by id
   */
  getPartition(id: string): PartitionData | undefined {
    return this._partitions.get(id);
  }

  /**
   * Get partition statistics
   */
  getStats(): PartitionStats {
    let totalItems = 0;
    let totalSize = 0;

    this._partitions.forEach((p) => {
      totalItems += p.items.length;
      totalSize += p.size;
    });

    const count = this._partitions.size;
    return {
      totalPartitions: count,
      totalItems,
      totalSize,
      averageSize: count > 0 ? totalSize / count : 0,
      enabledCount: this._config.enabled ? count : 0,
    };
  }

  /**
   * Get current snapshot of partitioner state
   */
  getSnapshot(): { metrics: PartitionStats; config: PartitionConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  /**
   * Reset all partitions
   */
  reset(): void {
    this._partitions.clear();
  }

  /**
   * Generate a text report of current state
   */
  getReport(): string {
    const stats = this.getStats();
    const lines = [
      `Partitioner Report: ${this._config.name}`,
      `ID: ${this._config.id}`,
      `Enabled: ${this._config.enabled}`,
      `Max Size: ${this._config.maxSize}`,
      `---`,
      `Total Partitions: ${stats.totalPartitions}`,
      `Total Items: ${stats.totalItems}`,
      `Total Size: ${stats.totalSize}`,
      `Average Size: ${stats.averageSize.toFixed(2)}`,
      `---`,
      `Partitions:`,
    ];

    this._partitions.forEach((p, id) => {
      lines.push(`  [${id}] ${p.name}: ${p.size} items`);
    });

    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; timestamp: string; stats: PartitionStats; config: PartitionConfig } {
    return {
      version: '1.0.9',
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      config: this.config,
    };
  }

  private createPartition(): PartitionData {
    const id = `partition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id,
      name: `Partition ${this._partitions.size + 1}`,
      size: 0,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
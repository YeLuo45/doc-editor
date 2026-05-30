/**
 * V109 PartitionStrategy Module
 * Provides partitioning strategies for document management
 */

export type StrategyType = 'round-robin' | 'weighted' | 'size-based' | 'hash-based';

export interface StrategyConfig {
  type: StrategyType;
  weight?: number;
  seed?: string;
  enabled: boolean;
}

export interface PartitionStrategyData {
  id: string;
  type: StrategyType;
  partitions: string[];
  currentIndex: number;
  metrics: {
    selections: number;
    lastUsed: Date | null;
  };
}

export type StrategyStats = {
  totalStrategies: number;
  totalSelections: number;
  activeStrategy: string | null;
};

export class PartitionStrategy {
  private _strategies: Map<string, PartitionStrategyData> = new Map();
  private _config: StrategyConfig;
  private _activeStrategy: string | null = null;

  constructor(config: StrategyConfig) {
    this._config = { ...config };
  }

  get config(): StrategyConfig {
    return { ...this._config };
  }

  get strategies(): Map<string, PartitionStrategyData> {
    return new Map(this._strategies);
  }

  /**
   * Partition items according to the current strategy
   */
  partition(items: unknown[], partitionCount: number): Map<string, unknown[]> {
    const result = new Map<string, unknown[]>();

    for (let i = 0; i < partitionCount; i++) {
      result.set(`partition_${i}`, []);
    }

    switch (this._config.type) {
      case 'round-robin':
        this.roundRobinPartition(items, result);
        break;
      case 'weighted':
        this.weightedPartition(items, result);
        break;
      case 'size-based':
        this.sizeBasedPartition(items, result);
        break;
      case 'hash-based':
        this.hashBasedPartition(items, result);
        break;
    }

    return result;
  }

  /**
   * Select a partition for an item
   */
  select(item: unknown, partitions: string[]): string {
    if (partitions.length === 0) {
      throw new Error('No partitions available');
    }

    const index = this.selectIndex(item, partitions.length);
    const selected = partitions[index];

    this.recordSelection(this._activeStrategy || 'default');

    return selected;
  }

  /**
   * Get the current strategy type
   */
  getStrategy(): StrategyType {
    return this._config.type;
  }

  /**
   * Apply a strategy to a set of items
   */
  apply(items: unknown[], partitionCount: number): Map<string, unknown[]> {
    return this.partition(items, partitionCount);
  }

  /**
   * Get strategy statistics
   */
  getStats(): StrategyStats {
    let totalSelections = 0;
    this._strategies.forEach((s) => {
      totalSelections += s.metrics.selections;
    });

    return {
      totalStrategies: this._strategies.size,
      totalSelections,
      activeStrategy: this._activeStrategy,
    };
  }

  /**
   * Set active strategy by id
   */
  setActiveStrategy(strategyId: string): void {
    if (!this._strategies.has(strategyId) && strategyId !== 'default') {
      throw new Error(`Strategy '${strategyId}' not found`);
    }
    this._activeStrategy = strategyId;
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): { metrics: StrategyStats; config: StrategyConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  /**
   * Reset all strategies and state
   */
  reset(): void {
    this._strategies.clear();
    this._activeStrategy = null;
  }

  /**
   * Generate a text report
   */
  getReport(): string {
    const stats = this.getStats();
    const lines = [
      `Partition Strategy Report`,
      `Type: ${this._config.type}`,
      `Enabled: ${this._config.enabled}`,
      `---`,
      `Total Strategies: ${stats.totalStrategies}`,
      `Total Selections: ${stats.totalSelections}`,
      `Active Strategy: ${stats.activeStrategy || 'none'}`,
      `---`,
      `Strategies:`,
    ];

    this._strategies.forEach((s, id) => {
      lines.push(`  [${id}] ${s.type}: ${s.metrics.selections} selections`);
    });

    return lines.join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): { version: string; timestamp: string; stats: StrategyStats; config: StrategyConfig } {
    return {
      version: '1.0.9',
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      config: this.config,
    };
  }

  private roundRobinPartition(items: unknown[], result: Map<string, unknown[]>): void {
    const keys = Array.from(result.keys());
    items.forEach((item, index) => {
      const partitionKey = keys[index % keys.length];
      result.get(partitionKey)!.push(item);
    });
  }

  private weightedPartition(items: unknown[], result: Map<string, unknown[]>): void {
    const weight = this._config.weight || 1;
    const keys = Array.from(result.keys());
    items.forEach((item, index) => {
      const partitionKey = keys[Math.floor((index * weight) / keys.length) % keys.length];
      result.get(partitionKey)!.push(item);
    });
  }

  private sizeBasedPartition(items: unknown[], result: Map<string, unknown[]>): void {
    const keys = Array.from(result.keys());
    let currentKeyIndex = 0;
    let currentSize = 0;

    items.forEach((item) => {
      const partitionKey = keys[currentKeyIndex];
      const itemsInPartition = result.get(partitionKey)!;
      itemsInPartition.push(item);
      currentSize++;

      if (currentSize >= 10) {
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;
        currentSize = 0;
      }
    });
  }

  private hashBasedPartition(items: unknown[], result: Map<string, unknown[]>): void {
    const keys = Array.from(result.keys());
    items.forEach((item) => {
      const hash = this.hash(item);
      const partitionKey = keys[hash % keys.length];
      result.get(partitionKey)!.push(item);
    });
  }

  private hash(item: unknown): number {
    const str = JSON.stringify(item);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private selectIndex(item: unknown, totalPartitions: number): number {
    switch (this._config.type) {
      case 'round-robin': {
        const strategy = this.getOrCreateStrategy('round-robin');
        const index = strategy.currentIndex;
        strategy.currentIndex = (index + 1) % totalPartitions;
        return index;
      }
      case 'hash-based':
        return this.hash(item) % totalPartitions;
      default:
        return Math.floor(Math.random() * totalPartitions);
    }
  }

  private recordSelection(strategyId: string): void {
    let strategy = this._strategies.get(strategyId);
    if (!strategy) {
      strategy = {
        id: strategyId,
        type: this._config.type,
        partitions: [],
        currentIndex: 0,
        metrics: {
          selections: 0,
          lastUsed: null,
        },
      };
      this._strategies.set(strategyId, strategy);
    }
    strategy.metrics.selections++;
    strategy.metrics.lastUsed = new Date();
  }

  private getOrCreateStrategy(id: string): PartitionStrategyData {
    let strategy = this._strategies.get(id);
    if (!strategy) {
      strategy = {
        id,
        type: this._config.type,
        partitions: [],
        currentIndex: 0,
        metrics: {
          selections: 0,
          lastUsed: null,
        },
      };
      this._strategies.set(id, strategy);
    }
    return strategy;
  }
}
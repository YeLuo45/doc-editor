/**
 * AggregationStrategy - V104 for doc-editor
 * Strategy pattern for different aggregation approaches
 */

export type AggregationStrategyConfig = {
  strategy: 'sum' | 'average' | 'min' | 'max' | 'count';
  weightEnabled?: boolean;
};

export interface StrategyMetrics {
  invocations: number;
  lastExecuted: number;
  totalItems: number;
}

export interface AggregationStrategyItem {
  id: string;
  value: number;
  weight?: number;
  timestamp: number;
}

export class AggregationStrategy {
  config: AggregationStrategyConfig;
  private items: AggregationStrategyItem[];
  private metrics: StrategyMetrics;
  private currentStrategy: string;

  constructor(config: AggregationStrategyConfig) {
    this.config = config;
    this.items = [];
    this.metrics = {
      invocations: 0,
      lastExecuted: 0,
      totalItems: 0,
    };
    this.currentStrategy = config.strategy;
  }

  aggregate(item: AggregationStrategyItem): void {
    this.items.push(item);
    this.metrics.totalItems++;
  }

  select(strategy: AggregationStrategyConfig['strategy']): void {
    this.currentStrategy = strategy;
  }

  getStrategy(): AggregationStrategyConfig['strategy'] {
    return this.currentStrategy;
  }

  apply(): number {
    this.metrics.invocations++;
    this.metrics.lastExecuted = Date.now();

    if (this.items.length === 0) {
      return 0;
    }

    switch (this.currentStrategy) {
      case 'sum':
        return this.sum();
      case 'average':
        return this.average();
      case 'min':
        return this.min();
      case 'max':
        return this.max();
      case 'count':
        return this.items.length;
      default:
        return 0;
    }
  }

  private sum(): number {
    return this.items.reduce((acc, item) => acc + item.value, 0);
  }

  private average(): number {
    if (this.items.length === 0) return 0;
    if (this.config.weightEnabled) {
      const totalWeight = this.items.reduce((acc, item) => acc + (item.weight ?? 1), 0);
      const weightedSum = this.items.reduce((acc, item) => acc + item.value * (item.weight ?? 1), 0);
      return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    return this.sum() / this.items.length;
  }

  private min(): number {
    return Math.min(...this.items.map(item => item.value));
  }

  private max(): number {
    return Math.max(...this.items.map(item => item.value));
  }

  getStats(): StrategyMetrics {
    return { ...this.metrics };
  }

  getSnapshot(): { metrics: StrategyMetrics } {
    return {
      metrics: this.getStats(),
    };
  }

  reset(): void {
    this.items = [];
    this.metrics = {
      invocations: 0,
      lastExecuted: 0,
      totalItems: 0,
    };
  }

  getReport(): string {
    return JSON.stringify({
      strategy: this.currentStrategy,
      metrics: this.metrics,
      itemCount: this.items.length,
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.4',
      ...this.getSnapshot(),
    };
  }

  getItems(): AggregationStrategyItem[] {
    return [...this.items];
  }

  clear(): void {
    this.items = [];
  }
}
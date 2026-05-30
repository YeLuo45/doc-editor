/**
 * QueueStrategy.ts - V98 Queue Strategy Implementation
 * Queue selection and application strategy with select/getStrategy/apply/getStats
 */

import { QueueManager } from './QueueManager';
import { QueueItem } from './PriorityQueue';

export type StrategyType = 'priority' | 'round-robin' | 'least-loaded' | 'weighted' | 'fifo';

export type QueueStrategyConfig = {
  strategyType?: StrategyType;
  weights?: Record<string, number>;
  enableFallback?: boolean;
  rebalanceIntervalMs?: number;
};

type StrategySelector = (queues: string[], stats: Map<string, { size: number; isFull: boolean }>) => string | null;

const DEFAULT_CONFIG: Required<QueueStrategyConfig> = {
  strategyType: 'priority',
  weights: {},
  enableFallback: true,
  rebalanceIntervalMs: 30000,
};

export class QueueStrategy {
  private _config: Required<QueueStrategyConfig>;
  private queueManager: QueueManager;
  private currentIndex: Map<string, number> = new Map();
  private lastRebalance: number = Date.now();

  constructor(queueManager: QueueManager, config: QueueStrategyConfig = {}) {
    this.queueManager = queueManager;
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get config(): QueueStrategyConfig {
    return { ...this._config };
  }

  select(queues: string[]): string | null {
    if (queues.length === 0) {
      return null;
    }

    const strategy = this.getStrategy();
    const stats = this.buildStats(queues);

    const selected = strategy(queues, stats);

    if (selected) {
      return selected;
    }

    if (this._config.enableFallback) {
      for (const queueId of queues) {
        const queueStats = this.queueManager.getStats(queueId);
        if (queueStats && !queueStats.isFull) {
          return queueId;
        }
      }
      return queues[0];
    }

    return null;
  }

  getStrategy(): StrategySelector {
    switch (this._config.strategyType) {
      case 'round-robin':
        return this.roundRobinStrategy.bind(this);
      case 'least-loaded':
        return this.leastLoadedStrategy.bind(this);
      case 'weighted':
        return this.weightedStrategy.bind(this);
      case 'fifo':
        return this.fifoStrategy.bind(this);
      case 'priority':
      default:
        return this.priorityStrategy.bind(this);
    }
  }

  apply(item: QueueItem, queues: string[]): boolean {
    const selectedQueue = this.select(queues);

    if (!selectedQueue) {
      return false;
    }

    return this.queueManager.enqueue(selectedQueue, item);
  }

  getStats(): { strategyType: StrategyType; metrics: Record<string, unknown> } {
    this.checkRebalance();

    return {
      strategyType: this._config.strategyType,
      metrics: {
        weights: this._config.weights,
        enableFallback: this._config.enableFallback,
        rebalanceIntervalMs: this._config.rebalanceIntervalMs,
        lastRebalance: this.lastRebalance,
      },
    };
  }

  setStrategy(strategyType: StrategyType): void {
    this._config.strategyType = strategyType;
  }

  updateWeights(weights: Record<string, number>): void {
    this._config.weights = { ...weights };
    this.triggerRebalance();
  }

  private priorityStrategy(
    queues: string[],
    stats: Map<string, { size: number; isFull: boolean }>
  ): string | null {
    const sortedQueues = queues
      .map(id => ({ id, stats: stats.get(id)! }))
      .filter(q => q.stats && !q.stats.isFull)
      .sort((a, b) => {
        const aLoad = a.stats.size;
        const bLoad = b.stats.size;
        return aLoad - bLoad;
      });

    return sortedQueues[0]?.id ?? null;
  }

  private roundRobinStrategy(
    queues: string[],
    stats: Map<string, { size: number; isFull: boolean }>
  ): string | null {
    for (const queueId of queues) {
      if (!stats.get(queueId)?.isFull) {
        const idx = this.currentIndex.get(queueId) ?? 0;
        this.currentIndex.set(queueId, (idx + 1) % queues.length);
        return queueId;
      }
    }
    return null;
  }

  private leastLoadedStrategy(
    queues: string[],
    stats: Map<string, { size: number; isFull: boolean }>
  ): string | null {
    let minLoad = Infinity;
    let selected: string | null = null;

    for (const queueId of queues) {
      const queueStats = stats.get(queueId);
      if (queueStats && !queueStats.isFull && queueStats.size < minLoad) {
        minLoad = queueStats.size;
        selected = queueId;
      }
    }

    return selected;
  }

  private weightedStrategy(
    queues: string[],
    stats: Map<string, { size: number; isFull: boolean }>
  ): string | null {
    const weights = this._config.weights;
    const totalWeight = queues.reduce((sum, id) => sum + (weights[id] ?? 1), 0);

    if (totalWeight === 0) {
      return this.leastLoadedStrategy(queues, stats);
    }

    let random = Math.random() * totalWeight;

    for (const queueId of queues) {
      const queueStats = stats.get(queueId);
      if (queueStats && !queueStats.isFull) {
        random -= weights[queueId] ?? 1;
        if (random <= 0) {
          return queueId;
        }
      }
    }

    return null;
  }

  private fifoStrategy(
    queues: string[],
    stats: Map<string, { size: number; isFull: boolean }>
  ): string | null {
    let oldest: { id: string; timestamp: number } | null = null;

    for (const queueId of queues) {
      const queue = this.queueManager.get(queueId);
      if (queue && !stats.get(queueId)?.isFull) {
        const pending = queue.getPending();
        if (pending.length > 0) {
          const firstItem = pending[0];
          if (!oldest || firstItem.timestamp < oldest.timestamp) {
            oldest = { id: queueId, timestamp: firstItem.timestamp };
          }
        } else {
          if (!oldest) {
            oldest = { id: queueId, timestamp: Date.now() };
          }
        }
      }
    }

    return oldest?.id ?? null;
  }

  private buildStats(queues: string[]): Map<string, { size: number; isFull: boolean }> {
    const stats = new Map<string, { size: number; isFull: boolean }>();

    for (const queueId of queues) {
      const queueStats = this.queueManager.getStats(queueId);
      if (queueStats) {
        stats.set(queueId, {
          size: queueStats.size,
          isFull: queueStats.isFull,
        });
      }
    }

    return stats;
  }

  private checkRebalance(): void {
    const now = Date.now();
    if (now - this.lastRebalance >= this._config.rebalanceIntervalMs) {
      this.triggerRebalance();
    }
  }

  private triggerRebalance(): void {
    this.lastRebalance = Date.now();
    this.currentIndex.clear();
  }

  getSnapshot(): { metrics: Record<string, unknown>; currentStrategy: StrategyType } {
    return {
      metrics: this.getStats().metrics,
      currentStrategy: this._config.strategyType,
    };
  }

  reset(): void {
    this.currentIndex.clear();
    this.lastRebalance = Date.now();
    this._config.weights = {};
  }

  getReport(): string {
    const snapshot = this.getSnapshot();

    return JSON.stringify({
      type: 'QueueStrategy',
      version: 'V98',
      timestamp: new Date().toISOString(),
      strategy: snapshot.currentStrategy,
      metrics: snapshot.metrics,
    }, null, 2);
  }

  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: 'V98',
      metrics: {
        ...this.getStats().metrics,
        currentStrategy: this._config.strategyType,
      },
    };
  }
}
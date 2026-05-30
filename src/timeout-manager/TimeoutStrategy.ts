export type StrategyConfig = {
  baseTimeout: number;
  growthFactor: number;
  maxRetries: number;
  enableJitter: boolean;
  jitterFactor: number;
};

export type StrategyType = 'linear' | 'exponential' | 'fixed' | 'adaptive';

export type StrategyMetrics = {
  totalCalculations: number;
  strategyUsage: Record<StrategyType, number>;
  averageTimeout: number;
  totalRetries: number;
};

const DEFAULT_CONFIG: StrategyConfig = {
  baseTimeout: 1000,
  growthFactor: 2,
  maxRetries: 3,
  enableJitter: true,
  jitterFactor: 0.1,
};

export class TimeoutStrategy {
  private config: StrategyConfig;
  private metrics: StrategyMetrics;
  private currentStrategy: StrategyType = 'exponential';

  constructor(config: Partial<StrategyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalCalculations: 0,
      strategyUsage: { linear: 0, exponential: 0, fixed: 0, adaptive: 0 },
      averageTimeout: 0,
      totalRetries: 0,
    };
  }

  calculate(
    baseTimeout: number,
    attempt: number,
    strategy?: StrategyType
  ): number {
    const useStrategy = strategy ?? this.currentStrategy;
    let calculatedTimeout: number;

    switch (useStrategy) {
      case 'linear':
        calculatedTimeout = baseTimeout * (1 + attempt);
        break;
      case 'exponential':
        calculatedTimeout = baseTimeout * Math.pow(this.config.growthFactor, attempt);
        break;
      case 'fixed':
        calculatedTimeout = baseTimeout;
        break;
      case 'adaptive':
        calculatedTimeout = baseTimeout * (1 + attempt * 0.5);
        break;
      default:
        calculatedTimeout = baseTimeout;
    }

    calculatedTimeout = Math.min(calculatedTimeout, baseTimeout * 10);

    if (this.config.enableJitter) {
      const jitter = calculatedTimeout * this.config.jitterFactor * Math.random();
      calculatedTimeout += jitter;
    }

    this.metrics.totalCalculations++;
    this.metrics.strategyUsage[useStrategy]++;
    this.metrics.averageTimeout =
      (this.metrics.averageTimeout * (this.metrics.totalCalculations - 1) + calculatedTimeout) /
      this.metrics.totalCalculations;

    return Math.round(calculatedTimeout);
  }

  getDefault(): number {
    return this.config.baseTimeout;
  }

  apply(timeout: number, attempt: number): number {
    return this.calculate(timeout, attempt, this.currentStrategy);
  }

  getStrategy(): StrategyType {
    return this.currentStrategy;
  }

  setStrategy(strategy: StrategyType): void {
    this.currentStrategy = strategy;
  }

  getSnapshot(): { metrics: StrategyMetrics } {
    return {
      metrics: {
        ...this.metrics,
        strategyUsage: { ...this.metrics.strategyUsage },
      },
    };
  }

  reset(): void {
    this.metrics = {
      totalCalculations: 0,
      strategyUsage: { linear: 0, exponential: 0, fixed: 0, adaptive: 0 },
      averageTimeout: 0,
      totalRetries: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const usage = snapshot.metrics.strategyUsage;
    return `TimeoutStrategy Report:
  Total Calculations: ${snapshot.metrics.totalCalculations}
  Current Strategy: ${this.currentStrategy}
  Strategy Usage:
    Linear: ${usage.linear}
    Exponential: ${usage.exponential}
    Fixed: ${usage.fixed}
    Adaptive: ${usage.adaptive}
  Average Timeout: ${snapshot.metrics.averageTimeout.toFixed(2)}ms`;
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}
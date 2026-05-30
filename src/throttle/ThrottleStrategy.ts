/**
 * ThrottleStrategy.ts - Throttle strategy management for doc-editor
 * Version 1.0.6
 */

export type ThrottleStrategyType = 'aggressive' | 'moderate' | 'conservative' | 'adaptive';

export type ThrottleStrategyConfig = {
  type: ThrottleStrategyType;
  enabled: boolean;
  baseDelay: number;
  maxDelay: number;
  scalingFactor: number;
  cooldownMs: number;
  onStrategyApply?: (key: string, delay: number, strategy: ThrottleStrategyType) => void;
};

export interface StrategyResult {
  delay: number;
  strategy: ThrottleStrategyType;
  calculated: boolean;
  applied: boolean;
}

export interface StrategyMetrics {
  totalCalculations: number;
  strategySelections: Record<ThrottleStrategyType, number>;
  delaysApplied: number;
  averageDelay: number;
}

export class ThrottleStrategy {
  private _config: ThrottleStrategyConfig;
  private calculations = 0;
  private selections: Record<ThrottleStrategyType, number> = {
    aggressive: 0,
    moderate: 0,
    conservative: 0,
    adaptive: 0,
  };
  private delaysApplied = 0;
  private totalDelay = 0;
  private requestCounts: Map<string, number[]> = new Map();
  private cooldowns: Map<string, number> = new Map();

  constructor(config: Partial<ThrottleStrategyConfig>) {
    this._config = {
      type: 'moderate',
      enabled: true,
      baseDelay: 100,
      maxDelay: 5000,
      scalingFactor: 1.5,
      cooldownMs: 1000,
      ...config,
    };
  }

  get config(): ThrottleStrategyConfig {
    return { ...this._config };
  }

  set config(value: Partial<ThrottleStrategyConfig>) {
    this._config = { ...this._config, ...value };
  }

  calculate(key: string, requestCount: number): number {
    if (!this._config.enabled) return 0;

    this.calculations++;
    const now = Date.now();
    const history = this.requestCounts.get(key) || [];
    const recentHistory = history.filter(ts => ts > now - 60000);
    this.requestCounts.set(key, [...recentHistory, now]);

    const cooldown = this.cooldowns.get(key) || 0;
    if (cooldown > now) return 0;

    let delay = this._config.baseDelay;

    switch (this._config.type) {
      case 'aggressive':
        delay = this._config.baseDelay * Math.pow(this._config.scalingFactor, Math.min(requestCount, 10));
        break;
      case 'moderate':
        delay = this._config.baseDelay * (1 + Math.log(requestCount + 1));
        break;
      case 'conservative':
        delay = this._config.baseDelay * (1 + requestCount * 0.1);
        break;
      case 'adaptive':
        const avgCount = recentHistory.length / 60 || 1;
        delay = this._config.baseDelay * Math.pow(this._config.scalingFactor, Math.min(avgCount, 10));
        break;
    }

    return Math.min(delay, this._config.maxDelay);
  }

  select(type: ThrottleStrategyType): void {
    this._config.type = type;
    this.selections[type]++;
  }

  getStrategy(): ThrottleStrategyType {
    return this._config.type;
  }

  apply(key: string, requestCount: number): StrategyResult {
    if (!this._config.enabled) {
      return { delay: 0, strategy: this._config.type, calculated: false, applied: false };
    }

    const delay = this.calculate(key, requestCount);
    if (delay > 0) {
      this.delaysApplied++;
      this.totalDelay += delay;
      this.cooldowns.set(key, Date.now() + this._config.cooldownMs);
      this._config.onStrategyApply?.(key, delay, this._config.type);
    }

    return {
      delay,
      strategy: this._config.type,
      calculated: true,
      applied: delay > 0,
    };
  }

  getStats(): StrategyMetrics {
    const averageDelay = this.delaysApplied > 0 ? this.totalDelay / this.delaysApplied : 0;
    return {
      totalCalculations: this.calculations,
      strategySelections: { ...this.selections },
      delaysApplied: this.delaysApplied,
      averageDelay,
    };
  }

  getSnapshot(): { metrics: StrategyMetrics; config: ThrottleStrategyConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  reset(): void {
    this.calculations = 0;
    this.selections = { aggressive: 0, moderate: 0, conservative: 0, adaptive: 0 };
    this.delaysApplied = 0;
    this.totalDelay = 0;
    this.requestCounts.clear();
    this.cooldowns.clear();
  }

  getReport(): string {
    const stats = this.getStats();
    return [
      'Throttle Strategy Report',
      '========================',
      `Type: ${this._config.type}`,
      `Enabled: ${this._config.enabled}`,
      '',
      `Base Delay: ${this._config.baseDelay}ms`,
      `Max Delay: ${this._config.maxDelay}ms`,
      `Scaling Factor: ${this._config.scalingFactor}`,
      `Cooldown: ${this._config.cooldownMs}ms`,
      '',
      `Total Calculations: ${stats.totalCalculations}`,
      `Delays Applied: ${stats.delaysApplied}`,
      `Average Delay: ${stats.averageDelay.toFixed(2)}ms`,
      '',
      'Strategy Selections:',
      `  Aggressive: ${stats.strategySelections.aggressive}`,
      `  Moderate: ${stats.strategySelections.moderate}`,
      `  Conservative: ${stats.strategySelections.conservative}`,
      `  Adaptive: ${stats.strategySelections.adaptive}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: StrategyMetrics; config: ThrottleStrategyConfig } {
    return {
      version: '1.0.6',
      metrics: this.getStats(),
      config: this.config,
    };
  }
}
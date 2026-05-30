/**
 * ThrottlePolicy.ts - Throttle policy management for doc-editor
 * Version 1.0.6
 */

export type ThrottlePolicyConfig = {
  name: string;
  enabled: boolean;
  limits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
    burstAllowance: number;
  };
  delayMs: number;
  backoffMultiplier: number;
  onPolicyApply?: (key: string, delay: number) => void;
};

export interface PolicyResult {
  shouldThrottle: boolean;
  delay: number;
  limit: number;
  applied: boolean;
}

export interface PolicyMetrics {
  totalEvaluations: number;
  throttleDecisions: number;
  delayApplied: number;
  lastEvaluation: number | null;
}

export class ThrottlePolicy {
  private _config: ThrottlePolicyConfig;
  private evaluations = 0;
  private throttleDecisions = 0;
  private delaysApplied = 0;
  private lastEvaluation: number | null = null;
  private requestHistory: Map<string, number[]> = new Map();

  constructor(config: Partial<ThrottlePolicyConfig>) {
    const defaultConfig: ThrottlePolicyConfig = {
      name: 'default',
      enabled: true,
      limits: {
        requestsPerSecond: 60,
        requestsPerMinute: 3000,
        requestsPerHour: 100000,
        burstAllowance: 10,
      },
      delayMs: 100,
      backoffMultiplier: 1.5,
      onPolicyApply: undefined,
    };
    this._config = { ...defaultConfig, ...config };
  }

  get config(): ThrottlePolicyConfig {
    return JSON.parse(JSON.stringify(this._config));
  }

  set config(value: Partial<ThrottlePolicyConfig>) {
    this._config = { ...this._config, ...value };
  }

  shouldThrottle(key: string): boolean {
    if (!this._config.enabled) return false;

    this.evaluations++;
    this.lastEvaluation = Date.now();

    const now = Date.now();
    const history = this.requestHistory.get(key) || [];
    const secondAgo = now - 1000;
    const minuteAgo = now - 60000;
    const hourAgo = now - 3600000;

    const recentSecond = history.filter(ts => ts > secondAgo).length;
    const recentMinute = history.filter(ts => ts > minuteAgo).length;
    const recentHour = history.filter(ts => ts > hourAgo).length;

    if (recentSecond >= this._config.limits.requestsPerSecond) {
      this.throttleDecisions++;
      return true;
    }
    if (recentMinute >= this._config.limits.requestsPerMinute) {
      this.throttleDecisions++;
      return true;
    }
    if (recentHour >= this._config.limits.requestsPerHour) {
      this.throttleDecisions++;
      return true;
    }

    return false;
  }

  getLimit(key: string): number {
    const now = Date.now();
    const history = this.requestHistory.get(key) || [];
    const secondAgo = now - 1000;
    const recentSecond = history.filter(ts => ts > secondAgo).length;
    return Math.max(0, this._config.limits.requestsPerSecond - recentSecond);
  }

  getDelay(key: string): number {
    if (!this.shouldThrottle(key)) return 0;

    const history = this.requestHistory.get(key) || [];
    const now = Date.now();
    const secondAgo = now - 1000;
    const recentCount = history.filter(ts => ts > secondAgo).length;

    if (recentCount >= this._config.limits.requestsPerSecond) {
      const excessRatio = recentCount / this._config.limits.requestsPerSecond;
      return Math.floor(this._config.delayMs * Math.pow(this._config.backoffMultiplier, excessRatio));
    }

    return this._config.delayMs;
  }

  apply(key: string): PolicyResult {
    const shouldThrottle = this.shouldThrottle(key);
    const delay = shouldThrottle ? this.getDelay(key) : 0;
    const limit = this.getLimit(key);

    if (!shouldThrottle) {
      const now = Date.now();
      const history = this.requestHistory.get(key) || [];
      history.push(now);
      this.requestHistory.set(key, history);
    }

    if (delay > 0) {
      this.delaysApplied++;
      this._config.onPolicyApply?.(key, delay);
    }

    return {
      shouldThrottle,
      delay,
      limit,
      applied: delay > 0,
    };
  }

  getSnapshot(): { metrics: PolicyMetrics; config: ThrottlePolicyConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  getStats(): PolicyMetrics {
    return {
      totalEvaluations: this.evaluations,
      throttleDecisions: this.throttleDecisions,
      delayApplied: this.delaysApplied,
      lastEvaluation: this.lastEvaluation,
    };
  }

  reset(): void {
    this.evaluations = 0;
    this.throttleDecisions = 0;
    this.delaysApplied = 0;
    this.lastEvaluation = null;
    this.requestHistory.clear();
  }

  getReport(): string {
    const stats = this.getStats();
    return [
      'Throttle Policy Report',
      '======================',
      `Name: ${this._config.name}`,
      `Enabled: ${this._config.enabled}`,
      '',
      'Limits:',
      `  Per Second: ${this._config.limits.requestsPerSecond}`,
      `  Per Minute: ${this._config.limits.requestsPerMinute}`,
      `  Per Hour: ${this._config.limits.requestsPerHour}`,
      `  Burst Allowance: ${this._config.limits.burstAllowance}`,
      '',
      `Delay: ${this._config.delayMs}ms`,
      `Backoff Multiplier: ${this._config.backoffMultiplier}`,
      '',
      `Total Evaluations: ${stats.totalEvaluations}`,
      `Throttle Decisions: ${stats.throttleDecisions}`,
      `Delays Applied: ${stats.delayApplied}`,
      `Last Evaluation: ${stats.lastEvaluation ? new Date(stats.lastEvaluation).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: PolicyMetrics; config: ThrottlePolicyConfig } {
    return {
      version: '1.0.6',
      metrics: this.getStats(),
      config: this.config,
    };
  }
}
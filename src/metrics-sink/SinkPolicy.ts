/**
 * SinkPolicy.ts - Policy management for metric sinks
 * Version 1.0.7
 */

export type PolicyConfig = {
  name: string;
  enabled: boolean;
  priority: number;
  conditions: {
    maxQueueSize: number;
    maxFailureRate: number;
    maxLatencyMs: number;
    minSuccessRate: number;
  };
  actions: {
    enableRetry: boolean;
    enableFallback: boolean;
    enableAlert: boolean;
    fallbackEndpoint?: string;
  };
  onApply?: (result: PolicyResult) => void;
};

export interface PolicyResult {
  shouldSink: boolean;
  reason: string;
  priority: number;
  action: 'send' | 'retry' | 'fallback' | 'drop';
  metadata?: Record<string, unknown>;
}

export interface PolicyMetrics {
  totalEvaluations: number;
  sinkAllowed: number;
  sinkBlocked: number;
  retriesTriggered: number;
  fallbacksTriggered: number;
  lastEvaluation: number | null;
}

export class SinkPolicy {
  private _config: PolicyConfig;
  private totalEvaluations = 0;
  private sinkAllowed = 0;
  private sinkBlocked = 0;
  private retriesTriggered = 0;
  private fallbacksTriggered = 0;
  private lastEvaluation: number | null = null;

  constructor(config: Partial<PolicyConfig> = {}) {
    const defaultConfig: PolicyConfig = {
      name: 'default',
      enabled: true,
      priority: 1,
      conditions: {
        maxQueueSize: 10000,
        maxFailureRate: 0.1,
        maxLatencyMs: 5000,
        minSuccessRate: 0.9,
      },
      actions: {
        enableRetry: true,
        enableFallback: false,
        enableAlert: true,
        fallbackEndpoint: undefined,
      },
      onApply: undefined,
    };
    this._config = { ...defaultConfig, ...config };
  }

  get config(): PolicyConfig {
    return JSON.parse(JSON.stringify(this._config));
  }

  set config(value: Partial<PolicyConfig>) {
    this._config = { ...this._config, ...value };
  }

  shouldSink(context: {
    queueSize?: number;
    failureRate?: number;
    latencyMs?: number;
    successRate?: number;
  }): boolean {
    if (!this._config.enabled) {
      return true;
    }

    this.totalEvaluations++;
    this.lastEvaluation = Date.now();

    const {
      queueSize = 0,
      failureRate = 0,
      latencyMs = 0,
      successRate = 1,
    } = context;

    if (queueSize >= this._config.conditions.maxQueueSize) {
      return false;
    }

    if (failureRate >= this._config.conditions.maxFailureRate) {
      return false;
    }

    if (latencyMs >= this._config.conditions.maxLatencyMs) {
      return false;
    }

    if (successRate < this._config.conditions.minSuccessRate) {
      return false;
    }

    return true;
  }

  getPriority(): number {
    return this._config.priority;
  }

  apply(context: {
    queueSize?: number;
    failureRate?: number;
    latencyMs?: number;
    successRate?: number;
  }): PolicyResult {
    const allowed = this.shouldSink(context);
    
    let action: PolicyResult['action'] = 'send';
    let reason = 'Normal operation';

    if (!allowed) {
      const {
        queueSize = 0,
        failureRate = 0,
        latencyMs = 0,
        successRate = 1,
      } = context;

      if (queueSize >= this._config.conditions.maxQueueSize) {
        action = 'drop';
        reason = `Queue size ${queueSize} exceeds max ${this._config.conditions.maxQueueSize}`;
      } else if (failureRate >= this._config.conditions.maxFailureRate) {
        action = this._config.actions.enableRetry ? 'retry' : 'drop';
        reason = `Failure rate ${failureRate} exceeds max ${this._config.conditions.maxFailureRate}`;
        if (action === 'retry') this.retriesTriggered++;
      } else if (latencyMs >= this._config.conditions.maxLatencyMs) {
        action = this._config.actions.enableFallback ? 'fallback' : 'drop';
        reason = `Latency ${latencyMs}ms exceeds max ${this._config.conditions.maxLatencyMs}ms`;
        if (action === 'fallback') this.fallbacksTriggered++;
      } else {
        action = 'drop';
        reason = `Success rate ${successRate} below min ${this._config.conditions.minSuccessRate}`;
      }
    }

    if (allowed) {
      this.sinkAllowed++;
    } else {
      this.sinkBlocked++;
    }

    const result: PolicyResult = {
      shouldSink: allowed,
      reason,
      priority: this._config.priority,
      action,
      metadata: {
        configName: this._config.name,
        conditions: this._config.conditions,
      },
    };

    this._config.onApply?.(result);

    return result;
  }

  getPolicy(): PolicyConfig {
    return this.config;
  }

  getSnapshot(): { metrics: PolicyMetrics; config: PolicyConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  getStats(): PolicyMetrics {
    return {
      totalEvaluations: this.totalEvaluations,
      sinkAllowed: this.sinkAllowed,
      sinkBlocked: this.sinkBlocked,
      retriesTriggered: this.retriesTriggered,
      fallbacksTriggered: this.fallbacksTriggered,
      lastEvaluation: this.lastEvaluation,
    };
  }

  reset(): void {
    this.totalEvaluations = 0;
    this.sinkAllowed = 0;
    this.sinkBlocked = 0;
    this.retriesTriggered = 0;
    this.fallbacksTriggered = 0;
    this.lastEvaluation = null;
  }

  getReport(): string {
    const stats = this.getStats();
    return [
      'Sink Policy Report',
      '==================',
      `Name: ${this._config.name}`,
      `Enabled: ${this._config.enabled}`,
      `Priority: ${this._config.priority}`,
      '',
      'Conditions:',
      `  Max Queue Size: ${this._config.conditions.maxQueueSize}`,
      `  Max Failure Rate: ${this._config.conditions.maxFailureRate}`,
      `  Max Latency: ${this._config.conditions.maxLatencyMs}ms`,
      `  Min Success Rate: ${this._config.conditions.minSuccessRate}`,
      '',
      'Actions:',
      `  Enable Retry: ${this._config.actions.enableRetry}`,
      `  Enable Fallback: ${this._config.actions.enableFallback}`,
      `  Enable Alert: ${this._config.actions.enableAlert}`,
      '',
      `Total Evaluations: ${stats.totalEvaluations}`,
      `Sink Allowed: ${stats.sinkAllowed}`,
      `Sink Blocked: ${stats.sinkBlocked}`,
      `Retries Triggered: ${stats.retriesTriggered}`,
      `Fallbacks Triggered: ${stats.fallbacksTriggered}`,
      `Last Evaluation: ${stats.lastEvaluation ? new Date(stats.lastEvaluation).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: PolicyMetrics; config: PolicyConfig } {
    return {
      version: '1.0.7',
      metrics: this.getStats(),
      config: this.config,
    };
  }
}
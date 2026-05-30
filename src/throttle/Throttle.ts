/**
 * Throttle.ts - Throttle control for doc-editor
 * Version 1.0.6
 */

export type ThrottleConfig = {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
  strategy: 'fixed' | 'sliding' | 'burst';
  onThrottle?: (key: string, count: number) => void;
};

export interface ThrottleMetrics {
  totalRequests: number;
  throttledRequests: number;
  passedRequests: number;
  activeWindows: number;
  lastThrottleTime: number | null;
}

export class Throttle {
  private _config: ThrottleConfig;
  private requestCounts: Map<string, number[]> = new Map();
  private totalRequests = 0;
  private throttledRequests = 0;
  private passedRequests = 0;
  private activeWindows = 0;
  private lastThrottleTime: number | null = null;

  constructor(config: Partial<ThrottleConfig> = {}) {
    this._config = {
      enabled: true,
      maxRequests: 100,
      windowMs: 1000,
      strategy: 'fixed',
      onThrottle: undefined,
      ...config,
    };
  }

  get config(): ThrottleConfig {
    return { ...this._config };
  }

  set config(value: Partial<ThrottleConfig>) {
    this._config = { ...this._config, ...value };
  }

  throttle(key: string): boolean {
    if (!this._config.enabled) {
      this.totalRequests++;
      this.passedRequests++;
      return false;
    }

    this.totalRequests++;
    const now = Date.now();
    const windowStart = now - this._config.windowMs;
    let counts = this.requestCounts.get(key) || [];

    switch (this._config.strategy) {
      case 'sliding':
        counts = counts.filter(ts => ts > windowStart);
        break;
      case 'burst':
        if (counts.length >= this._config.maxRequests) {
          const burstStart = now - 100;
          const burstCount = counts.filter(ts => ts > burstStart).length;
          if (burstCount >= this._config.maxRequests * 0.8) {
            this.throttledRequests++;
            this.lastThrottleTime = now;
            this._config.onThrottle?.(key, burstCount);
            return true;
          }
        }
        break;
      case 'fixed':
      default:
        const windowKey = Math.floor(now / this._config.windowMs);
        const existingWindow = counts.filter(ts => Math.floor(ts / this._config.windowMs) === windowKey);
        counts = existingWindow;
        break;
    }

    if (counts.length >= this._config.maxRequests) {
      this.throttledRequests++;
      this.lastThrottleTime = now;
      this._config.onThrottle?.(key, counts.length);
      return true;
    }

    counts.push(now);
    this.requestCounts.set(key, counts);
    this.passedRequests++;
    this.activeWindows = this.requestCounts.size;
    return false;
  }

  check(key: string): boolean {
    return this.throttle(key);
  }

  getStatus(): { enabled: boolean; activeKeys: number; windowMs: number; maxRequests: number } {
    return {
      enabled: this._config.enabled,
      activeKeys: this.requestCounts.size,
      windowMs: this._config.windowMs,
      maxRequests: this._config.maxRequests,
    };
  }

  getStats(): ThrottleMetrics {
    return {
      totalRequests: this.totalRequests,
      throttledRequests: this.throttledRequests,
      passedRequests: this.passedRequests,
      activeWindows: this.activeWindows,
      lastThrottleTime: this.lastThrottleTime,
    };
  }

  getSnapshot(): { metrics: ThrottleMetrics; config: ThrottleConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  reset(): void {
    this.requestCounts.clear();
    this.totalRequests = 0;
    this.throttledRequests = 0;
    this.passedRequests = 0;
    this.activeWindows = 0;
    this.lastThrottleTime = null;
  }

  getReport(): string {
    const stats = this.getStats();
    return [
      'Throttle Report',
      '===============',
      `Enabled: ${this._config.enabled}`,
      `Strategy: ${this._config.strategy}`,
      `Window: ${this._config.windowMs}ms`,
      `Max Requests: ${this._config.maxRequests}`,
      '',
      `Total Requests: ${stats.totalRequests}`,
      `Passed: ${stats.passedRequests}`,
      `Throttled: ${stats.throttledRequests}`,
      `Active Windows: ${stats.activeWindows}`,
      `Last Throttle: ${stats.lastThrottleTime ? new Date(stats.lastThrottleTime).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: ThrottleMetrics; config: ThrottleConfig } {
    return {
      version: '1.0.6',
      metrics: this.getStats(),
      config: this.config,
    };
  }
}
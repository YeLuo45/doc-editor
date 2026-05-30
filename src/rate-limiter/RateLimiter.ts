export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
  strategy?: 'sliding' | 'fixed';
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

export class RateLimiter {
  readonly config: RateLimiterConfig;
  private requests: Map<string, RequestRecord[]> = new Map();
  private totalRequests = 0;
  private blockedRequests = 0;

  constructor(config: RateLimiterConfig) {
    this.config = { strategy: 'sliding', ...config };
  }

  limit(identifier: string, count = 1): boolean {
    const now = Date.now();
    const records = this.requests.get(identifier) || [];
    const windowStart = now - this.config.windowMs;

    const validRecords = records.filter(r => r.timestamp > windowStart);
    const currentCount = validRecords.reduce((sum, r) => sum + r.count, 0);

    if (currentCount + count > this.config.maxRequests) {
      this.blockedRequests++;
      return false;
    }

    validRecords.push({ timestamp: now, count });
    this.requests.set(identifier, validRecords);
    this.totalRequests += count;
    return true;
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const records = this.requests.get(identifier) || [];
    const windowStart = now - this.config.windowMs;

    const validRecords = records.filter(r => r.timestamp > windowStart);
    const currentCount = validRecords.reduce((sum, r) => sum + r.count, 0);
    const remaining = Math.max(0, this.config.maxRequests - currentCount);

    let resetIn = 0;
    if (validRecords.length > 0) {
      const oldest = Math.min(...validRecords.map(r => r.timestamp));
      resetIn = Math.max(0, (oldest + this.config.windowMs) - now);
    }

    return { allowed: remaining > 0, remaining, resetIn };
  }

  getStatus(): { healthy: boolean; message: string } {
    const totalIdentifiers = this.requests.size;
    const activeIdentifiers = [...this.requests.entries()].filter(([_, records]) => {
      const now = Date.now();
      return records.some(r => r.timestamp > now - this.config.windowMs);
    }).length;

    return {
      healthy: true,
      message: `${activeIdentifiers} active identifiers, ${totalIdentifiers} total tracked`,
    };
  }

  getStats() {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    let activeInWindow = 0;

    this.requests.forEach(records => {
      activeInWindow += records.filter(r => r.timestamp > windowStart).reduce((sum, r) => sum + r.count, 0);
    });

    return {
      totalRequests: this.totalRequests,
      blockedRequests: this.blockedRequests,
      trackedIdentifiers: this.requests.size,
      activeInWindow,
      limit: this.config.maxRequests,
      windowMs: this.config.windowMs,
    };
  }

  getSnapshot() {
    return {
      metrics: this.getStats(),
      identifiers: [...this.requests.entries()].map(([id, records]) => ({
        id,
        records: records.length,
      })),
    };
  }

  reset(): void {
    this.requests.clear();
    this.totalRequests = 0;
    this.blockedRequests = 0;
  }

  getReport(): string {
    const stats = this.getStats();
    return `RateLimiter Report: ${stats.totalRequests} total requests, ${stats.blockedRequests} blocked, ${stats.trackedIdentifiers} identifiers tracked`;
  }

  exportMetrics() {
    return {
      version: '1.0.0',
      ...this.getStats(),
    };
  }
}
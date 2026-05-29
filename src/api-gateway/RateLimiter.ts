/**
 * RateLimiter.ts - V78 Rate Limiter
 * Manages API request rate limiting
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  enableBurst: boolean;
  burstMultiplier: number;
  enableThrottling: boolean;
  blockDuration: number;
}

type RateLimiterConfig = RateLimitConfig;

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockedUntil?: number;
}

export interface RateLimitStats {
  totalChecks: number;
  allowed: number;
  denied: number;
  blocked: number;
  currentWindowRequests: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private windowStart: number = Date.now();
  
  public readonly config: RateLimiterConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequests: config.maxRequests ?? 100,
      windowMs: config.windowMs ?? 60000,
      enableBurst: config.enableBurst ?? false,
      burstMultiplier: config.burstMultiplier ?? 3,
      enableThrottling: config.enableThrottling ?? true,
      blockDuration: config.blockDuration ?? 300000,
    };
  }

  /**
   * Apply rate limit to a key (IP, user, API key, etc.)
   */
  limit(key: string, requestCount: number = 1): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.limits.get(key) || { count: 0, resetTime: now + this.config.windowMs, blocked: false };

    if (this.isWindowExpired(entry.resetTime, now)) {
      entry.count = 0;
      entry.resetTime = now + this.config.windowMs;
      entry.blocked = false;
      entry.blockedUntil = undefined;
    }

    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      this.limits.set(key, entry);
      return { allowed: false, remaining: 0, resetIn: entry.blockedUntil - now };
    }

    if (entry.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
      entry.blocked = false;
      entry.blockedUntil = undefined;
    }

    const effectiveMax = this.config.enableBurst 
      ? this.config.maxRequests * this.config.burstMultiplier 
      : this.config.maxRequests;

    if (entry.count + requestCount > effectiveMax) {
      entry.blocked = true;
      entry.blockedUntil = now + this.config.blockDuration;
      this.limits.set(key, entry);
      return { allowed: false, remaining: 0, resetIn: this.config.blockDuration };
    }

    entry.count += requestCount;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: Math.max(0, effectiveMax - entry.count),
      resetIn: Math.max(0, entry.resetTime - now),
    };
  }

  /**
   * Check if a request is allowed without consuming quota
   */
  check(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.limits.get(key) || { count: 0, resetTime: now + this.config.windowMs, blocked: false };

    if (this.isWindowExpired(entry.resetTime, now)) {
      return { allowed: true, remaining: this.config.maxRequests, resetIn: 0 };
    }

    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      return { allowed: false, remaining: 0, resetIn: entry.blockedUntil - now };
    }

    const effectiveMax = this.config.enableBurst 
      ? this.config.maxRequests * this.config.burstMultiplier 
      : this.config.maxRequests;

    return {
      allowed: entry.count < effectiveMax,
      remaining: Math.max(0, effectiveMax - entry.count),
      resetIn: Math.max(0, entry.resetTime - now),
    };
  }

  private isWindowExpired(resetTime: number, now: number): boolean {
    return now >= resetTime;
  }

  /**
   * Get current limits for a key
   */
  getLimits(key?: string): RateLimitEntry | Map<string, RateLimitEntry> {
    if (key) {
      return this.limits.get(key) || { count: 0, resetTime: 0, blocked: false };
    }
    return new Map(this.limits);
  }

  /**
   * Get rate limiter status
   */
  getStatus(): { totalKeys: number; blockedKeys: number; windowRequests: number } {
    let blockedKeys = 0;
    let totalRequests = 0;

    for (const entry of this.limits.values()) {
      if (entry.blocked) blockedKeys++;
      totalRequests += entry.count;
    }

    return {
      totalKeys: this.limits.size,
      blockedKeys,
      windowRequests: totalRequests,
    };
  }

  /**
   * Get a snapshot of rate limiter state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    const status = this.getStatus();
    return {
      metrics: {
        totalKeys: status.totalKeys,
        blockedKeys: status.blockedKeys,
        windowRequests: status.windowRequests,
        config: {
          maxRequests: this.config.maxRequests,
          windowMs: this.config.windowMs,
          enableBurst: this.config.enableBurst,
          burstMultiplier: this.config.burstMultiplier,
        },
      },
    };
  }

  /**
   * Reset rate limiter state
   */
  reset(): void {
    this.limits.clear();
    this.windowStart = Date.now();
  }

  /**
   * Generate a detailed report
   */
  getReport(): string {
    const status = this.getStatus();
    return [
      '=== Rate Limiter Report ===',
      `Total Keys: ${status.totalKeys}`,
      `Blocked Keys: ${status.blockedKeys}`,
      `Window Requests: ${status.windowRequests}`,
      `Config: maxRequests=${this.config.maxRequests}, windowMs=${this.config.windowMs}`,
      `Burst: enabled=${this.config.enableBurst}, multiplier=${this.config.burstMultiplier}`,
      `Throttling: ${this.config.enableThrottling}`,
      '',
      '--- Blocked Keys ---',
      ...Array.from(this.limits.entries())
        .filter(([, entry]) => entry.blocked)
        .map(([key]) => `- ${key}`),
    ].join('\n');
  }

  /**
   * Export metrics for monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}
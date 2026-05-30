export interface TokenBucketConfig {
  capacity: number;
  refillRate: number;
  initialTokens?: number;
}

interface BucketState {
  tokens: number;
  lastRefill: number;
}

export class TokenBucket {
  readonly config: TokenBucketConfig;
  private buckets: Map<string, BucketState> = new Map();
  private totalConsumed = 0;
  private totalRefilled = 0;

  constructor(config: TokenBucketConfig) {
    this.config = {
      initialTokens: config.capacity,
      ...config,
    };
  }

  private getOrCreateBucket(identifier: string): BucketState {
    if (!this.buckets.has(identifier)) {
      this.buckets.set(identifier, {
        tokens: this.config.initialTokens ?? this.config.capacity,
        lastRefill: Date.now(),
      });
    }
    return this.buckets.get(identifier)!;
  }

  private refill(identifier: string): void {
    const bucket = this.getOrCreateBucket(identifier);
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = Math.floor(elapsed * this.config.refillRate);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.config.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
      this.totalRefilled += tokensToAdd;
    }
  }

  consume(identifier: string, tokens = 1): boolean {
    this.refill(identifier);
    const bucket = this.buckets.get(identifier)!;

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      this.totalConsumed += tokens;
      return true;
    }
    return false;
  }

  fill(identifier: string, tokens: number): void {
    const bucket = this.getOrCreateBucket(identifier);
    bucket.tokens = Math.min(this.config.capacity, bucket.tokens + tokens);
  }

  getTokens(identifier: string): number {
    this.refill(identifier);
    return this.buckets.get(identifier)?.tokens ?? this.config.initialTokens ?? this.config.capacity;
  }

  getRefillRate(): number {
    return this.config.refillRate;
  }

  getStatus(): { healthy: boolean; message: string } {
    const identifiers = [...this.buckets.keys()];
    const totalTokens = identifiers.reduce((sum, id) => sum + this.getTokens(id), 0);
    const avgTokens = identifiers.length > 0 ? totalTokens / identifiers.length : 0;

    return {
      healthy: true,
      message: `${identifiers.length} buckets, avg ${avgTokens.toFixed(2)} tokens`,
    };
  }

  getStats() {
    return {
      totalBuckets: this.buckets.size,
      totalConsumed: this.totalConsumed,
      totalRefilled: this.totalRefilled,
      capacity: this.config.capacity,
      refillRate: this.config.refillRate,
    };
  }

  getSnapshot() {
    return {
      metrics: this.getStats(),
      buckets: [...this.buckets.entries()].map(([id, bucket]) => ({
        id,
        tokens: Math.round(bucket.tokens * 100) / 100,
        lastRefill: bucket.lastRefill,
      })),
    };
  }

  reset(): void {
    this.buckets.clear();
    this.totalConsumed = 0;
    this.totalRefilled = 0;
  }

  getReport(): string {
    const stats = this.getStats();
    return `TokenBucket Report: ${stats.totalBuckets} buckets, ${stats.totalConsumed} consumed, ${stats.totalRefilled} refilled`;
  }

  exportMetrics() {
    return {
      version: '1.0.0',
      ...this.getStats(),
    };
  }
}
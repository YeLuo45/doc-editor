/**
 * BackoffStrategy.ts
 * V94 Retry Queue - Backoff Strategy Implementation
 * Implements exponential backoff with jitter for retry operations
 */

export type BackoffType = 'exponential' | 'linear' | 'fixed' | 'fibonacci';

export interface BackoffConfig {
  type: BackoffType;
  initialDelay: number;
  maxDelay: number;
  multiplier?: number;
  jitter?: number;
}

export interface BackoffSnapshot {
  strategy: BackoffType;
  currentDelay: number;
  attempt: number;
  initialDelay: number;
  maxDelay: number;
}

export class BackoffStrategy {
  public readonly config: BackoffConfig;
  private currentDelay: number;
  private attempt: number;
  private readonly initialDelay: number;
  private readonly maxDelay: number;

  constructor(config: BackoffConfig) {
    this.config = { ...config };
    this.initialDelay = config.initialDelay;
    this.maxDelay = config.maxDelay;
    this.currentDelay = config.initialDelay;
    this.attempt = 0;
  }

  /**
   * Calculate the backoff delay for a given attempt
   */
  public calculate(attempt: number): number {
    this.attempt = attempt;
    const base = this.calculateBaseDelay(attempt);
    const jitter = this.config.jitter ? this.randomJitter() : 0;
    this.currentDelay = Math.min(base + jitter, this.maxDelay);
    return this.currentDelay;
  }

  /**
   * Get next delay without incrementing attempt counter
   */
  public getNextDelay(): number {
    const base = this.calculateBaseDelay(this.attempt + 1);
    const jitter = this.config.jitter ? this.randomJitter() : 0;
    return Math.min(base + jitter, this.maxDelay);
  }

  /**
   * Reset strategy to initial state
   */
  public reset(): void {
    this.attempt = 0;
    this.currentDelay = this.initialDelay;
  }

  /**
   * Get current strategy type
   */
  public getStrategy(): BackoffType {
    return this.config.type;
  }

  /**
   * Get current snapshot of strategy state
   */
  public getSnapshot(): { metrics: BackoffSnapshot } {
    return {
      metrics: {
        strategy: this.config.type,
        currentDelay: this.currentDelay,
        attempt: this.attempt,
        initialDelay: this.initialDelay,
        maxDelay: this.maxDelay
      }
    };
  }

  /**
   * Generate human-readable report
   */
  public getReport(): string {
    return `BackoffStrategy[${this.config.type}]: attempt=${this.attempt}, ` +
      `currentDelay=${this.currentDelay}ms, initial=${this.initialDelay}ms, max=${this.maxDelay}ms`;
  }

  /**
   * Export metrics for external monitoring
   */
  public exportMetrics(): { version: string } {
    return {
      version: 'V94-1.0',
      strategy: this.config.type,
      currentDelay: this.currentDelay,
      attempt: this.attempt,
      initialDelay: this.initialDelay,
      maxDelay: this.maxDelay
    };
  }

  private calculateBaseDelay(attempt: number): number {
    const { type, multiplier = 2 } = this.config;

    switch (type) {
      case 'exponential':
        return Math.min(this.initialDelay * Math.pow(multiplier, attempt), this.maxDelay);

      case 'linear':
        return Math.min(this.initialDelay + (this.initialDelay * attempt), this.maxDelay);

      case 'fixed':
        return this.initialDelay;

      case 'fibonacci':
        return Math.min(this.fibonacci(attempt + 1) * this.initialDelay, this.maxDelay);

      default:
        return this.initialDelay;
    }
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }

  private randomJitter(): number {
    if (!this.config.jitter) return 0;
    const jitterRange = this.currentDelay * this.config.jitter;
    return (Math.random() - 0.5) * 2 * jitterRange;
  }
}

export default BackoffStrategy;
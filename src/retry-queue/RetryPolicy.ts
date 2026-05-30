/**
 * RetryPolicy.ts
 * V94 Retry Queue - Retry Policy Implementation
 * Manages retry decisions, delays, and attempt limits
 */

import { BackoffStrategy, BackoffConfig, BackoffType } from './BackoffStrategy';

export interface RetryPolicyConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffType?: BackoffType;
  backoffMultiplier?: number;
  backoffJitter?: number;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

export interface RetryState {
  shouldRetry: boolean;
  delay: number;
  nextAttempt: number;
  maxAttempts: number;
  currentAttempt: number;
}

export interface RetrySnapshot {
  currentAttempt: number;
  maxAttempts: number;
  nextAttempt: number;
  delay: number;
  shouldRetry: boolean;
}

export class RetryPolicy {
  public readonly config: RetryPolicyConfig;
  private currentAttempt: number;
  private backoffStrategy: BackoffStrategy;

  constructor(config: RetryPolicyConfig) {
    this.config = { ...config };
    this.currentAttempt = 0;

    const backoffConfig: BackoffConfig = {
      type: config.backoffType || 'exponential',
      initialDelay: config.initialDelay,
      maxDelay: config.maxDelay,
      multiplier: config.backoffMultiplier,
      jitter: config.backoffJitter
    };
    this.backoffStrategy = new BackoffStrategy(backoffConfig);
  }

  /**
   * Determine if an operation should be retried
   */
  public shouldRetry(error?: Error | string): boolean {
    if (this.currentAttempt >= this.config.maxAttempts) {
      return false;
    }

    if (error) {
      const errorMsg = typeof error === 'string' ? error : error.message;
      const nonRetryable = this.config.nonRetryableErrors || [];

      if (nonRetryable.some(e => errorMsg.includes(e))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the delay before next retry attempt
   */
  public getDelay(): number {
    return this.backoffStrategy.calculate(this.currentAttempt);
  }

  /**
   * Calculate next attempt number and return retry state
   */
  public nextAttempt(error?: Error | string): RetryState {
    const delay = this.getDelay();
    const shouldRetry = this.shouldRetry(error);

    if (shouldRetry) {
      this.currentAttempt++;
    }

    return {
      shouldRetry,
      delay,
      nextAttempt: this.currentAttempt + 1,
      maxAttempts: this.config.maxAttempts,
      currentAttempt: this.currentAttempt
    };
  }

  /**
   * Get maximum allowed attempts
   */
  public getMaxAttempts(): number {
    return this.config.maxAttempts;
  }

  /**
   * Reset policy to initial state
   */
  public reset(): void {
    this.currentAttempt = 0;
    this.backoffStrategy.reset();
  }

  /**
   * Get current snapshot of policy state
   */
  public getSnapshot(): { metrics: RetrySnapshot } {
    return {
      metrics: {
        currentAttempt: this.currentAttempt,
        maxAttempts: this.config.maxAttempts,
        nextAttempt: this.currentAttempt + 1,
        delay: this.getDelay(),
        shouldRetry: this.shouldRetry()
      }
    };
  }

  /**
   * Generate human-readable report
   */
  public getReport(): string {
    return `RetryPolicy: attempt=${this.currentAttempt}/${this.config.maxAttempts}, ` +
      `nextDelay=${this.getDelay()}ms, shouldRetry=${this.shouldRetry()}`;
  }

  /**
   * Export metrics for external monitoring
   */
  public exportMetrics(): { version: string } {
    return {
      version: 'V94-1.0',
      currentAttempt: this.currentAttempt,
      maxAttempts: this.config.maxAttempts,
      nextDelay: this.getDelay(),
      shouldRetry: this.shouldRetry(),
      backoffType: this.config.backoffType || 'exponential'
    };
  }
}

export default RetryPolicy;
/**
 * DLQ Policy - V103
 * Defines policies for dead letter queue behavior
 */

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export interface DLQPolicyConfig {
  enableStore: boolean;
  maxSize: number;
  retentionPeriodMs: number;
  retryPolicy: RetryPolicy;
}

type DLQPolicyConfigAlias = DLQPolicyConfig;

export class DLQPolicy {
  private config: DLQPolicyConfigAlias;

  constructor(config: Partial<DLQPolicyConfig> = {}) {
    this.config = {
      enableStore: config.enableStore ?? true,
      maxSize: config.maxSize ?? 50000,
      retentionPeriodMs: config.retentionPeriodMs ?? 604800000,
      retryPolicy: config.retryPolicy ?? {
        maxRetries: 5,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
        maxDelayMs: 60000
      }
    };
  }

  shouldStore(error: Error, retryCount: number): boolean {
    if (!this.config.enableStore) {
      return false;
    }

    if (retryCount >= this.config.retryPolicy.maxRetries) {
      return true;
    }

    const isPermanentError = this.isPermanentFailure(error);
    return isPermanentError || retryCount >= this.config.retryPolicy.maxRetries;
  }

  getMaxSize(): number {
    return this.config.maxSize;
  }

  getRetryPolicy(): RetryPolicy {
    return { ...this.config.retryPolicy };
  }

  getPolicy(): DLQPolicyConfig {
    return {
      enableStore: this.config.enableStore,
      maxSize: this.config.maxSize,
      retentionPeriodMs: this.config.retentionPeriodMs,
      retryPolicy: { ...this.config.retryPolicy }
    };
  }

  calculateBackoff(retryCount: number): number {
    const { initialDelayMs, backoffMultiplier, maxDelayMs } = this.config.retryPolicy;
    const delay = initialDelayMs * Math.pow(backoffMultiplier, retryCount);
    return Math.min(delay, maxDelayMs);
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        policy: this.getPolicy(),
        calculatedBackoff: this.calculateBackoff(3)
      }
    };
  }

  reset(): void {
    this.config = {
      enableStore: true,
      maxSize: 50000,
      retentionPeriodMs: 604800000,
      retryPolicy: {
        maxRetries: 5,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
        maxDelayMs: 60000
      }
    };
  }

  getReport(): string {
    const policy = this.getPolicy();
    return [
      `DLQ Policy Report`,
      `=================`,
      `Store Enabled: ${policy.enableStore}`,
      `Max Size: ${policy.maxSize}`,
      `Retention: ${policy.retentionPeriodMs}ms`,
      `Retry Policy:`,
      `  Max Retries: ${policy.retryPolicy.maxRetries}`,
      `  Backoff Multiplier: ${policy.retryPolicy.backoffMultiplier}`,
      `  Initial Delay: ${policy.retryPolicy.initialDelayMs}ms`,
      `  Max Delay: ${policy.retryPolicy.maxDelayMs}ms`
    ].join('\n');
  }

  exportMetrics(): { version: string; policy: DLQPolicyConfig } {
    return {
      version: '1.0.3',
      policy: this.getPolicy()
    };
  }

  private isPermanentFailure(error: Error): boolean {
    const permanentErrors = [
      'ValidationError',
      'AuthenticationError',
      'AuthorizationError',
      'InvalidInputError'
    ];
    return permanentErrors.some(perr => error.name === perr || error.message.includes(perr));
  }
}
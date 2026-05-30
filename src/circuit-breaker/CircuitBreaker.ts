/**
 * CircuitBreaker.ts - V101 Circuit Breaker Implementation
 * Manages circuit state (closed/open) with failure tracking
 */

export type CircuitBreakerConfig = {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenMaxAttempts: number;
};

export type CircuitState = 'closed' | 'open' | 'half-open';

export type CircuitBreakerMetrics = {
  failures: number;
  successes: number;
  rejections: number;
  state: CircuitState;
  lastFailure: number | null;
  lastSuccess: number | null;
  openedAt: number | null;
};

export class CircuitBreaker {
  readonly config: CircuitBreakerConfig;
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private rejections: number = 0;
  private lastFailure: number | null = null;
  private lastSuccess: number | null = null;
  private openedAt: number | null = null;
  private halfOpenAttempts: number = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Record a successful operation
   */
  success(): void {
    this.successes++;
    this.lastSuccess = Date.now();
    
    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.close();
      }
    } else if (this.state === 'closed') {
      this.failures = 0;
    }
  }

  /**
   * Record a failed operation
   */
  failure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    
    if (this.state === 'closed') {
      if (this.failures >= this.config.failureThreshold) {
        this.open();
      }
    } else if (this.state === 'half-open') {
      this.open();
    }
  }

  /**
   * Check if circuit allows requests
   */
  isOpen(): boolean {
    if (this.state !== 'open') return false;
    
    const now = Date.now();
    if (this.openedAt && now - this.openedAt >= this.config.timeout) {
      this.halfOpen();
      return false;
    }
    return true;
  }

  /**
   * Check if circuit is closed
   */
  isClosed(): boolean {
    return this.state === 'closed';
  }

  /**
   * Open the circuit (trip it)
   */
  open(): void {
    this.state = 'open';
    this.openedAt = Date.now();
    this.failures = 0;
    this.halfOpenAttempts = 0;
  }

  /**
   * Close the circuit (reset it)
   */
  close(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.halfOpenAttempts = 0;
    this.openedAt = null;
  }

  /**
   * Move to half-open state for recovery testing
   */
  halfOpen(): void {
    this.state = 'half-open';
    this.halfOpenAttempts = 0;
    this.failures = 0;
  }

  /**
   * Get current circuit status
   */
  getStatus(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitBreakerMetrics {
    return {
      failures: this.failures,
      successes: this.successes,
      rejections: this.rejections,
      state: this.state,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      openedAt: this.openedAt,
    };
  }

  /**
   * Reject a request due to open circuit
   */
  reject(): void {
    this.rejections++;
  }

  /**
   * Get snapshot of current metrics state
   */
  getSnapshot(): { metrics: CircuitBreakerMetrics } {
    return {
      metrics: this.getStats(),
    };
  }

  /**
   * Reset all counters and state
   */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.rejections = 0;
    this.lastFailure = null;
    this.lastSuccess = null;
    this.openedAt = null;
    this.halfOpenAttempts = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const state = this.state.toUpperCase();
    const name = this.config.name;
    const fails = this.failures;
    const successes = this.successes;
    const rejects = this.rejections;
    const threshold = this.config.failureThreshold;
    const timeout = this.config.timeout;
    
    return [
      `=== CircuitBreaker Report: ${name} ===`,
      `State: ${state}`,
      `Failures: ${fails}/${threshold}`,
      `Successes: ${successes}`,
      `Rejections: ${rejects}`,
      `Timeout: ${timeout}ms`,
      `Last Failure: ${this.lastFailure ? new Date(this.lastFailure).toISOString() : 'none'}`,
      `Last Success: ${this.lastSuccess ? new Date(this.lastSuccess).toISOString() : 'none'}`,
      `Opened At: ${this.openedAt ? new Date(this.openedAt).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: 'V101',
    };
  }
}

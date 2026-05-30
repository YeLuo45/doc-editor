/**
 * RecoveryStrategy.ts - V101 Recovery Strategy Implementation
 * Manages circuit recovery with exponential backoff
 */

export type RecoveryStrategyConfig = {
  name: string;
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  maxAttempts: number;
  jitter: number;
};

export type RecoveryAttemptResult = {
  success: boolean;
  attempt: number;
  delay: number;
  timestamp: number;
};

export class RecoveryStrategy {
  readonly config: RecoveryStrategyConfig;
  private currentAttempt: number = 0;
  private currentDelay: number;
  private lastAttempt: number | null = null;
  private lastSuccess: number | null = null;
  private attemptHistory: RecoveryAttemptResult[] = [];

  constructor(config: RecoveryStrategyConfig) {
    this.config = config;
    this.currentDelay = config.initialDelay;
  }

  /**
   * Record a recovery attempt
   */
  recordAttempt(success: boolean): void {
    this.lastAttempt = Date.now();
    
    const result: RecoveryAttemptResult = {
      success,
      attempt: this.currentAttempt,
      delay: this.currentDelay,
      timestamp: this.lastAttempt,
    };
    
    this.attemptHistory.push(result);
    
    if (success) {
      this.lastSuccess = this.lastAttempt;
      this.currentAttempt = 0;
      this.currentDelay = this.config.initialDelay;
      this.lastAttempt = null;
    } else {
      this.currentAttempt++;
      this.calculateNextDelay();
    }
  }

  /**
   * Calculate next delay with exponential backoff
   */
  private calculateNextDelay(): void {
    let nextDelay = this.currentDelay * this.config.multiplier;
    
    // Apply jitter
    const jitterRange = nextDelay * this.config.jitter;
    nextDelay += (Math.random() * 2 - 1) * jitterRange;
    
    // Cap at max delay
    this.currentDelay = Math.min(nextDelay, this.config.maxDelay);
  }

  /**
   * Attempt to recover the circuit
   */
  recover(): RecoveryAttemptResult {
    const now = Date.now();
    
    if (this.currentAttempt >= this.config.maxAttempts) {
      return {
        success: false,
        attempt: this.currentAttempt,
        delay: 0,
        timestamp: now,
      };
    }

    return {
      success: false,
      attempt: this.currentAttempt,
      delay: this.currentDelay,
      timestamp: now,
    };
  }

  /**
   * Get current delay before next attempt
   */
  getDelay(): number {
    return this.currentDelay;
  }

  /**
   * Check if more attempts are allowed
   */
  hasAttemptsRemaining(): boolean {
    return this.currentAttempt < this.config.maxAttempts;
  }

  /**
   * Get next attempt number
   */
  nextAttempt(): number {
    return this.currentAttempt + 1;
  }

  /**
   * Get current attempt number
   */
  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  /**
   * Get maximum allowed attempts
   */
  getMaxAttempts(): number {
    return this.config.maxAttempts;
  }

  /**
   * Check if recovery is complete
   */
  isRecovered(): boolean {
    return this.lastSuccess !== null;
  }

  /**
   * Get recovery history
   */
  getHistory(): RecoveryAttemptResult[] {
    return [...this.attemptHistory];
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.attemptHistory.length === 0) return 0;
    const successes = this.attemptHistory.filter(a => a.success).length;
    return successes / this.attemptHistory.length;
  }

  /**
   * Get current status
   */
  getStatus(): {
    currentAttempt: number;
    maxAttempts: number;
    currentDelay: number;
    hasAttemptsRemaining: boolean;
    lastAttempt: number | null;
    lastSuccess: number | null;
    isRecovered: boolean;
  } {
    return {
      currentAttempt: this.currentAttempt,
      maxAttempts: this.config.maxAttempts,
      currentDelay: this.currentDelay,
      hasAttemptsRemaining: this.hasAttemptsRemaining(),
      lastAttempt: this.lastAttempt,
      lastSuccess: this.lastSuccess,
      isRecovered: this.isRecovered(),
    };
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: ReturnType<RecoveryStrategy['getStatus']> } {
    return {
      metrics: this.getStatus(),
    };
  }

  /**
   * Reset recovery state
   */
  reset(): void {
    this.currentAttempt = 0;
    this.currentDelay = this.config.initialDelay;
    this.lastAttempt = null;
    this.lastSuccess = null;
    this.attemptHistory = [];
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const attempts = this.attemptHistory.length;
    const successes = this.attemptHistory.filter(a => a.success).length;
    const rate = (this.getSuccessRate() * 100).toFixed(2);
    
    return [
      `=== RecoveryStrategy Report: ${this.config.name} ===`,
      `Current Attempt: ${this.currentAttempt}/${this.config.maxAttempts}`,
      `Current Delay: ${this.currentDelay}ms`,
      `Total Attempts: ${attempts}`,
      `Successful: ${successes}`,
      `Success Rate: ${rate}%`,
      `Initial Delay: ${this.config.initialDelay}ms`,
      `Max Delay: ${this.config.maxDelay}ms`,
      `Multiplier: ${this.config.multiplier}`,
      `Last Attempt: ${this.lastAttempt ? new Date(this.lastAttempt).toISOString() : 'none'}`,
      `Last Success: ${this.lastSuccess ? new Date(this.lastSuccess).toISOString() : 'none'}`,
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

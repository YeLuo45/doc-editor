/**
 * FailureDetector.ts - V101 Failure Detection Module
 * Detects and tracks failures to determine circuit state
 */

export type FailureDetectorConfig = {
  name: string;
  failureThreshold: number;
  windowSize: number;
  detectionInterval: number;
  minRequestVolume: number;
};

export type FailureDetectionResult = {
  shouldOpen: boolean;
  currentFailureRate: number;
  detectedAt: number;
};

export class FailureDetector {
  readonly config: FailureDetectorConfig;
  private failureCount: number = 0;
  private requestCount: number = 0;
  private recentFailures: number[] = [];
  private isCircuitOpen: boolean = false;
  private lastDetection: number | null = null;

  constructor(config: FailureDetectorConfig) {
    this.config = config;
  }

  /**
   * Record a request result
   */
  recordRequest(success: boolean): void {
    this.requestCount++;
    
    if (!success) {
      this.failureCount++;
      this.recentFailures.push(Date.now());
      this.purgeOldFailures();
    }
  }

  /**
   * Purge failures outside the detection window
   */
  private purgeOldFailures(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowSize;
    this.recentFailures = this.recentFailures.filter(ts => ts > cutoff);
  }

  /**
   * Detect if circuit should be opened based on failure patterns
   */
  detect(): FailureDetectionResult {
    this.lastDetection = Date.now();
    this.purgeOldFailures();
    
    const failureRate = this.requestCount > 0 
      ? this.recentFailures.length / this.requestCount 
      : 0;
    
    const shouldOpen = 
      !this.isCircuitOpen &&
      this.requestCount >= this.config.minRequestVolume &&
      this.recentFailures.length >= this.config.failureThreshold;

    return {
      shouldOpen,
      currentFailureRate: failureRate,
      detectedAt: this.lastDetection,
    };
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get recent failure count within window
   */
  getRecentFailureCount(): number {
    this.purgeOldFailures();
    return this.recentFailures.length;
  }

  /**
   * Get configured failure threshold
   */
  getThreshold(): number {
    return this.config.failureThreshold;
  }

  /**
   * Check if circuit is currently open
   */
  isOpen(): boolean {
    return this.isCircuitOpen;
  }

  /**
   * Set circuit open state
   */
  setOpen(open: boolean): void {
    this.isCircuitOpen = open;
    if (open) {
      this.recentFailures = [];
    }
  }

  /**
   * Get request count
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Calculate current failure rate
   */
  getFailureRate(): number {
    return this.requestCount > 0 
      ? this.recentFailures.length / this.requestCount 
      : 0;
  }

  /**
   * Get current detection status
   */
  getStatus(): {
    isOpen: boolean;
    failureCount: number;
    requestCount: number;
    failureRate: number;
  } {
    return {
      isOpen: this.isCircuitOpen,
      failureCount: this.failureCount,
      requestCount: this.requestCount,
      failureRate: this.getFailureRate(),
    };
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: { isOpen: boolean; failureCount: number; requestCount: number; failureRate: number } } {
    return {
      metrics: this.getStatus(),
    };
  }

  /**
   * Reset all counters and state
   */
  reset(): void {
    this.failureCount = 0;
    this.requestCount = 0;
    this.recentFailures = [];
    this.isCircuitOpen = false;
    this.lastDetection = null;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    return [
      `=== FailureDetector Report: ${this.config.name} ===`,
      `Circuit Open: ${this.isCircuitOpen}`,
      `Total Failures: ${this.failureCount}`,
      `Recent Failures: ${this.recentFailures.length}`,
      `Total Requests: ${this.requestCount}`,
      `Failure Rate: ${(this.getFailureRate() * 100).toFixed(2)}%`,
      `Threshold: ${this.config.failureThreshold}`,
      `Min Volume: ${this.config.minRequestVolume}`,
      `Window: ${this.config.windowSize}ms`,
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

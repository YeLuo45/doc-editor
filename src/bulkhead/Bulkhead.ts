/**
 * Bulkhead.ts - V105 Bulkhead Isolation Implementation
 * Controls concurrent access to resources using semaphore-like isolation
 */

export type BulkheadConfig = {
  name: string;
  maxConcurrent: number;
  maxQueue: number;
  timeout: number;
  isolationLevel: 'exclusive' | 'shared' | 'flexible';
};

export type BulkheadState = 'idle' | 'active' | 'exhausted' | 'isolated';

export type BulkheadMetrics = {
  activeCount: number;
  queuedCount: number;
  totalAcquired: number;
  totalReleased: number;
  totalRejected: number;
  totalTimeout: number;
  state: BulkheadState;
  lastAcquire: number | null;
  lastRelease: number | null;
  lastReject: number | null;
};

export class Bulkhead {
  readonly config: BulkheadConfig;
  private state: BulkheadState = 'idle';
  private activeCount: number = 0;
  private queuedCount: number = 0;
  private totalAcquired: number = 0;
  private totalReleased: number = 0;
  private totalRejected: number = 0;
  private totalTimeout: number = 0;
  private lastAcquire: number | null = null;
  private lastRelease: number | null = null;
  private lastReject: number | null = null;
  private waitQueue: Array<() => void> = [];

  constructor(config: BulkheadConfig) {
    this.config = config;
  }

  /**
   * Attempt to acquire a bulkhead slot
   */
  acquire(): boolean {
    if (this.activeCount < this.config.maxConcurrent) {
      this.activeCount++;
      this.totalAcquired++;
      this.lastAcquire = Date.now();
      this.updateState();
      return true;
    }
    
    this.totalRejected++;
    this.lastReject = Date.now();
    this.updateState();
    return false;
  }

  /**
   * Release a bulkhead slot
   */
  release(): void {
    if (this.activeCount > 0) {
      this.activeCount--;
      this.totalReleased++;
      this.lastRelease = Date.now();
    }
    this.updateState();
  }

  /**
   * Check if bulkhead allows new requests
   */
  canAcquire(): boolean {
    return (
      this.activeCount < this.config.maxConcurrent ||
      this.queuedCount < this.config.maxQueue
    );
  }

  /**
   * Get current bulkhead status
   */
  getStatus(): BulkheadState {
    this.updateState();
    return this.state;
  }

  /**
   * Get bulkhead statistics
   */
  getStats(): BulkheadMetrics {
    this.updateState();
    return {
      activeCount: this.activeCount,
      queuedCount: this.queuedCount,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
      totalRejected: this.totalRejected,
      totalTimeout: this.totalTimeout,
      state: this.state,
      lastAcquire: this.lastAcquire,
      lastRelease: this.lastRelease,
      lastReject: this.lastReject,
    };
  }

  /**
   * Update internal state based on current counts
   */
  private updateState(): void {
    if (this.state === 'isolated') return;
    
    if (this.totalRejected > 0 && this.activeCount >= this.config.maxConcurrent) {
      this.state = 'exhausted';
    } else if (this.activeCount > 0) {
      this.state = 'active';
    } else {
      this.state = 'idle';
    }
  }

  /**
   * Manually isolate the bulkhead
   */
  isolate(): void {
    this.state = 'isolated';
    this.activeCount = 0;
    this.waitQueue = [];
    this.queuedCount = 0;
  }

  /**
   * Restore bulkhead from isolation
   */
  restore(): void {
    this.state = 'idle';
    this.activeCount = 0;
  }

  /**
   * Get queue wait time estimate
   */
  getWaitTime(): number {
    if (this.activeCount < this.config.maxConcurrent) return 0;
    return this.queuedCount * this.config.timeout;
  }

  /**
   * Get snapshot of current metrics state
   */
  getSnapshot(): { metrics: BulkheadMetrics } {
    return {
      metrics: this.getStats(),
    };
  }

  /**
   * Reset all counters and state
   */
  reset(): void {
    this.state = 'idle';
    this.activeCount = 0;
    this.queuedCount = 0;
    this.totalAcquired = 0;
    this.totalReleased = 0;
    this.totalRejected = 0;
    this.totalTimeout = 0;
    this.lastAcquire = null;
    this.lastRelease = null;
    this.lastReject = null;
    this.waitQueue = [];
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const name = this.config.name;
    const state = this.state.toUpperCase();
    const active = this.activeCount;
    const max = this.config.maxConcurrent;
    const queued = this.queuedCount;
    const maxQueue = this.config.maxQueue;
    const rejected = this.totalRejected;
    const acquired = this.totalAcquired;
    
    return [
      `=== Bulkhead Report: ${name} ===`,
      `State: ${state}`,
      `Active: ${active}/${max}`,
      `Queued: ${queued}/${maxQueue}`,
      `Total Acquired: ${acquired}`,
      `Total Rejected: ${rejected}`,
      `Isolation Level: ${this.config.isolationLevel}`,
      `Last Acquire: ${this.lastAcquire ? new Date(this.lastAcquire).toISOString() : 'none'}`,
      `Last Release: ${this.lastRelease ? new Date(this.lastRelease).toISOString() : 'none'}`,
    ].join('\n');
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: 'V105',
    };
  }
}
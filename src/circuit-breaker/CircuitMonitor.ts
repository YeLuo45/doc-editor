/**
 * CircuitMonitor.ts - V101 Circuit Monitor Implementation
 * Tracks circuit metrics and provides monitoring capabilities
 */

import type { CircuitState } from './CircuitBreaker';

export type CircuitMonitorConfig = {
  name: string;
  historySize: number;
  samplingInterval: number;
  enableLogging: boolean;
};

export type CircuitEvent = {
  type: 'state_change' | 'request' | 'success' | 'failure' | 'reset';
  timestamp: number;
  state?: CircuitState;
  metadata?: Record<string, unknown>;
};

export type CircuitMetrics = {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rejectedRequests: number;
  stateChanges: number;
  currentState: CircuitState;
  uptime: number;
  lastUpdated: number;
};

export class CircuitMonitor {
  readonly config: CircuitMonitorConfig;
  private events: CircuitEvent[] = [];
  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private rejectedRequests: number = 0;
  private stateChanges: number = 0;
  private currentState: CircuitState = 'closed';
  private startTime: number = Date.now();
  private lastUpdated: number = Date.now();

  constructor(config: CircuitMonitorConfig) {
    this.config = config;
  }

  /**
   * Track a circuit event
   */
  track(event: Omit<CircuitEvent, 'timestamp'>): void {
    const fullEvent: CircuitEvent = {
      ...event,
      timestamp: Date.now(),
    };
    
    this.events.push(fullEvent);
    this.lastUpdated = Date.now();
    
    // Update metrics based on event type
    if (event.type === 'request') {
      this.totalRequests++;
    } else if (event.type === 'success') {
      this.successfulRequests++;
    } else if (event.type === 'failure') {
      this.failedRequests++;
    } else if (event.type === 'rejected') {
      this.rejectedRequests++;
    } else if (event.type === 'state_change') {
      this.stateChanges++;
      if (event.state) {
        this.currentState = event.state;
      }
    }
    
    // Trim history if needed
    if (this.events.length > this.config.historySize) {
      this.events = this.events.slice(-this.config.historySize);
    }
    
    if (this.config.enableLogging) {
      this.logEvent(fullEvent);
    }
  }

  /**
   * Log event to console
   */
  private logEvent(event: CircuitEvent): void {
    console.log(`[CircuitMonitor] ${new Date(event.timestamp).toISOString()} - ${event.type}`, event.metadata || '');
  }

  /**
   * Track a request
   */
  trackRequest(success: boolean): void {
    this.totalRequests++;
    this.track({
      type: success ? 'success' : 'failure',
      metadata: { success },
    });
  }

  /**
   * Track state change
   */
  trackStateChange(newState: CircuitState): void {
    this.track({
      type: 'state_change',
      state: newState,
      metadata: { previousState: this.currentState, newState },
    });
  }

  /**
   * Track reset event
   */
  trackReset(): void {
    this.track({ type: 'reset' });
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitMetrics {
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      rejectedRequests: this.rejectedRequests,
      stateChanges: this.stateChanges,
      currentState: this.currentState,
      uptime: Date.now() - this.startTime,
      lastUpdated: this.lastUpdated,
    };
  }

  /**
   * Get event history
   */
  getHistory(limit?: number): CircuitEvent[] {
    if (limit) {
      return this.events.slice(-limit);
    }
    return [...this.events];
  }

  /**
   * Get current status
   */
  getStatus(): {
    currentState: CircuitState;
    isHealthy: boolean;
    totalRequests: number;
    successRate: number;
  } {
    const successRate = this.totalRequests > 0
      ? this.successfulRequests / this.totalRequests
      : 0;
    
    return {
      currentState: this.currentState,
      isHealthy: this.currentState === 'closed' && successRate > 0.5,
      totalRequests: this.totalRequests,
      successRate,
    };
  }

  /**
   * Calculate success rate
   */
  getSuccessRate(): number {
    return this.totalRequests > 0
      ? this.successfulRequests / this.totalRequests
      : 0;
  }

  /**
   * Calculate error rate
   */
  getErrorRate(): number {
    return this.totalRequests > 0
      ? this.failedRequests / this.totalRequests
      : 0;
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: CircuitMetrics } {
    return {
      metrics: this.getMetrics(),
    };
  }

  /**
   * Reset all metrics and events
   */
  reset(): void {
    this.events = [];
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.rejectedRequests = 0;
    this.stateChanges = 0;
    this.currentState = 'closed';
    this.startTime = Date.now();
    this.lastUpdated = Date.now();
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const uptime = this.getUptime();
    const uptimeStr = `${(uptime / 1000).toFixed(1)}s`;
    const successRate = (this.getSuccessRate() * 100).toFixed(2);
    const errorRate = (this.getErrorRate() * 100).toFixed(2);
    
    return [
      `=== CircuitMonitor Report: ${this.config.name} ===`,
      `State: ${this.currentState}`,
      `Total Requests: ${this.totalRequests}`,
      `Successful: ${this.successfulRequests}`,
      `Failed: ${this.failedRequests}`,
      `Rejected: ${this.rejectedRequests}`,
      `Success Rate: ${successRate}%`,
      `Error Rate: ${errorRate}%`,
      `State Changes: ${this.stateChanges}`,
      `Uptime: ${uptimeStr}`,
      `Events in History: ${this.events.length}`,
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

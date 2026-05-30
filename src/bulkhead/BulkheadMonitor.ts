/**
 * BulkheadMonitor.ts - V105 Bulkhead Monitoring System
 * Tracks and aggregates bulkhead metrics across multiple instances
 */

import { Bulkhead, BulkheadMetrics } from './Bulkhead';
import { BulkheadPool, BulkheadPoolMetrics } from './BulkheadPool';

export type MonitoringConfig = {
  name: string;
  historySize: number;
  alertThreshold: number;
  samplingInterval: number;
};

export type MonitoredBulkhead = {
  id: string;
  name: string;
  metrics: BulkheadMetrics;
  timestamp: number;
};

export type BulkheadMonitorMetrics = {
  totalMonitored: number;
  totalAcquired: number;
  totalReleased: number;
  totalRejected: number;
  averageUtilization: number;
  peakActive: number;
  alertCount: number;
};

export class BulkheadMonitor {
  readonly config: MonitoringConfig;
  private history: MonitoredBulkhead[] = [];
  private trackedBulkheads: Map<string, Bulkhead> = new Map();
  private trackedPools: Map<string, BulkheadPool> = new Map();
  private totalAcquired: number = 0;
  private totalReleased: number = 0;
  private totalRejected: number = 0;
  private peakActive: number = 0;
  private alertCount: number = 0;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  /**
   * Track a bulkhead instance
   */
  track(bulkhead: Bulkhead): void {
    this.trackedBulkheads.set(bulkhead.config.name, bulkhead);
  }

  /**
   * Track a bulkhead pool
   */
  trackPool(pool: BulkheadPool): void {
    this.trackedPools.set(pool.config.name, pool);
  }

  /**
   * Untrack a bulkhead
   */
  untrack(id: string): boolean {
    return this.trackedBulkheads.delete(id);
  }

  /**
   * Record current metrics snapshot
   */
  recordSnapshot(): void {
    let totalActive = 0;
    let totalAcquired = 0;
    
    for (const [id, bulkhead] of this.trackedBulkheads) {
      const metrics = bulkhead.getStats();
      totalActive += metrics.activeCount;
      totalAcquired += metrics.totalAcquired;
      
      this.history.push({
        id,
        name: bulkhead.config.name,
        metrics,
        timestamp: Date.now(),
      });
    }
    
    if (totalActive > this.peakActive) {
      this.peakActive = totalActive;
    }
    
    this.totalAcquired = totalAcquired;
    
    if (this.history.length > this.config.historySize) {
      this.history = this.history.slice(-this.config.historySize);
    }
    
    if (totalActive >= this.config.alertThreshold) {
      this.alertCount++;
    }
  }

  /**
   * Get metrics for a specific bulkhead
   */
  getMetrics(id: string): BulkheadMetrics | undefined {
    const bulkhead = this.trackedBulkheads.get(id);
    return bulkhead ? bulkhead.getStats() : undefined;
  }

  /**
   * Get historical metrics
   */
  getHistory(id?: string): MonitoredBulkhead[] {
    if (id) {
      return this.history.filter(h => h.id === id);
    }
    return [...this.history];
  }

  /**
   * Get aggregated metrics across all tracked bulkheads
   */
  getAggregatedMetrics(): BulkheadMonitorMetrics {
    let totalMonitored = 0;
    let totalActive = 0;
    
    for (const bulkhead of this.trackedBulkheads.values()) {
      totalMonitored++;
      totalActive += bulkhead.getStats().activeCount;
    }
    
    for (const pool of this.trackedPools.values()) {
      totalActive += pool.getPoolStats().activeCount;
    }
    
    return {
      totalMonitored,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
      totalRejected: this.totalRejected,
      averageUtilization: totalMonitored > 0 ? totalActive / totalMonitored : 0,
      peakActive: this.peakActive,
      alertCount: this.alertCount,
    };
  }

  /**
   * Get current monitor status
   */
  getStatus(): { tracked: number; historySize: number; alerts: number } {
    return {
      tracked: this.trackedBulkheads.size + this.trackedPools.size,
      historySize: this.history.length,
      alerts: this.alertCount,
    };
  }

  /**
   * Check if any bulkhead is at capacity
   */
  isAnyAtCapacity(): boolean {
    for (const bulkhead of this.trackedBulkheads.values()) {
      const stats = bulkhead.getStats();
      if (stats.state === 'exhausted' || stats.activeCount >= bulkhead.config.maxConcurrent) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get least utilized bulkhead
   */
  getLeastUtilized(): Bulkhead | undefined {
    let minLoad = Infinity;
    let selected: Bulkhead | undefined;
    
    for (const bulkhead of this.trackedBulkheads.values()) {
      const stats = bulkhead.getStats();
      if (stats.activeCount < minLoad) {
        minLoad = stats.activeCount;
        selected = bulkhead;
      }
    }
    
    return selected;
  }

  /**
   * Get most utilized bulkhead
   */
  getMostUtilized(): Bulkhead | undefined {
    let maxLoad = 0;
    let selected: Bulkhead | undefined;
    
    for (const bulkhead of this.trackedBulkheads.values()) {
      const stats = bulkhead.getStats();
      if (stats.activeCount > maxLoad) {
        maxLoad = stats.activeCount;
        selected = bulkhead;
      }
    }
    
    return selected;
  }

  /**
   * Reset all tracked metrics
   */
  reset(): void {
    this.history = [];
    this.totalAcquired = 0;
    this.totalReleased = 0;
    this.totalRejected = 0;
    this.peakActive = 0;
    this.alertCount = 0;
  }

  /**
   * Get snapshot of monitor state
   */
  getSnapshot(): { metrics: BulkheadMonitorMetrics } {
    return {
      metrics: this.getAggregatedMetrics(),
    };
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const name = this.config.name;
    const status = this.getStatus();
    const metrics = this.getAggregatedMetrics();
    
    return [
      `=== BulkheadMonitor Report: ${name} ===`,
      `Tracked Bulkheads: ${status.tracked}`,
      `History Size: ${status.historySize}`,
      `Peak Active: ${metrics.peakActive}`,
      `Alerts: ${status.alerts}`,
      `Total Acquired: ${metrics.totalAcquired}`,
      `Total Released: ${metrics.totalReleased}`,
      `Total Rejected: ${metrics.totalRejected}`,
      `Average Utilization: ${metrics.averageUtilization.toFixed(2)}`,
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
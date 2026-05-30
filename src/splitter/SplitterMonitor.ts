/**
 * SplitterMonitor.ts - V114 Splitter Monitor
 * Tracks and monitors splitter operations with metrics
 */

import { SplitterStats } from './Splitter';

export interface MonitorConfig {
  historySize: number;
  enableAutoFlush: boolean;
  flushInterval: number;
  alertThreshold?: number;
}

export interface MonitorMetrics {
  totalTracks: number;
  totalOperations: number;
  peakMemoryUsage: number;
  currentStatus: 'idle' | 'active' | 'alert';
  lastUpdated: number;
}

export interface HistoryEntry {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
}

export class SplitterMonitor {
  public config: MonitorConfig;
  private metrics: MonitorMetrics;
  private history: HistoryEntry[] = [];

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      historySize: config.historySize ?? 1000,
      enableAutoFlush: config.enableAutoFlush ?? false,
      flushInterval: config.flushInterval ?? 60000,
      alertThreshold: config.alertThreshold ?? 5000,
    };
    this.metrics = {
      totalTracks: 0,
      totalOperations: 0,
      peakMemoryUsage: 0,
      currentStatus: 'idle',
      lastUpdated: Date.now(),
    };
  }

  track(operation: string, duration: number, success: boolean): void {
    this.metrics.totalTracks++;
    this.metrics.totalOperations++;
    this.metrics.lastUpdated = Date.now();

    this.history.push({
      timestamp: Date.now(),
      operation,
      duration,
      success,
    });

    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    if (duration > (this.config.alertThreshold ?? 5000)) {
      this.metrics.currentStatus = 'alert';
    } else {
      this.metrics.currentStatus = 'active';
    }

    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > this.metrics.peakMemoryUsage) {
      this.metrics.peakMemoryUsage = memoryUsage;
    }
  }

  getMetrics(): MonitorMetrics {
    return { ...this.metrics };
  }

  getHistory(limit?: number): HistoryEntry[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  getStatus(): 'idle' | 'active' | 'alert' {
    if (this.metrics.totalOperations === 0) {
      return 'idle';
    }
    return this.metrics.currentStatus;
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  getSnapshot(): { metrics: MonitorMetrics; history: HistoryEntry[] } {
    return {
      metrics: { ...this.metrics },
      history: [...this.history],
    };
  }

  reset(): void {
    this.history = [];
    this.metrics = {
      totalTracks: 0,
      totalOperations: 0,
      peakMemoryUsage: 0,
      currentStatus: 'idle',
      lastUpdated: Date.now(),
    };
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== SplitterMonitor Report ===',
      `Total Tracks: ${snap.metrics.totalTracks}`,
      `Total Operations: ${snap.metrics.totalOperations}`,
      `Peak Memory: ${(snap.metrics.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
      `Current Status: ${snap.metrics.currentStatus}`,
      `Last Updated: ${new Date(snap.metrics.lastUpdated).toISOString()}`,
      `History Size: ${snap.history.length}`,
      '==============================',
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: MonitorMetrics } {
    return {
      version: '1.14.0',
      metrics: this.getMetrics(),
    };
  }
}
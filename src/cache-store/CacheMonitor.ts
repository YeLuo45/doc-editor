/**
 * CacheMonitor.ts - V88 Cache Monitor
 * Handles monitoring operations with track/getMetrics/getHistory/getStatus
 */

export type MonitorStatus = 'idle' | 'active' | 'paused' | 'error';
export type MetricType = 'hit' | 'miss' | 'eviction' | 'set' | 'delete' | 'clear';

export interface CacheMonitorConfig {
  enableMonitoring: boolean;
  historySize: number;
  samplingRate: number;
  alertThreshold: number;
  namespace?: string;
}

export interface MetricEntry {
  timestamp: number;
  type: MetricType;
  key?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface MonitorStats {
  totalTracked: number;
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  totalSets: number;
  totalDeletes: number;
  avgResponseTime: number;
  currentStatus: MonitorStatus;
}

export class CacheMonitor {
  private history: MetricEntry[] = [];
  private currentMetrics: Map<string, number> = new Map();
  public config: CacheMonitorConfig;
  private stats: MonitorStats;
  private status: MonitorStatus;
  private startTime: number;

  constructor(config: CacheMonitorConfig) {
    this.config = config;
    this.status = config.enableMonitoring ? 'active' : 'idle';
    this.startTime = Date.now();
    this.stats = {
      totalTracked: 0,
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
      totalSets: 0,
      totalDeletes: 0,
      avgResponseTime: 0,
      currentStatus: this.status
    };
  }

  track(type: MetricType, key?: string, value?: number, metadata?: Record<string, unknown>): void {
    if (this.status !== 'active') return;

    const entry: MetricEntry = {
      timestamp: Date.now(),
      type,
      key,
      value,
      metadata
    };

    this.history.push(entry);
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    this.updateMetrics(type, value);
    this.stats.totalTracked++;
  }

  private updateMetrics(type: MetricType, value?: number): void {
    switch (type) {
      case 'hit':
        this.stats.totalHits++;
        this.currentMetrics.set('hits', (this.currentMetrics.get('hits') || 0) + 1);
        break;
      case 'miss':
        this.stats.totalMisses++;
        this.currentMetrics.set('misses', (this.currentMetrics.get('misses') || 0) + 1);
        break;
      case 'eviction':
        this.stats.totalEvictions++;
        this.currentMetrics.set('evictions', (this.currentMetrics.get('evictions') || 0) + 1);
        break;
      case 'set':
        this.stats.totalSets++;
        this.currentMetrics.set('sets', (this.currentMetrics.get('sets') || 0) + 1);
        break;
      case 'delete':
        this.stats.totalDeletes++;
        this.currentMetrics.set('deletes', (this.currentMetrics.get('deletes') || 0) + 1);
        break;
      case 'clear':
        this.currentMetrics.clear();
        break;
    }

    if (value !== undefined) {
      const n = this.stats.totalTracked;
      const currentAvg = this.stats.avgResponseTime;
      this.stats.avgResponseTime = (currentAvg * (n - 1) + value) / n;
    }
  }

  getMetrics(): Map<string, number> {
    return new Map(this.currentMetrics);
  }

  getHistory(type?: MetricType, limit?: number): MetricEntry[] {
    let filtered = this.history;

    if (type) {
      filtered = filtered.filter(entry => entry.type === type);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return [...filtered];
  }

  getStatus(): { status: MonitorStatus; stats: MonitorStats; uptime: number } {
    return {
      status: this.status,
      stats: { ...this.stats },
      uptime: Date.now() - this.startTime
    };
  }

  setStatus(status: MonitorStatus): void {
    this.status = status;
    this.stats.currentStatus = status;
  }

  clearHistory(): void {
    this.history = [];
    this.currentMetrics.clear();
  }

  getSnapshot(): { metrics: MonitorStats } {
    return {
      metrics: { ...this.stats }
    };
  }

  reset(): void {
    this.history = [];
    this.currentMetrics.clear();
    this.stats = {
      totalTracked: 0,
      totalHits: 0,
      totalMisses: 0,
      totalEvictions: 0,
      totalSets: 0,
      totalDeletes: 0,
      avgResponseTime: 0,
      currentStatus: this.status
    };
  }

  getReport(): string {
    return [
      '=== CacheMonitor Report ===',
      `Namespace: ${this.config.namespace || 'default'}`,
      `Status: ${this.status}`,
      `Total Tracked: ${this.stats.totalTracked}`,
      `Hits: ${this.stats.totalHits}`,
      `Misses: ${this.stats.totalMisses}`,
      `Evictions: ${this.stats.totalEvictions}`,
      `Sets: ${this.stats.totalSets}`,
      `Deletes: ${this.stats.totalDeletes}`,
      `Avg Response Time: ${this.stats.avgResponseTime.toFixed(2)}ms`,
      `History Size: ${this.history.length}/${this.config.historySize}`,
      `Uptime: ${Date.now() - this.startTime}ms`
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: MonitorStats } {
    return {
      version: 'V88',
      stats: { ...this.stats }
    };
  }
}
/**
 * SyncMonitor.ts - V90 Sync Monitor
 * Provides real-time monitoring and metrics tracking for sync operations
 */

export type MonitorStatus = 'active' | 'paused' | 'stopped';

export interface SyncEvent {
  id: string;
  type: 'sync' | 'push' | 'pull' | 'conflict' | 'error';
  timestamp: number;
  duration?: number;
  success: boolean;
  itemCount?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncMetrics {
  totalSyncs: number;
  totalPushes: number;
  totalPulls: number;
  totalConflicts: number;
  totalErrors: number;
  averageDuration: number;
  uptime: number;
  resetAt: number;
}

export interface SyncMonitorConfig {
  historySize: number;
  enableRealTimeEvents: boolean;
  metricsInterval: number;
  alertOnFailure: boolean;
  retentionPeriod: number;
}

export class SyncMonitor {
  readonly config: SyncMonitorConfig;
  private readonly events: SyncEvent[] = [];
  private status: MonitorStatus = 'active';
  private readonly startTime: number = Date.now();
  private metrics: SyncMetrics = {
    totalSyncs: 0,
    totalPushes: 0,
    totalPulls: 0,
    totalConflicts: 0,
    totalErrors: 0,
    averageDuration: 0,
    uptime: 0,
    resetAt: 0,
  };

  constructor(config: Partial<SyncMonitorConfig> = {}) {
    this.config = {
      historySize: config.historySize ?? 100,
      enableRealTimeEvents: config.enableRealTimeEvents ?? true,
      metricsInterval: config.metricsInterval ?? 5000,
      alertOnFailure: config.alertOnFailure ?? true,
      retentionPeriod: config.retentionPeriod ?? 86400000,
    };
  }

  track(event: Omit<SyncEvent, 'id' | 'timestamp'>): SyncEvent {
    const fullEvent: SyncEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);
    this.updateMetrics(fullEvent);
    this.pruneEvents();

    return fullEvent;
  }

  getMetrics(since?: number): SyncMetrics & { eventsSince: number } {
    const filteredEvents = since
      ? this.events.filter((e) => e.timestamp >= since)
      : this.events;

    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      eventsSince: filteredEvents.length,
    };
  }

  getHistory(filter?: { type?: SyncEvent['type']; success?: boolean; limit?: number }): SyncEvent[] {
    let result = [...this.events];

    if (filter?.type) {
      result = result.filter((e) => e.type === filter.type);
    }
    if (filter?.success !== undefined) {
      result = result.filter((e) => e.success === filter.success);
    }

    result.sort((a, b) => b.timestamp - a.timestamp);

    return filter?.limit ? result.slice(0, filter.limit) : result;
  }

  getStatus(): { status: MonitorStatus; eventCount: number; uptime: number } {
    return {
      status: this.status,
      eventCount: this.events.length,
      uptime: Date.now() - this.startTime,
    };
  }

  getSnapshot(): { metrics: SyncMetrics; status: MonitorStatus; eventCount: number } {
    return {
      metrics: { ...this.metrics },
      status: this.status,
      eventCount: this.events.length,
    };
  }

  reset(): void {
    this.events.length = 0;
    this.status = 'active';
    this.metrics = {
      totalSyncs: 0,
      totalPushes: 0,
      totalPulls: 0,
      totalConflicts: 0,
      totalErrors: 0,
      averageDuration: 0,
      uptime: 0,
      resetAt: Date.now(),
    };
  }

  getReport(): string {
    return JSON.stringify({
      config: this.config,
      status: this.status,
      metrics: this.metrics,
      recentEvents: this.events.slice(-10),
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V90',
    };
  }

  private updateMetrics(event: SyncEvent): void {
    switch (event.type) {
      case 'sync':
        this.metrics.totalSyncs++;
        break;
      case 'push':
        this.metrics.totalPushes++;
        break;
      case 'pull':
        this.metrics.totalPulls++;
        break;
      case 'conflict':
        this.metrics.totalConflicts++;
        break;
      case 'error':
        this.metrics.totalErrors++;
        break;
    }

    if (event.duration !== undefined) {
      const totalDuration = this.metrics.averageDuration * (this.metrics.totalSyncs - 1);
      this.metrics.averageDuration = (totalDuration + event.duration) / this.metrics.totalSyncs;
    }
  }

  private pruneEvents(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    while (this.events.length > this.config.historySize) {
      const removed = this.events.shift();
      if (removed && removed.timestamp < cutoff) {
        this.events.push(removed);
      }
    }

    const toRemove = this.events.findIndex((e) => e.timestamp >= cutoff);
    if (toRemove > 0) {
      this.events.splice(0, toRemove);
    }

    while (this.events.length > this.config.historySize) {
      this.events.shift();
    }
  }
}
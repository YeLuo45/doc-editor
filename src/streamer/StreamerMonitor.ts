/**
 * V118 StreamerMonitor Module
 * Monitors and tracks streaming metrics across streamers
 */

import { Streamer, StreamStats } from './Streamer';
import { StreamerRegistry } from './StreamerRegistry';

export interface MonitorConfig {
  historySize?: number;
  enableRealTime?: boolean;
  sampleInterval?: number;
}

export interface MonitorMetrics {
  totalStreamers: number;
  totalMessages: number;
  totalBytes: number;
  totalSubscribers: number;
  averageUptime: number;
}

export interface StreamHistoryEntry {
  timestamp: number;
  streamerId: string;
  event: string;
  data: unknown;
}

export type StreamerStatus = 'active' | 'inactive' | 'error';

export class StreamerMonitor {
  private registry: StreamerRegistry;
  private config: MonitorConfig;
  private history: StreamHistoryEntry[] = [];
  private statusMap: Map<string, StreamerStatus> = new Map();
  private metricsSnapshots: MonitorMetrics[] = [];

  constructor(registry: StreamerRegistry, config: MonitorConfig = {}) {
    this.registry = registry;
    this.config = {
      historySize: 1000,
      enableRealTime: true,
      sampleInterval: 60000,
      ...config,
    };
  }

  get config(): MonitorConfig {
    return this.config;
  }

  track(streamerId: string, event: string, data?: unknown): void {
    const entry: StreamHistoryEntry = {
      timestamp: Date.now(),
      streamerId,
      event,
      data,
    };
    this.history.push(entry);
    if (this.history.length > (this.config.historySize || 1000)) {
      this.history.shift();
    }
  }

  getMetrics(): MonitorMetrics {
    const streamers = this.registry.getAll();
    let totalMessages = 0;
    let totalBytes = 0;
    let totalSubscribers = 0;
    let totalUptime = 0;

    streamers.forEach((streamer, id) => {
      const stats = streamer.getStats();
      totalMessages += stats.messagesSent;
      totalBytes += stats.bytesSent;
      totalSubscribers += stats.subscribers;
      totalUptime += stats.uptime;
      this.statusMap.set(id, 'active');
    });

    return {
      totalStreamers: streamers.size,
      totalMessages,
      totalBytes,
      totalSubscribers,
      averageUptime: streamers.size > 0 ? totalUptime / streamers.size : 0,
    };
  }

  getHistory(streamerId?: string, limit?: number): StreamHistoryEntry[] {
    let filtered = this.history;
    if (streamerId) {
      filtered = filtered.filter(e => e.streamerId === streamerId);
    }
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  getStatus(streamerId?: string): Map<string, StreamerStatus> | StreamerStatus {
    if (streamerId) {
      return this.statusMap.get(streamerId) || 'inactive';
    }
    return new Map(this.statusMap);
  }

  getSnapshot(): { metrics: MonitorMetrics; historyLength: number; statusCount: number } {
    return {
      metrics: this.getMetrics(),
      historyLength: this.history.length,
      statusCount: this.statusMap.size,
    };
  }

  reset(): void {
    this.history = [];
    this.statusMap.clear();
    this.metricsSnapshots = [];
  }

  getReport(): string {
    const metrics = this.getMetrics();
    const statuses = Array.from(this.statusMap.entries()).map(
      ([id, status]) => `  ${id}: ${status}`
    ).join('\n');
    
    return `StreamerMonitor Report:
  Total Streamers: ${metrics.totalStreamers}
  Total Messages: ${metrics.totalMessages}
  Total Bytes: ${metrics.totalBytes}
  Total Subscribers: ${metrics.totalSubscribers}
  Avg Uptime: ${metrics.averageUptime.toFixed(0)}ms
  History Size: ${this.history.length}
  Statuses:
${statuses || '  (no streamers)'}`;
  }

  exportMetrics(): { version: string; metrics: MonitorMetrics; historySize: number } {
    return {
      version: 'V118',
      metrics: this.getMetrics(),
      historySize: this.history.length,
    };
  }
}
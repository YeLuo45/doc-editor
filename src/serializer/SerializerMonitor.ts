/**
 * V119 SerializerMonitor Module
 * Monitors and tracks serialization metrics across serializers
 */

import { Serializer, SerializerStats } from './Serializer';
import { SerializerRegistry } from './SerializerRegistry';

export interface MonitorConfig {
  historySize?: number;
  enableRealTime?: boolean;
  sampleInterval?: number;
}

export interface MonitorMetrics {
  totalSerializers: number;
  totalSerialized: number;
  totalDeserialized: number;
  totalBytes: number;
  averageUptime: number;
}

export interface SerializationHistoryEntry {
  timestamp: number;
  serializerId: string;
  event: string;
  data: unknown;
}

export type SerializerStatus = 'active' | 'inactive' | 'error';

export class SerializerMonitor {
  private registry: SerializerRegistry;
  private config: MonitorConfig;
  private history: SerializationHistoryEntry[] = [];
  private statusMap: Map<string, SerializerStatus> = new Map();
  private metricsSnapshots: MonitorMetrics[] = [];

  constructor(registry: SerializerRegistry, config: MonitorConfig = {}) {
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

  track(serializerId: string, event: string, data?: unknown): void {
    const entry: SerializationHistoryEntry = {
      timestamp: Date.now(),
      serializerId,
      event,
      data,
    };
    this.history.push(entry);
    if (this.history.length > (this.config.historySize || 1000)) {
      this.history.shift();
    }
  }

  getMetrics(): MonitorMetrics {
    const serializers = this.registry.getAll();
    let totalSerialized = 0;
    let totalDeserialized = 0;
    let totalBytes = 0;
    let totalUptime = 0;

    serializers.forEach((serializer, id) => {
      const stats = serializer.getStats();
      totalSerialized += stats.itemsSerialized;
      totalDeserialized += stats.itemsDeserialized;
      totalBytes += stats.bytesProcessed;
      totalUptime += stats.uptime;
      this.statusMap.set(id, 'active');
    });

    return {
      totalSerializers: serializers.size,
      totalSerialized,
      totalDeserialized,
      totalBytes,
      averageUptime: serializers.size > 0 ? totalUptime / serializers.size : 0,
    };
  }

  getHistory(serializerId?: string, limit?: number): SerializationHistoryEntry[] {
    let filtered = this.history;
    if (serializerId) {
      filtered = filtered.filter(e => e.serializerId === serializerId);
    }
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  getStatus(serializerId?: string): Map<string, SerializerStatus> | SerializerStatus {
    if (serializerId) {
      return this.statusMap.get(serializerId) || 'inactive';
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

    return `SerializerMonitor Report:
  Total Serializers: ${metrics.totalSerializers}
  Total Serialized: ${metrics.totalSerialized}
  Total Deserialized: ${metrics.totalDeserialized}
  Total Bytes: ${metrics.totalBytes}
  Avg Uptime: ${metrics.averageUptime.toFixed(0)}ms
  History Size: ${this.history.length}
  Statuses:
${statuses || '  (no serializers)'}`;
  }

  exportMetrics(): { version: string; metrics: MonitorMetrics; historySize: number } {
    return {
      version: 'V119',
      metrics: this.getMetrics(),
      historySize: this.history.length,
    };
  }
}
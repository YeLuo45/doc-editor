/**
 * V118 StreamerRegistry Module
 * Registry for managing multiple streamers
 */

import { Streamer, StreamerConfig } from './Streamer';

export interface RegistryConfig {
  maxStreamers?: number;
  enableAutoCleanup?: boolean;
  defaultBufferSize?: number;
}

export interface RegistryStats {
  totalStreamers: number;
  totalSubscriptions: number;
  totalMessages: number;
}

export class StreamerRegistry {
  private streamers: Map<string, Streamer> = new Map();
  private config: RegistryConfig;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      maxStreamers: 100,
      enableAutoCleanup: false,
      defaultBufferSize: 500,
      ...config,
    };
  }

  get config(): RegistryConfig {
    return this.config;
  }

  register(id: string, streamer: Streamer): boolean {
    if (this.streamers.has(id)) {
      return false;
    }
    if (this.streamers.size >= (this.config.maxStreamers || 100)) {
      throw new Error('Max streamers limit reached');
    }
    this.streamers.set(id, streamer);
    return true;
  }

  unregister(id: string): Streamer | undefined {
    const streamer = this.streamers.get(id);
    this.streamers.delete(id);
    return streamer;
  }

  get(id: string): Streamer | undefined {
    return this.streamers.get(id);
  }

  getAll(): Map<string, Streamer> {
    return new Map(this.streamers);
  }

  has(id: string): boolean {
    return this.streamers.has(id);
  }

  createStreamer(config: StreamerConfig): Streamer {
    const mergedConfig: StreamerConfig = {
      bufferSize: this.config.defaultBufferSize,
      ...config,
    };
    const streamer = new Streamer(mergedConfig);
    const registered = this.register(config.id, streamer);
    if (!registered) {
      throw new Error(`Failed to register streamer: ${config.id}`);
    }
    return streamer;
  }

  listIds(): string[] {
    return Array.from(this.streamers.keys());
  }

  clear(): void {
    this.streamers.clear();
  }

  getSnapshot(): { count: number; ids: string[] } {
    return {
      count: this.streamers.size,
      ids: this.listIds(),
    };
  }

  reset(): void {
    this.streamers.clear();
  }

  getReport(): string {
    const stats = this.getStats();
    return `StreamerRegistry Report:
  Total Streamers: ${stats.totalStreamers}
  Total Subscriptions: ${stats.totalSubscriptions}
  Total Messages: ${stats.totalMessages}
  Streamers: ${this.listIds().join(', ') || 'none'}`;
  }

  getStats(): RegistryStats {
    let totalSubscriptions = 0;
    let totalMessages = 0;
    this.streamers.forEach(s => {
      const snap = s.getSnapshot();
      totalSubscriptions += snap.topics.length;
      totalMessages += snap.metrics.messagesSent;
    });
    return {
      totalStreamers: this.streamers.size,
      totalSubscriptions,
      totalMessages,
    };
  }

  exportMetrics(): { version: string; stats: RegistryStats; config: RegistryConfig } {
    return {
      version: 'V118',
      stats: this.getStats(),
      config: this.config,
    };
  }
}
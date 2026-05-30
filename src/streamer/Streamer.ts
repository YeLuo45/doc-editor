/**
 * V118 Streamer Module
 * Core streaming functionality for doc-editor
 */

export interface StreamerConfig {
  id: string;
  name: string;
  bufferSize?: number;
  maxSubscribers?: number;
  enableMetrics?: boolean;
}

export interface StreamData {
  id: string;
  timestamp: number;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

export interface StreamStats {
  bytesSent: number;
  messagesSent: number;
  subscribers: number;
  uptime: number;
}

type SubscriberCallback = (data: StreamData) => void;

export class Streamer {
  private config: StreamerConfig;
  private subscribers: Map<string, SubscriberCallback[]> = new Map();
  private messageCount: number = 0;
  private bytesSent: number = 0;
  private startTime: number = Date.now();
  private streamBuffer: StreamData[] = [];

  constructor(config: StreamerConfig) {
    this.config = {
      bufferSize: 1000,
      maxSubscribers: 50,
      enableMetrics: true,
      ...config,
    };
  }

  get config(): StreamerConfig {
    return this.config;
  }

  stream(data: StreamData): void {
    this.streamBuffer.push(data);
    if (this.streamBuffer.length > (this.config.bufferSize || 1000)) {
      this.streamBuffer.shift();
    }
    this.messageCount++;
    this.bytesSent += JSON.stringify(data).length;
  }

  publish(topic: string, data: StreamData): void {
    this.stream(data);
    const subs = this.subscribers.get(topic) || [];
    subs.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error(`Subscriber error on topic ${topic}:`, e);
      }
    });
  }

  subscribe(topic: string, callback: SubscriberCallback): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    const subs = this.subscribers.get(topic)!;
    if (subs.length >= (this.config.maxSubscribers || 50)) {
      throw new Error(`Max subscribers reached for topic: ${topic}`);
    }
    subs.push(callback);
    return () => {
      const idx = subs.indexOf(callback);
      if (idx !== -1) subs.splice(idx, 1);
    };
  }

  getStream(topic?: string): StreamData[] {
    if (topic) {
      return this.streamBuffer.filter(d => (d.metadata as any)?.topic === topic);
    }
    return [...this.streamBuffer];
  }

  getStats(): StreamStats {
    return {
      bytesSent: this.bytesSent,
      messagesSent: this.messageCount,
      subscribers: this.subscribers.size,
      uptime: Date.now() - this.startTime,
    };
  }

  getSnapshot(): { metrics: StreamStats; bufferLength: number; topics: string[] } {
    return {
      metrics: this.getStats(),
      bufferLength: this.streamBuffer.length,
      topics: Array.from(this.subscribers.keys()),
    };
  }

  reset(): void {
    this.messageCount = 0;
    this.bytesSent = 0;
    this.startTime = Date.now();
    this.streamBuffer = [];
  }

  getReport(): string {
    const stats = this.getStats();
    return `Streamer[${this.config.name}] Report:
  ID: ${this.config.id}
  Messages: ${stats.messagesSent}
  Bytes: ${stats.bytesSent}
  Subscribers: ${stats.subscribers}
  Uptime: ${stats.uptime}ms
  Topics: ${Array.from(this.subscribers.keys()).join(', ') || 'none'}`;
  }

  exportMetrics(): { version: string; stats: StreamStats; config: StreamerConfig } {
    return {
      version: 'V118',
      stats: this.getStats(),
      config: this.config,
    };
  }
}
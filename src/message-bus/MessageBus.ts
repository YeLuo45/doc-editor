/**
 * V97 MessageBus - Publish/Subscribe message bus for doc-editor
 * Handles message distribution with topic-based subscriptions
 */

export type MessageBusConfig = {
  maxSubscribers?: number;
  enableDeadLetter?: boolean;
  retryAttempts?: number;
  enableLogging?: boolean;
  deliveryTimeout?: number;
};

export type Subscriber = {
  id: string;
  topic: string;
  callback: (message: unknown) => void;
  timestamp: number;
};

export type Message = {
  id: string;
  topic: string;
  payload: unknown;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

type MessageBusConfigType = MessageBusConfig;

export class MessageBus {
  private config: MessageBusConfigType;
  private subscribers: Map<string, Subscriber[]> = new Map();
  private messages: Message[] = [];
  private stats = {
    totalPublished: 0,
    totalDelivered: 0,
    totalFailed: 0,
    topics: new Set<string>(),
  };

  constructor(config: MessageBusConfig = {}) {
    this.config = {
      maxSubscribers: config.maxSubscribers ?? 100,
      enableDeadLetter: config.enableDeadLetter ?? false,
      retryAttempts: config.retryAttempts ?? 3,
      enableLogging: config.enableLogging ?? true,
      deliveryTimeout: config.deliveryTimeout ?? 5000,
    };
  }

  publish(topic: string, payload: unknown, metadata?: Record<string, unknown>): string {
    const id = this.generateMessageId();
    const message: Message = {
      id,
      topic,
      payload,
      timestamp: Date.now(),
      metadata,
    };
    this.messages.push(message);
    this.stats.totalPublished++;
    this.stats.topics.add(topic);

    const subs = this.subscribers.get(topic) ?? [];
    for (const sub of subs) {
      try {
        sub.callback(payload);
        this.stats.totalDelivered++;
      } catch {
        this.stats.totalFailed++;
      }
    }
    return id;
  }

  subscribe(topic: string, callback: (message: unknown) => void): string {
    const id = this.generateSubscriberId();
    const subscriber: Subscriber = {
      id,
      topic,
      callback,
      timestamp: Date.now(),
    };

    const existing = this.subscribers.get(topic) ?? [];
    if (existing.length >= (this.config.maxSubscribers ?? 100)) {
      throw new Error(`Maximum subscribers reached for topic: ${topic}`);
    }
    existing.push(subscriber);
    this.subscribers.set(topic, existing);
    return id;
  }

  unsubscribe(subscriberId: string): boolean {
    for (const [topic, subs] of this.subscribers.entries()) {
      const index = subs.findIndex((s) => s.id === subscriberId);
      if (index !== -1) {
        subs.splice(index, 1);
        this.subscribers.set(topic, subs);
        return true;
      }
    }
    return false;
  }

  getSubscribers(topic?: string): Subscriber[] {
    if (topic) {
      return this.subscribers.get(topic) ?? [];
    }
    const all: Subscriber[] = [];
    for (const subs of this.subscribers.values()) {
      all.push(...subs);
    }
    return all;
  }

  getTopics(): string[] {
    return Array.from(this.stats.topics);
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        subscribers: this.subscribers.size,
        messages: this.messages.length,
        stats: {
          totalPublished: this.stats.totalPublished,
          totalDelivered: this.stats.totalDelivered,
          totalFailed: this.stats.totalFailed,
          topics: Array.from(this.stats.topics),
        },
        config: this.config,
      },
    };
  }

  reset(): void {
    this.subscribers.clear();
    this.messages = [];
    this.stats = {
      totalPublished: 0,
      totalDelivered: 0,
      totalFailed: 0,
      topics: new Set<string>(),
    };
  }

  getReport(): string {
    const lines = [
      '=== Message Bus Report ===',
      `Total Published: ${this.stats.totalPublished}`,
      `Total Delivered: ${this.stats.totalDelivered}`,
      `Total Failed: ${this.stats.totalFailed}`,
      `Topics: ${Array.from(this.stats.topics).join(', ')}`,
      `Subscribers: ${this.subscribers.size}`,
      `Messages in Queue: ${this.messages.length}`,
      `Config: ${JSON.stringify(this.config)}`,
      '============================',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v97',
      published: this.stats.totalPublished,
      delivered: this.stats.totalDelivered,
      failed: this.stats.totalFailed,
      topics: Array.from(this.stats.topics),
      subscriberCount: this.subscribers.size,
    };
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private generateSubscriberId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
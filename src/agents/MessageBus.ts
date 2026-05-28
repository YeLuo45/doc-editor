import type {
  AgentMessage,
  AgentId,
  Subscription,
  SubscriptionId,
  MessageBusConfig,
  PubSubMessage,
} from './types';

/**
 * Async MessageBus - async pub/sub for agent communication
 * Supports channel-based and pattern-based subscriptions
 */
export class MessageBus {
  private subscriptions: Map<string, Subscription[]> = new Map();
  private patternSubscriptions: Subscription[] = [];
  private messageQueue: PubSubMessage[] = [];
  private subscriptionCounter = 0;

  private readonly config: MessageBusConfig = {
    maxQueueSize: 10000,
    deliveryGuarantee: 'at-least-once',
    wildcardSupport: true,
    maxSubscribersPerChannel: 100,
  };

  constructor(config?: Partial<MessageBusConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: AgentMessage): Promise<void> {
    const pubSubMessage: PubSubMessage = {
      channel,
      message,
      publishedAt: Date.now(),
    };

    // Add to queue for processing
    this.messageQueue.push(pubSubMessage);
    if (this.messageQueue.length > this.config.maxQueueSize) {
      this.messageQueue.shift();
    }

    // Deliver to subscribers on this channel
    const subs = this.subscriptions.get(channel) || [];
    const wildcardSubs = this.patternSubscriptions.filter((sub) => {
      if (sub.pattern) {
        try {
          return sub.pattern.test(channel);
        } catch {
          return false;
        }
      }
      return false;
    });

    const allSubs = [...subs, ...wildcardSubs];
    await Promise.allSettled(
      allSubs.map((sub) => {
        try {
          const result = sub.callback(message);
          if (result instanceof Promise) {
            return result.catch((err) => {
              console.error(`Subscription callback error for ${sub.id}:`, err);
            });
          }
          return result;
        } catch (err) {
          console.error(`Subscription callback error for ${sub.id}:`, err);
        }
      })
    );
  }

  /**
   * Publish a message directly to a recipient
   */
  async send(to: AgentId, message: AgentMessage): Promise<void> {
    const directMessage: AgentMessage = {
      ...message,
      to,
      timestamp: Date.now(),
    };
    await this.publish(`direct:${to}`, directMessage);
  }

  /**
   * Broadcast to all agents
   */
  async broadcast(message: AgentMessage): Promise<void> {
    const broadcastMessage: AgentMessage = {
      ...message,
      to: 'broadcast',
      timestamp: Date.now(),
    };
    await this.publish('broadcast', broadcastMessage);
  }

  /**
   * Subscribe to a channel
   */
  subscribe(
    agentId: AgentId,
    channel: string,
    callback: (message: AgentMessage) => void | Promise<void>
  ): SubscriptionId {
    const id = `sub_${++this.subscriptionCounter}_${Date.now()}`;
    const subscription: Subscription = {
      id,
      agentId,
      channel,
      callback,
      createdAt: Date.now(),
    };

    const existing = this.subscriptions.get(channel) || [];
    if (existing.length >= this.config.maxSubscribersPerChannel) {
      throw new Error(`Max subscribers (${this.config.maxSubscribersPerChannel}) reached for channel ${channel}`);
    }

    existing.push(subscription);
    this.subscriptions.set(channel, existing);
    return id;
  }

  /**
   * Subscribe to a pattern (regex)
   */
  subscribePattern(
    agentId: AgentId,
    pattern: RegExp,
    callback: (message: AgentMessage) => void | Promise<void>
  ): SubscriptionId {
    const id = `sub_pattern_${++this.subscriptionCounter}_${Date.now()}`;
    const subscription: Subscription = {
      id,
      agentId,
      channel: '',
      pattern,
      callback,
      createdAt: Date.now(),
    };
    this.patternSubscriptions.push(subscription);
    return id;
  }

  /**
   * Unsubscribe by subscription ID
   */
  unsubscribe(subscriptionId: SubscriptionId): boolean {
    for (const [channel, subs] of this.subscriptions) {
      const index = subs.findIndex((s) => s.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        this.subscriptions.set(channel, subs);
        return true;
      }
    }
    const patternIndex = this.patternSubscriptions.findIndex((s) => s.id === subscriptionId);
    if (patternIndex !== -1) {
      this.patternSubscriptions.splice(patternIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Unsubscribe all for an agent
   */
  unsubscribeAll(agentId: AgentId): number {
    let count = 0;
    for (const [channel, subs] of this.subscriptions) {
      const before = subs.length;
      const filtered = subs.filter((s) => s.agentId !== agentId);
      this.subscriptions.set(channel, filtered);
      count += before - filtered.length;
    }
    const before = this.patternSubscriptions.length;
    this.patternSubscriptions = this.patternSubscriptions.filter((s) => s.agentId !== agentId);
    count += before - this.patternSubscriptions.length;
    return count;
  }

  /**
   * Get subscriptions for a channel
   */
  getChannelSubscriptions(channel: string): SubscriptionId[] {
    const subs = this.subscriptions.get(channel) || [];
    return subs.map((s) => s.id);
  }

  /**
   * Get all channels with subscriptions
   */
  getChannels(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get queue depth
   */
  getQueueDepth(): number {
    return this.messageQueue.length;
  }

  /**
   * Clear the message queue
   */
  clearQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    count += this.patternSubscriptions.length;
    return count;
  }
}

// Export singleton for global access
export const messageBus = new MessageBus();

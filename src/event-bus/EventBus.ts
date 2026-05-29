/**
 * V74 Event Bus - Core event bus implementation
 * Handles publish/subscribe pattern for event distribution
 */

export type EventCallback<T = unknown> = (event: Event<T>) => void;

export interface Event<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
  source?: string;
}

export interface EventBusConfig {
  enableLogging: boolean;
  maxQueueSize: number;
  deliveryTimeout: number;
  retryAttempts: number;
}

type SubscriptionMap = Map<string, EventCallback[]>;

export class EventBus {
  public config: EventBusConfig;
  
  private subscriptions: SubscriptionMap = new Map();
  private eventQueue: Event[] = [];
  private publishedCount: number = 0;
  private subscribedCount: number = 0;

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? false,
      maxQueueSize: config.maxQueueSize ?? 1000,
      deliveryTimeout: config.deliveryTimeout ?? 5000,
      retryAttempts: config.retryAttempts ?? 3,
    };
  }

  /**
   * Publish an event to all subscribers
   */
  publish<T>(type: string, payload: T, source?: string): string {
    const id = this.generateEventId();
    const event: Event<T> = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      source,
    };

    if (this.config.enableLogging) {
      console.log(`[EventBus] Publishing event: ${type}`, event);
    }

    this.eventQueue.push(event as Event);
    if (this.eventQueue.length > this.config.maxQueueSize) {
      this.eventQueue.shift();
    }

    this.publishedCount++;
    this.notifySubscribers(event as Event);
    return id;
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe<T>(type: string, callback: EventCallback<T>): () => void {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, []);
    }
    
    const callbacks = this.subscriptions.get(type)!;
    callbacks.push(callback as EventCallback);
    this.subscribedCount++;

    if (this.config.enableLogging) {
      console.log(`[EventBus] Subscribed to event: ${type}`);
    }

    // Return unsubscribe function
    return () => this.unsubscribe(type, callback);
  }

  /**
   * Unsubscribe a specific callback from an event type
   */
  unsubscribe<T>(type: string, callback: EventCallback<T>): boolean {
    const callbacks = this.subscriptions.get(type);
    if (!callbacks) return false;

    const index = callbacks.indexOf(callback as EventCallback);
    if (index === -1) return false;

    callbacks.splice(index, 1);
    this.subscribedCount--;
    
    if (callbacks.length === 0) {
      this.subscriptions.delete(type);
    }

    if (this.config.enableLogging) {
      console.log(`[EventBus] Unsubscribed from event: ${type}`);
    }

    return true;
  }

  /**
   * Get all subscribers for a specific event type
   */
  getSubscribers(type: string): EventCallback[] {
    return this.subscriptions.get(type) ?? [];
  }

  /**
   * Get count of all subscriber callbacks
   */
  getSubscriberCount(): number {
    let count = 0;
    this.subscriptions.forEach(callbacks => {
      count += callbacks.length;
    });
    return count;
  }

  /**
   * Notify all subscribers of an event
   */
  private notifySubscribers(event: Event): void {
    const callbacks = this.subscriptions.get(event.type);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error(`[EventBus] Error notifying subscriber:`, error);
      }
    });
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current snapshot of event bus state
   */
  getSnapshot(): { metrics: Record<string, number | string | boolean> } {
    return {
      metrics: {
        publishedCount: this.publishedCount,
        subscribedCount: this.subscribedCount,
        queueLength: this.eventQueue.length,
        subscriptionTypes: this.subscriptions.size,
        maxQueueSize: this.config.maxQueueSize,
        loggingEnabled: this.config.enableLogging,
      },
    };
  }

  /**
   * Reset all metrics and clear subscriptions
   */
  reset(): void {
    this.publishedCount = 0;
    this.subscribedCount = 0;
    this.eventQueue = [];
    this.subscriptions.clear();
    
    if (this.config.enableLogging) {
      console.log('[EventBus] Reset performed');
    }
  }

  /**
   * Get a human-readable report of the event bus state
   */
  getReport(): string {
    return [
      '=== EventBus Report ===',
      `Published Events: ${this.publishedCount}`,
      `Active Subscriptions: ${this.subscribedCount}`,
      `Queue Length: ${this.eventQueue.length}`,
      `Subscription Types: ${this.subscriptions.size}`,
      `Logging: ${this.config.enableLogging ? 'Enabled' : 'Disabled'}`,
      `Max Queue Size: ${this.config.maxQueueSize}`,
      '========================',
    ].join('\n');
  }

  /**
   * Export metrics in a portable format
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: 'V74',
      metrics: {
        publishedCount: this.publishedCount,
        subscribedCount: this.subscribedCount,
        queueLength: this.eventQueue.length,
        subscriptionTypes: this.subscriptions.size,
        config: { ...this.config },
      },
    };
  }
}
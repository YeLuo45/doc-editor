/**
 * SessionEvents.ts
 * V75 Session Manager - Event emitting and listening system
 */

export interface EventConfig {
  enableLogging: boolean;
  maxListeners: number;
  asyncEmission: boolean;
  wildcardEnabled: boolean;
  namespace: string;
}

export type EventHandler = (...args: unknown[]) => void;

interface EventRecord {
  name: string;
  timestamp: number;
  data: unknown[];
}

export class SessionEvents {
  private listeners: Map<string, EventHandler[]> = new Map();
  private eventHistory: EventRecord[] = [];
  private metrics = {
    emits: 0,
    listenerCalls: 0,
    addedListeners: 0,
    removedListeners: 0,
    errors: 0,
  };

  readonly config: EventConfig = {
    enableLogging: false,
    maxListeners: 50,
    asyncEmission: false,
    wildcardEnabled: true,
    namespace: 'session_events',
  };

  emit(eventName: string, ...args: unknown[]): void {
    this.metrics.emits++;
    this.eventHistory.push({ name: eventName, timestamp: Date.now(), data: args });

    if (this.eventHistory.length > 200) {
      this.eventHistory.shift();
    }

    const handlers = this.listeners.get(eventName) ?? [];
    for (const handler of handlers) {
      try {
        handler(...args);
        this.metrics.listenerCalls++;
      } catch {
        this.metrics.errors++;
      }
    }

    if (this.config.wildcardEnabled) {
      const wildcardHandlers = this.listeners.get('*') ?? [];
      for (const handler of wildcardHandlers) {
        try {
          handler(eventName, ...args);
          this.metrics.listenerCalls++;
        } catch {
          this.metrics.errors++;
        }
      }
    }
  }

  on(eventName: string, handler: EventHandler): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const handlers = this.listeners.get(eventName)!;
    if (handlers.length >= this.config.maxListeners) {
      this.metrics.errors++;
      return;
    }

    handlers.push(handler);
    this.metrics.addedListeners++;
  }

  once(eventName: string, handler: EventHandler): void {
    const wrapper: EventHandler = (...args) => {
      handler(...args);
      this.off(eventName, wrapper);
    };
    this.on(eventName, wrapper);
  }

  off(eventName: string, handler: EventHandler): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.metrics.removedListeners++;
      }
    }
  }

  getListeners(eventName: string): EventHandler[] {
    return [...(this.listeners.get(eventName) ?? [])];
  }

  removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  getEventHistory(eventName?: string): EventRecord[] {
    if (eventName) {
      return this.eventHistory.filter(e => e.name === eventName);
    }
    return [...this.eventHistory];
  }

  listenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.length ?? 0;
  }

  getSnapshot(): { metrics: typeof this.metrics; eventTypes: number; historySize: number } {
    return {
      metrics: { ...this.metrics },
      eventTypes: this.listeners.size,
      historySize: this.eventHistory.length,
    };
  }

  reset(): void {
    this.listeners.clear();
    this.eventHistory = [];
    this.metrics = { emits: 0, listenerCalls: 0, addedListeners: 0, removedListeners: 0, errors: 0 };
  }

  getReport(): string {
    return [
      '=== Session Events Report ===',
      `Event Types: ${this.listeners.size}`,
      `History Size: ${this.eventHistory.length}`,
      `Metrics: emits=${this.metrics.emits}, calls=${this.metrics.listenerCalls}, errors=${this.metrics.errors}`,
      `Config: maxListeners=${this.config.maxListeners}, async=${this.config.asyncEmission}, wildcard=${this.config.wildcardEnabled}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof this.metrics } {
    return {
      version: 'V75-1.0.0',
      metrics: { ...this.metrics },
    };
  }
}
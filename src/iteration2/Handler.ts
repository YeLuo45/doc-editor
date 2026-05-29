/**
 * Handler.ts - Event handler module for doc-editor V32 Iteration 2
 * Handles event dispatching and management with priority support
 */

export interface EventHandler {
  id: string;
  name: string;
  priority: number;
  handler: (event: unknown) => void;
  enabled: boolean;
  eventTypes: string[];
}

export interface Event {
  type: string;
  payload: unknown;
  timestamp: number;
  id: string;
}

export interface HandlerMetrics {
  totalHandled: number;
  totalDispatched: number;
  totalErrors: number;
  handlersRegistered: number;
  averageHandlingTime: number;
}

export class Handler {
  private handlers: Map<string, EventHandler> = new Map();
  private events: Event[] = [];
  private metrics: HandlerMetrics = {
    totalHandled: 0,
    totalDispatched: 0,
    totalErrors: 0,
    handlersRegistered: 0,
    averageHandlingTime: 0,
  };

  /**
   * Handle an incoming event
   */
  handle(event: Event): boolean {
    this.events.push({ ...event, id: event.id || `evt_${Date.now()}` });
    this.metrics.totalDispatched++;

    const eligibleHandlers = Array.from(this.handlers.values())
      .filter(h => h.enabled && h.eventTypes.includes(event.type))
      .sort((a, b) => b.priority - a.priority);

    if (eligibleHandlers.length === 0) {
      return false;
    }

    for (const h of eligibleHandlers) {
      try {
        const start = Date.now();
        h.handler(event);
        const duration = Date.now() - start;
        this.updateAverageHandlingTime(duration);
        this.metrics.totalHandled++;
      } catch (error) {
        this.metrics.totalErrors++;
        console.error(`Handler ${h.name} failed:`, error);
      }
    }

    return true;
  }

  /**
   * Dispatch a new event with the given type and payload
   */
  dispatch(type: string, payload?: unknown): Event {
    const event: Event = {
      type,
      payload,
      timestamp: Date.now(),
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };

    this.handle(event);
    return event;
  }

  /**
   * Register a new event handler
   */
  registerHandler(
    name: string,
    handler: (event: unknown) => void,
    eventTypes: string[],
    priority = 0
  ): EventHandler {
    const id = `handler_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const eventHandler: EventHandler = {
      id,
      name,
      handler,
      priority,
      enabled: true,
      eventTypes,
    };

    this.handlers.set(id, eventHandler);
    this.metrics.handlersRegistered++;
    return eventHandler;
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): EventHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get a handler by ID
   */
  getHandler(id: string): EventHandler | undefined {
    return this.handlers.get(id);
  }

  /**
   * Remove a handler by ID
   */
  removeHandler(id: string): boolean {
    const deleted = this.handlers.delete(id);
    if (deleted) {
      this.metrics.handlersRegistered--;
    }
    return deleted;
  }

  /**
   * Get a snapshot of current handler state
   */
  getSnapshot(): {
    handlers: Map<string, EventHandler>;
    events: Event[];
    metrics: HandlerMetrics;
  } {
    return {
      handlers: new Map(this.handlers),
      events: [...this.events],
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset all handlers and metrics
   */
  reset(): void {
    this.handlers.clear();
    this.events = [];
    this.metrics = {
      totalHandled: 0,
      totalDispatched: 0,
      totalErrors: 0,
      handlersRegistered: 0,
      averageHandlingTime: 0,
    };
  }

  /**
   * Generate a status report
   */
  getReport(): {
    status: 'idle' | 'active' | 'error';
    handlerCount: number;
    eventCount: number;
    metrics: HandlerMetrics;
    enabledHandlers: number;
    disabledHandlers: number;
  } {
    const enabled = Array.from(this.handlers.values()).filter(h => h.enabled).length;
    const disabled = this.handlers.size - enabled;

    return {
      status: this.metrics.totalErrors > 0 ? 'error' : this.events.length > 0 ? 'active' : 'idle',
      handlerCount: this.handlers.size,
      eventCount: this.events.length,
      metrics: { ...this.metrics },
      enabledHandlers: enabled,
      disabledHandlers: disabled,
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): {
    timestamp: number;
    metrics: HandlerMetrics;
    version: string;
    exportVersion: string;
  } {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      version: '1.0.0',
      exportVersion: 'V32-I2',
    };
  }

  private updateAverageHandlingTime(duration: number): void {
    if (this.metrics.totalHandled > 0) {
      this.metrics.averageHandlingTime =
        (this.metrics.averageHandlingTime * (this.metrics.totalHandled - 1) + duration) /
        this.metrics.totalHandled;
    } else {
      this.metrics.averageHandlingTime = duration;
    }
  }
}

export default Handler;
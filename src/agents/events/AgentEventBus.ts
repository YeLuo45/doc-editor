// AgentEventBus - Event bus for inter-agent communication

export type EventHandler = (data: any) => void;

// Predefined events
export const Events = {
  REVIEWER_REVIEW_COMPLETE: 'reviewer:review_complete',
  RESEARCHER_RESEARCH_COMPLETE: 'researcher:research_complete',
  EDITOR_DOCUMENT_SAVED: 'editor:document_saved',
} as const;

export type EventName = typeof Events[keyof typeof Events] | string;

class AgentEventBusImpl {
  private handlers: Map<string, Set<EventHandler>>;

  constructor() {
    this.handlers = new Map();
  }

  emit(event: string, data?: any): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (e) {
          console.error(`Event handler error for ${event}:`, e);
        }
      });
    }
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  hasListeners(event: string): boolean {
    const handlers = this.handlers.get(event);
    return handlers !== undefined && handlers.size > 0;
  }

  listenerCount(event: string): number {
    const handlers = this.handlers.get(event);
    return handlers ? handlers.size : 0;
  }
}

export const agentEventBus = new AgentEventBusImpl();

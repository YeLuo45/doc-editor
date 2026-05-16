// MessageBus - Async message routing for multi-agent communication

import { AgentMessage, AgentType, Handler } from './types';

type AsyncQueue<T> = {
  enqueue: (item: T) => Promise<void>;
  dequeue: () => Promise<T>;
  size: () => number;
};

interface QueueItem<T> {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  item: T;
}

function createAsyncQueue<T>(): AsyncQueue<T> {
  const queue: QueueItem<T>[] = [];
  let closed = false;

  const enqueue = (item: T): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (closed) {
        throw new Error('Queue is closed');
      }
      queue.push({ resolve: () => resolve(), reject: () => {}, item });
    });
  };

  const dequeue = (): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (closed && queue.length === 0) {
        reject(new Error('Queue is closed and empty'));
        return;
      }
      const item = queue.shift();
      if (item) {
        resolve(item.item);
      } else {
        // Wait for next item
        const checkQueue = () => {
          const next = queue.shift();
          if (next) {
            resolve(next.item);
          } else if (!closed) {
            setTimeout(checkQueue, 10);
          } else {
            reject(new Error('Queue is closed and empty'));
          }
        };
        setTimeout(checkQueue, 10);
      }
    });
  };

  const size = () => queue.length;

  return { enqueue, dequeue, size };
}

export class MessageBus {
  private queue: AsyncQueue<AgentMessage>;
  private subscribers: Map<AgentType, Handler[]>;
  private messageHistory: AgentMessage[];
  private processingPromise: Promise<void> | null;

  constructor() {
    this.queue = createAsyncQueue<AgentMessage>();
    this.subscribers = new Map();
    this.messageHistory = [];
    this.processingPromise = null;
  }

  async publish(message: AgentMessage): Promise<void> {
    // Add to history
    this.messageHistory.push(message);
    
    // Queue the message for processing
    await this.queue.enqueue(message);
    
    // Start processing if not already running
    if (!this.processingPromise) {
      this.processingPromise = this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    while (true) {
      try {
        const message = await this.queue.dequeue();
        await this.dispatchMessage(message);
      } catch {
        // Queue is closed or empty, stop processing
        break;
      }
    }
    this.processingPromise = null;
  }

  private async dispatchMessage(message: AgentMessage): Promise<void> {
    const { receiver } = message;

    if (receiver === 'broadcast') {
      // Broadcast to all subscribers
      const allHandlers: Handler[] = [];
      this.subscribers.forEach((handlers) => {
        allHandlers.push(...handlers);
      });
      await Promise.all(
        allHandlers.map((handler) =>
          this.safeExecute(handler, message)
        )
      );
    } else {
      // Send to specific receiver
      const handlers = this.subscribers.get(receiver) || [];
      await Promise.all(
        handlers.map((handler) =>
          this.safeExecute(handler, message)
        )
      );
    }
  }

  private async safeExecute(
    handler: Handler,
    message: AgentMessage
  ): Promise<void> {
    try {
      await handler(message);
    } catch (error) {
      console.error(
        `[MessageBus] Handler error for message ${message.id}:`,
        error
      );
    }
  }

  subscribe(agent: AgentType, handler: Handler): void {
    const handlers = this.subscribers.get(agent) || [];
    handlers.push(handler);
    this.subscribers.set(agent, handlers);
  }

  unsubscribe(agent: AgentType, handler: Handler): void {
    const handlers = this.subscribers.get(agent) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  getHistory(conversationId?: string): AgentMessage[] {
    if (conversationId) {
      return this.messageHistory.filter(
        (m) => m.conversationId === conversationId
      );
    }
    return [...this.messageHistory];
  }

  clearHistory(): void {
    this.messageHistory = [];
  }

  // Get pending message count
  pendingCount(): number {
    return this.queue.size();
  }
}

// Singleton instance
export const messageBus = new MessageBus();
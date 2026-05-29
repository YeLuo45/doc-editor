export interface StreamHandlerConfig {
  url?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

export type StreamStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface StreamMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: number;
}

export class StreamHandler<T = unknown> {
  private status: StreamStatus = 'disconnected';
  private messageQueue: StreamMessage<T>[] = [];
  private listeners: Map<string, Set<(msg: StreamMessage<T>) => void>> = new Map();
  public config: StreamHandlerConfig;

  constructor(config: StreamHandlerConfig = {}) {
    this.config = config;
  }

  connect(url?: string): Promise<void> {
    const targetUrl = url || this.config.url;
    if (!targetUrl) {
      return Promise.reject(new Error('No URL provided for connection'));
    }

    this.status = 'connecting';
    this.messageQueue = [];

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.status === 'connecting') {
          this.status = 'connected';
          resolve();
        } else {
          this.status = 'error';
          reject(new Error('Connection failed'));
        }
      }, 50);
    });
  }

  disconnect(): void {
    this.status = 'disconnected';
    this.messageQueue = [];
    this.listeners.clear();
  }

  send(message: Omit<StreamMessage<T>, 'id' | 'timestamp'>): boolean {
    if (this.status !== 'connected') {
      return false;
    }

    const fullMessage: StreamMessage<T> = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.messageQueue.push(fullMessage);
    this.emit(fullMessage);
    return true;
  }

  getStatus(): StreamStatus {
    return this.status;
  }

  on(event: string, listener: (msg: StreamMessage<T>) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: (msg: StreamMessage<T>) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  private emit(message: StreamMessage<T>): void {
    const eventListeners = this.listeners.get(message.type);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(message));
    }

    const allListeners = this.listeners.get('*');
    if (allListeners) {
      allListeners.forEach(listener => listener(message));
    }
  }

  getQueuedMessages(): StreamMessage<T>[] {
    return [...this.messageQueue];
  }

  clearQueue(): void {
    this.messageQueue = [];
  }

  getSnapshot(): { metrics: { status: StreamStatus; queueSize: number; listeners: number } } {
    return {
      metrics: {
        status: this.status,
        queueSize: this.messageQueue.length,
        listeners: this.listeners.size,
      },
    };
  }

  reset(): void {
    this.status = 'disconnected';
    this.messageQueue = [];
    this.listeners.clear();
  }

  getReport(): string {
    return `StreamHandler Report: status=${this.status}, queueSize=${this.messageQueue.length}, listeners=${this.listeners.size}`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}
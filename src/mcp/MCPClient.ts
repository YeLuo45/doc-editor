/**
 * MCPClient - MCP Protocol Client
 * Client for communicating with MCP servers
 */

import { MCPTransport, WebSocketTransport, TransportConfig } from './MCPTransport.js';
import type { MCPRequest, MCPResponse, MCPNotification } from './MCPProtocol.js';

export interface MCPClientOptions {
  transport?: TransportConfig;
  timeout?: number;
  autoReconnect?: boolean;
}

export interface MCPClientMetrics {
  requestsSent: number;
  requestsCompleted: number;
  requestsFailed: number;
  notificationsSent: number;
  averageResponseTime: number;
  lastRequestAt?: number;
  lastResponseAt?: number;
}

type NotificationHandler = (notification: MCPNotification) => void;

/**
 * MCPClient - Client for MCP protocol communication
 */
export class MCPClient {
  private transport?: MCPTransport;
  private transportConfig?: TransportConfig;
  private connected: boolean = false;
  private requestId: number = 0;
  private pendingRequests: Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = new Map();
  private notificationHandlers: Map<string, NotificationHandler> = new Map();
  private metrics: MCPClientMetrics;
  private timeout: number;
  private autoReconnect: boolean;

  constructor(options: MCPClientOptions = {}) {
    this.timeout = options.timeout ?? 30000;
    this.autoReconnect = options.autoReconnect ?? true;
    if (options.transport) {
      this.transportConfig = options.transport;
    }
    this.metrics = {
      requestsSent: 0,
      requestsCompleted: 0,
      requestsFailed: 0,
      notificationsSent: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Connect to MCP server
   */
  async connect(config?: TransportConfig): Promise<void> {
    const transportConfig = config ?? this.transportConfig;
    if (!transportConfig) {
      throw new Error('Transport configuration is required');
    }
    this.transportConfig = transportConfig;
    this.transport = new WebSocketTransport(transportConfig);
    this.setupTransportHandlers();
    await this.transport.connect();
    this.connected = true;
  }

  /**
   * Setup transport event handlers
   */
  private setupTransportHandlers(): void {
    if (!this.transport) return;
    this.transport.onMessage((data) => {
      this.handleMessage(data);
    });
    this.transport.onError((error) => {
      this.handleConnectionError(error);
    });
    this.transport.onClose((code, reason) => {
      this.handleClose(code, reason);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: unknown): void {
    if (!data || typeof data !== 'object') return;
    const message = data as Record<string, unknown>;
    if (message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id as string | number);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id as string | number);
        if ('result' in message) {
          pending.resolve(message.result);
          this.metrics.requestsCompleted++;
        } else if ('error' in message) {
          const error = new Error((message.error as { message: string }).message);
          pending.reject(error);
          this.metrics.requestsFailed++;
        }
        this.metrics.lastResponseAt = Date.now();
      }
    } else if (message.method && !message.id) {
      const notification = message as unknown as MCPNotification;
      const handler = this.notificationHandlers.get(notification.method);
      if (handler) {
        handler(notification);
      }
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    if (this.autoReconnect && this.transport) {
      this.transport.reconnect();
    }
  }

  /**
   * Handle connection close
   */
  private handleClose(code: number, reason: string): void {
    this.connected = false;
    if (this.autoReconnect && this.transport) {
      this.transport.reconnect();
    }
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.disconnect();
    }
    this.connected = false;
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
    }
    this.pendingRequests.clear();
  }

  /**
   * Send request and wait for response
   */
  async sendRequest<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    if (!this.transport || !this.connected) {
      throw new Error('Not connected to server');
    }
    const id = this.generateRequestId();
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method: method as MCPRequest['method'],
      params,
    };
    this.metrics.requestsSent++;
    this.metrics.lastRequestAt = Date.now();
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out after ${this.timeout}ms`));
        this.metrics.requestsFailed++;
      }, this.timeout);
      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject, timeout });
      this.transport!.send(request).catch((error) => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
        this.metrics.requestsFailed++;
      });
    });
  }

  /**
   * Send notification (no response expected)
   */
  async sendNotification(method: string, params?: Record<string, unknown>): Promise<void> {
    if (!this.transport || !this.connected) {
      throw new Error('Not connected to server');
    }
    const notification: MCPNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    this.metrics.notificationsSent++;
    await this.transport.send(notification);
  }

  /**
   * Register handler for server notifications
   */
  onNotification(method: string, handler: NotificationHandler): void {
    this.notificationHandlers.set(method, handler);
  }

  /**
   * Remove notification handler
   */
  offNotification(method: string): void {
    this.notificationHandlers.delete(method);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `client_${++this.requestId}_${Date.now()}`;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get client metrics snapshot
   */
  getSnapshot(): Record<string, unknown> {
    return {
      connected: this.connected,
      metrics: { ...this.metrics },
      pendingRequests: this.pendingRequests.size,
      notificationHandlers: this.notificationHandlers.size,
    };
  }

  /**
   * Get client report
   */
  getReport(): string {
    return [
      '=== MCP Client Report ===',
      `Connected: ${this.connected}`,
      `Requests Sent: ${this.metrics.requestsSent}`,
      `Requests Completed: ${this.metrics.requestsCompleted}`,
      `Requests Failed: ${this.metrics.requestsFailed}`,
      `Notifications Sent: ${this.metrics.notificationsSent}`,
      `Average Response Time: ${this.metrics.averageResponseTime.toFixed(2)}ms`,
      `Pending Requests: ${this.pendingRequests.size}`,
      `Registered Handlers: ${this.notificationHandlers.size}`,
    ].join('\n');
  }

  /**
   * Export metrics for reporting
   */
  exportMetrics(): Record<string, unknown> {
    return {
      client: this.metrics,
      transport: this.transport?.getMetrics(),
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * Reset client state
   */
  reset(): void {
    this.connected = false;
    this.requestId = 0;
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
    }
    this.pendingRequests.clear();
    this.notificationHandlers.clear();
    this.metrics = {
      requestsSent: 0,
      requestsCompleted: 0,
      requestsFailed: 0,
      notificationsSent: 0,
      averageResponseTime: 0,
    };
    this.transport?.reset();
  }
}
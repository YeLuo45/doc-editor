/**
 * MCPTransport - Transport Layer for MCP Communication
 * WebSocket/SSE transport with auto-reconnect
 */

import { MCPProtocol, MCPProtocolOptions } from './MCPProtocol.js';

export type TransportType = 'websocket' | 'sse' | 'stdio';

export interface TransportConfig {
  url?: string;
  type: TransportType;
  protocols?: string[];
  headers?: Record<string, string>;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface TransportMetrics {
  bytesSent: number;
  bytesReceived: number;
  messagesSent: number;
  messagesReceived: number;
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  reconnectAttempts: number;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
}

export type TransportEventHandler = (data: unknown) => void;
export type TransportErrorHandler = (error: Error) => void;
export type TransportCloseHandler = (code: number, reason: string) => void;

export abstract class MCPTransport {
  protected config: TransportConfig;
  protected protocol: MCPProtocol;
  protected metrics: TransportMetrics;
  protected connected: boolean = false;
  protected reconnectAttempts: number = 0;
  protected onMessageHandler?: TransportEventHandler;
  protected onErrorHandler?: TransportErrorHandler;
  protected onCloseHandler?: TransportCloseHandler;

  constructor(config: TransportConfig, protocolOptions?: MCPProtocolOptions) {
    this.config = { ...config, reconnect: config.reconnect ?? true, reconnectInterval: config.reconnectInterval ?? 1000, maxReconnectAttempts: config.maxReconnectAttempts ?? 5 };
    this.protocol = new MCPProtocol(protocolOptions);
    this.metrics = { bytesSent: 0, bytesReceived: 0, messagesSent: 0, messagesReceived: 0, connectionAttempts: 0, successfulConnections: 0, failedConnections: 0, reconnectAttempts: 0 };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(code?: number, reason?: string): Promise<void>;
  abstract send(data: string | object): Promise<void>;

  async reconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts ?? 5)) return false;
    this.reconnectAttempts++;
    this.metrics.reconnectAttempts++;
    const delay = (this.config.reconnectInterval ?? 1000) * Math.pow(2, this.reconnectAttempts - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    try { await this.connect(); return true; } catch { return false; }
  }

  isConnected(): boolean { return this.connected; }
  onMessage(handler: TransportEventHandler): void { this.onMessageHandler = handler; }
  onError(handler: TransportErrorHandler): void { this.onErrorHandler = handler; }
  onClose(handler: TransportCloseHandler): void { this.onCloseHandler = handler; }

  protected handleMessage(data: unknown): void {
    this.metrics.messagesReceived++;
    if (typeof data === 'string' || typeof data === 'object') this.metrics.bytesReceived += JSON.stringify(data).length;
    this.onMessageHandler?.(data);
  }

  protected handleError(error: Error): void { this.metrics.failedConnections++; this.onErrorHandler?.(error); }
  protected handleClose(code: number, reason: string): void { this.connected = false; this.metrics.lastDisconnectedAt = Date.now(); this.onCloseHandler?.(code, reason); }
  getMetrics(): TransportMetrics { return { ...this.metrics }; }
  getSnapshot(): Record<string, unknown> { return { connected: this.connected, metrics: this.getMetrics(), config: this.config, reconnectAttempts: this.reconnectAttempts }; }
  exportMetrics(): Record<string, unknown> { return { transport: this.metrics, config: { type: this.config.type, url: this.config.url, reconnect: this.config.reconnect }, connected: this.connected, reconnectAttempts: this.reconnectAttempts }; }
  getReport(): string { return ['=== MCP Transport Report ===', `Type: ${this.config.type}`, `Connected: ${this.connected}`, `URL: ${this.config.url ?? 'N/A'}`, `Bytes Sent: ${this.metrics.bytesSent}`, `Bytes Received: ${this.metrics.bytesReceived}`, `Messages Sent: ${this.metrics.messagesSent}`, `Messages Received: ${this.metrics.messagesReceived}`, `Connection Attempts: ${this.metrics.connectionAttempts}`, `Successful Connections: ${this.metrics.successfulConnections}`, `Failed Connections: ${this.metrics.failedConnections}`, `Reconnect Attempts: ${this.metrics.reconnectAttempts}`, `Last Connected: ${this.metrics.lastConnectedAt ? new Date(this.metrics.lastConnectedAt).toISOString() : 'N/A'}`].join('\n'); }
  reset(): void { this.connected = false; this.reconnectAttempts = 0; this.metrics = { bytesSent: 0, bytesReceived: 0, messagesSent: 0, messagesReceived: 0, connectionAttempts: 0, successfulConnections: 0, failedConnections: 0, reconnectAttempts: 0 }; this.protocol.reset(); }
  getProtocol(): MCPProtocol { return this.protocol; }
}

export class WebSocketTransport extends MCPTransport {
  private ws?: WebSocket;

  async connect(): Promise<void> {
    if (!this.config.url) throw new Error('WebSocket URL is required');
    this.metrics.connectionAttempts++;
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url!, this.config.protocols);
        this.ws.onopen = () => { this.connected = true; this.metrics.successfulConnections++; this.metrics.lastConnectedAt = Date.now(); this.reconnectAttempts = 0; resolve(); };
        this.ws.onmessage = (event) => { try { this.handleMessage(JSON.parse(event.data)); } catch { this.handleMessage(event.data); } };
        this.ws.onerror = () => this.handleError(new Error('WebSocket error'));
        this.ws.onclose = (event) => { this.handleClose(event.code, event.reason); if (this.config.reconnect && !event.wasClean) this.reconnect(); };
      } catch (error) { this.metrics.failedConnections++; reject(error); }
    });
  }

  async disconnect(code: number = 1000, reason: string = 'Normal closure'): Promise<void> { if (this.ws) { this.ws.close(code, reason); this.ws = undefined; } this.connected = false; }
  async send(data: string | object): Promise<void> { if (!this.connected || !this.ws) throw new Error('Not connected'); const message = typeof data === 'object' ? JSON.stringify(data) : data; this.ws.send(message); this.metrics.bytesSent += message.length; this.metrics.messagesSent++; }
}

export class SSSTransport extends MCPTransport {
  private eventSource?: EventSource;
  private reconnectTimeout?: ReturnType<typeof setTimeout>;

  async connect(): Promise<void> {
    if (!this.config.url) throw new Error('SSE URL is required');
    this.metrics.connectionAttempts++;
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.config.url!, { withCredentials: true });
        this.eventSource.onopen = () => { this.connected = true; this.metrics.successfulConnections++; this.metrics.lastConnectedAt = Date.now(); this.reconnectAttempts = 0; resolve(); };
        this.eventSource.onmessage = (event) => { try { this.handleMessage(JSON.parse(event.data)); } catch { this.handleMessage(event.data); } };
        this.eventSource.onerror = () => { this.handleError(new Error('SSE error')); if (this.config.reconnect) this.scheduleReconnect(); };
      } catch (error) { this.metrics.failedConnections++; reject(error); }
    });
  }

  private scheduleReconnect(): void { if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout); this.reconnectTimeout = setTimeout(() => this.reconnect(), this.config.reconnectInterval); }
  async disconnect(): Promise<void> { if (this.eventSource) { this.eventSource.close(); this.eventSource = undefined; } if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout); this.connected = false; }
  async send(_data: string | object): Promise<void> { throw new Error('SSE is read-only transport'); }
}
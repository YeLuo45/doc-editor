/**
 * MCPProtocol - Protocol Types for MCP Communication
 * V23 MCP Protocol definitions for request/response/notification messages
 */

// Message types
export type MCPMessageType = 'request' | 'response' | 'notification';

export type MCPMethod =
  | 'tools/list'
  | 'tools/call'
  | 'resources/list'
  | 'resources/read'
  | 'resources/subscribe'
  | 'resources/unsubscribe'
  | 'ping'
  | 'initialize'
  | 'shutdown';

export type MCPErrorCode =
  | -32700  // Parse error
  | -32600  // Invalid request
  | -32601  // Method not found
  | -32602  // Invalid params
  | -32603  // Internal error
  | -32000  // Server error
  | -32001; // Connection closed

// Protocol message interfaces
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: MCPMethod;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPError {
  code: MCPErrorCode;
  message: string;
  data?: unknown;
}

// Protocol options
export interface MCPProtocolOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  heartbeatInterval?: number;
}

// Metrics tracking
export interface MCPProtocolMetrics {
  requestsSent: number;
  requestsReceived: number;
  responsesSent: number;
  responsesReceived: number;
  notificationsSent: number;
  notificationsReceived: number;
  errors: number;
  averageLatency: number;
  lastRequestAt?: number;
  lastResponseAt?: number;
}

// Protocol stats snapshot
export interface MCPProtocolSnapshot {
  metrics: MCPProtocolMetrics;
  activeRequests: Map<string | number, MCPRequest>;
  pendingResponses: Map<string | number, number>;
  timestamp: number;
}

/**
 * MCPProtocol - Protocol handler for MCP messages
 */
export class MCPProtocol {
  private metrics: MCPProtocolMetrics;
  private activeRequests: Map<string | number, MCPRequest>;
  private pendingResponses: Map<string | number, number>;
  private options: Required<MCPProtocolOptions>;

  constructor(options: MCPProtocolOptions = {}) {
    this.metrics = {
      requestsSent: 0,
      requestsReceived: 0,
      responsesSent: 0,
      responsesReceived: 0,
      notificationsSent: 0,
      notificationsReceived: 0,
      errors: 0,
      averageLatency: 0,
    };
    this.activeRequests = new Map();
    this.pendingResponses = new Map();
    this.options = {
      timeout: options.timeout ?? 30000,
      retryAttempts: options.retryAttempts ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
    };
  }

  /**
   * Create a new request message
   */
  createRequest(
    method: MCPMethod,
    params?: Record<string, unknown>,
    id?: string | number
  ): MCPRequest {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: id ?? this.generateId(),
      method,
      params,
    };
    this.activeRequests.set(request.id, request);
    this.pendingResponses.set(request.id, Date.now());
    this.metrics.requestsSent++;
    this.metrics.lastRequestAt = Date.now();
    return request;
  }

  /**
   * Create a response message
   */
  createResponse(
    id: string | number,
    result?: unknown
  ): MCPResponse {
    this.metrics.responsesSent++;
    this.metrics.lastResponseAt = Date.now();
    this.updateLatency(id);
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  /**
   * Create an error response
   */
  createErrorResponse(
    id: string | number,
    code: MCPErrorCode,
    message: string,
    data?: unknown
  ): MCPResponse {
    this.metrics.errors++;
    this.metrics.responsesSent++;
    this.metrics.lastResponseAt = Date.now();
    this.updateLatency(id);
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message, data },
    };
  }

  /**
   * Create a notification message
   */
  createNotification(
    method: string,
    params?: Record<string, unknown>
  ): MCPNotification {
    this.metrics.notificationsSent++;
    return {
      jsonrpc: '2.0',
      method,
      params,
    };
  }

  /**
   * Track received request
   */
  trackRequest(request: MCPRequest): void {
    this.metrics.requestsReceived++;
    this.activeRequests.set(request.id, request);
  }

  /**
   * Track received response
   */
  trackResponse(response: MCPResponse): void {
    this.metrics.responsesReceived++;
    if (response.result !== undefined) {
      this.metrics.lastResponseAt = Date.now();
    }
    this.activeRequests.delete(response.id);
    this.pendingResponses.delete(response.id);
  }

  /**
   * Track received notification
   */
  trackNotification(): void {
    this.metrics.notificationsReceived++;
  }

  /**
   * Track error
   */
  trackError(): void {
    this.metrics.errors++;
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Update latency metric for a request
   */
  private updateLatency(id: string | number): void {
    const sentAt = this.pendingResponses.get(id);
    if (sentAt) {
      const latency = Date.now() - sentAt;
      const currentAvg = this.metrics.averageLatency;
      const count = this.metrics.responsesReceived;
      this.metrics.averageLatency = currentAvg === 0
        ? latency
        : (currentAvg * (count - 1) + latency) / count;
    }
  }

  /**
   * Get protocol metrics snapshot
   */
  getSnapshot(): MCPProtocolSnapshot {
    return {
      metrics: { ...this.metrics },
      activeRequests: new Map(this.activeRequests),
      pendingResponses: new Map(this.pendingResponses),
      timestamp: Date.now(),
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): MCPProtocolMetrics {
    return { ...this.metrics };
  }

  /**
   * Export metrics for reporting
   */
  exportMetrics(): Record<string, unknown> {
    return {
      protocol: this.metrics,
      options: this.options,
      activeRequestCount: this.activeRequests.size,
      pendingResponseCount: this.pendingResponses.size,
    };
  }

  /**
   * Get detailed report
   */
  getReport(): string {
    return [
      '=== MCP Protocol Report ===',
      `Requests Sent: ${this.metrics.requestsSent}`,
      `Requests Received: ${this.metrics.requestsReceived}`,
      `Responses Sent: ${this.metrics.responsesSent}`,
      `Responses Received: ${this.metrics.responsesReceived}`,
      `Notifications Sent: ${this.metrics.notificationsSent}`,
      `Notifications Received: ${this.metrics.notificationsReceived}`,
      `Errors: ${this.metrics.errors}`,
      `Average Latency: ${this.metrics.averageLatency.toFixed(2)}ms`,
      `Active Requests: ${this.activeRequests.size}`,
      `Pending Responses: ${this.pendingResponses.size}`,
    ].join('\n');
  }

  /**
   * Reset protocol state
   */
  reset(): void {
    this.metrics = {
      requestsSent: 0,
      requestsReceived: 0,
      responsesSent: 0,
      responsesReceived: 0,
      notificationsSent: 0,
      notificationsReceived: 0,
      errors: 0,
      averageLatency: 0,
    };
    this.activeRequests.clear();
    this.pendingResponses.clear();
  }

  /**
   * Check if request is pending
   */
  isPending(id: string | number): boolean {
    return this.pendingResponses.has(id);
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingResponses.size;
  }
}
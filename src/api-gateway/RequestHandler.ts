/**
 * RequestHandler.ts - V78 Request Handler
 * Handles incoming requests and processes them
 */

export interface HandlerConfig {
  maxPayloadSize: number;
  timeout: number;
  retryAttempts: number;
  enableValidation: boolean;
  enableCompression: boolean;
}

type RequestHandlerConfig = HandlerConfig;

export interface ProcessedRequest {
  id: string;
  method: string;
  path: string;
  timestamp: number;
  processingTime: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface HandlerMetrics {
  totalHandled: number;
  successful: number;
  failed: number;
  averageProcessingTime: number;
}

export class RequestHandler {
  private handlers: Map<string, (request: unknown) => unknown> = new Map();
  private processedRequests: Map<string, ProcessedRequest> = new Map();
  private metrics: HandlerMetrics = {
    totalHandled: 0,
    successful: 0,
    failed: 0,
    averageProcessingTime: 0,
  };

  public readonly config: RequestHandlerConfig;

  constructor(config: Partial<HandlerConfig> = {}) {
    this.config = {
      maxPayloadSize: config.maxPayloadSize ?? 10485760,
      timeout: config.timeout ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
      enableValidation: config.enableValidation ?? true,
      enableCompression: config.enableCompression ?? false,
    };
  }

  /**
   * Register a handler for a specific request type
   */
  registerHandler(name: string, handler: (request: unknown) => unknown): boolean {
    if (this.handlers.has(name)) {
      return false;
    }
    this.handlers.set(name, handler);
    return true;
  }

  /**
   * Handle an incoming request
   */
  handle(name: string, request: unknown): { success: boolean; result?: unknown; error?: string } {
    const handler = this.handlers.get(name);

    if (!handler) {
      return { success: false, error: `Handler '${name}' not found` };
    }

    const processed: ProcessedRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      method: (request as { method?: string })?.method ?? 'unknown',
      path: (request as { path?: string })?.path ?? 'unknown',
      timestamp: Date.now(),
      processingTime: 0,
      status: 'processing',
    };

    const startTime = Date.now();

    try {
      const result = handler(request);
      processed.processingTime = Date.now() - startTime;
      processed.status = 'completed';

      this.processedRequests.set(processed.id, processed);
      this.updateMetrics(true);

      return { success: true, result };
    } catch (error) {
      processed.processingTime = Date.now() - startTime;
      processed.status = 'failed';

      this.processedRequests.set(processed.id, processed);
      this.updateMetrics(false);

      return { success: false, error: String(error) };
    }
  }

  /**
   * Process a batch of requests
   */
  process(requests: Array<{ name: string; request: unknown }>): Array<{ success: boolean; result?: unknown; error?: string }> {
    return requests.map(req => this.handle(req.name, req.request));
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler metrics
   */
  getMetrics(): HandlerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get processed request by ID
   */
  getRequest(requestId: string): ProcessedRequest | undefined {
    return this.processedRequests.get(requestId);
  }

  /**
   * Get all processed requests
   */
  getProcessedRequests(): ProcessedRequest[] {
    return Array.from(this.processedRequests.values());
  }

  private updateMetrics(success: boolean): void {
    this.metrics.totalHandled++;
    
    if (success) {
      this.metrics.successful++;
    } else {
      this.metrics.failed++;
    }

    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalHandled - 1);
    this.metrics.averageProcessingTime = (totalTime + (this.processedRequests.size > 0 ? 
      Array.from(this.processedRequests.values()).reduce((sum, req) => sum + req.processingTime, 0) / this.processedRequests.size : 0)) / this.metrics.totalHandled;
  }

  /**
   * Get a snapshot of handler state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        totalHandlers: this.handlers.size,
        totalProcessed: this.processedRequests.size,
        ...this.metrics,
      },
    };
  }

  /**
   * Reset handler state
   */
  reset(): void {
    this.processedRequests.clear();
    this.metrics = {
      totalHandled: 0,
      successful: 0,
      failed: 0,
      averageProcessingTime: 0,
    };
  }

  /**
   * Generate a detailed report
   */
  getReport(): string {
    return [
      '=== Request Handler Report ===',
      `Total Handlers: ${this.handlers.size}`,
      `Total Processed: ${this.metrics.totalHandled}`,
      `Successful: ${this.metrics.successful}`,
      `Failed: ${this.metrics.failed}`,
      `Average Processing Time: ${this.metrics.averageProcessingTime.toFixed(2)}ms`,
      `Config: maxPayloadSize=${this.config.maxPayloadSize}, timeout=${this.config.timeout}`,
      '',
      '--- Registered Handlers ---',
      ...Array.from(this.handlers.keys()).map(h => `- ${h}`),
    ].join('\n');
  }

  /**
   * Export metrics for monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}
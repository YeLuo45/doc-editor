/**
 * V74 Event Processor - Processes events with batching and statistics
 * Provides event processing with process/batch/getProcessed/getStats functionality
 */

import { Event } from './EventBus';

export interface ProcessingOptions {
  async?: boolean;
  timeout?: number;
  retries?: number;
}

export interface ProcessedEvent {
  event: Event;
  processedAt: number;
  duration: number;
  success: boolean;
  error?: string;
}

export interface ProcessorConfig {
  enableLogging: boolean;
  maxBatchSize: number;
  processingTimeout: number;
  enableRetry: boolean;
}

export class EventProcessor {
  public config: ProcessorConfig;
  
  private processedEvents: ProcessedEvent[] = [];
  private pendingQueue: Event[] = [];
  private successCount: number = 0;
  private failureCount: number = 0;
  private totalProcessingTime: number = 0;

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? false,
      maxBatchSize: config.maxBatchSize ?? 50,
      processingTimeout: config.processingTimeout ?? 30000,
      enableRetry: config.enableRetry ?? true,
    };
  }

  /**
   * Process a single event
   */
  async process<T>(
    event: Event<T>,
    handler: (event: Event<T>) => Promise<void> | void,
    options?: ProcessingOptions
  ): Promise<ProcessedEvent> {
    if (this.config.enableLogging) {
      console.log(`[EventProcessor] Processing event: ${event.type}`);
    }

    const startTime = Date.now();
    const processed: ProcessedEvent = {
      event,
      processedAt: startTime,
      duration: 0,
      success: false,
    };

    try {
      const timeout = options?.timeout ?? this.config.processingTimeout;
      const asyncHandler = Promise.resolve(handler(event));
      
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), timeout);
      });

      await Promise.race([asyncHandler, timeoutPromise]);
      
      processed.success = true;
      this.successCount++;
    } catch (error) {
      processed.success = false;
      processed.error = error instanceof Error ? error.message : String(error);
      this.failureCount++;

      if (this.config.enableLogging) {
        console.error(`[EventProcessor] Processing failed:`, error);
      }

      // Retry if enabled
      if (this.config.enableRetry && (options?.retries ?? 0) > 0) {
        return this.processWithRetry(event, handler, {
          ...options,
          retries: (options?.retries ?? 1) - 1,
        });
      }
    }

    processed.duration = Date.now() - startTime;
    this.totalProcessingTime += processed.duration;
    this.pushProcessed(processed);

    return processed;
  }

  /**
   * Process with retry logic
   */
  private async processWithRetry<T>(
    event: Event<T>,
    handler: (event: Event<T>) => Promise<void> | void,
    options?: ProcessingOptions
  ): Promise<ProcessedEvent> {
    return this.process(event, handler, options);
  }

  /**
   * Process multiple events in batch
   */
  async batch<T>(
    events: Event<T>[],
    handler: (event: Event<T>) => Promise<void> | void,
    options?: ProcessingOptions
  ): Promise<ProcessedEvent[]> {
    if (this.config.enableLogging) {
      console.log(`[EventProcessor] Batch processing ${events.length} events`);
    }

    const batchSize = Math.min(events.length, this.config.maxBatchSize);
    const results: ProcessedEvent[] = [];

    // Process in chunks
    for (let i = 0; i < events.length; i += batchSize) {
      const chunk = events.slice(i, i + batchSize);
      const chunkResults = await Promise.all(
        chunk.map(event => this.process(event, handler, options))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Get all processed events
   */
  getProcessed(limit?: number): ProcessedEvent[] {
    if (limit) {
      return this.processedEvents.slice(-limit);
    }
    return [...this.processedEvents];
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    averageDuration: number;
    pendingCount: number;
  } {
    const totalProcessed = this.successCount + this.failureCount;
    const averageDuration = totalProcessed > 0 
      ? this.totalProcessingTime / totalProcessed 
      : 0;

    return {
      totalProcessed,
      successCount: this.successCount,
      failureCount: this.failureCount,
      averageDuration,
      pendingCount: this.pendingQueue.length,
    };
  }

  /**
   * Add event to pending queue
   */
  enqueue<T>(event: Event<T>): void {
    if (this.pendingQueue.length >= this.config.maxBatchSize * 2) {
      this.pendingQueue.shift();
    }
    this.pendingQueue.push(event);
  }

  /**
   * Get next pending event
   */
  dequeue(): Event | undefined {
    return this.pendingQueue.shift();
  }

  /**
   * Push a processed event to history
   */
  private pushProcessed(processed: ProcessedEvent): void {
    this.processedEvents.push(processed);
    
    // Limit history size
    const maxHistory = this.config.maxBatchSize * 10;
    if (this.processedEvents.length > maxHistory) {
      this.processedEvents.shift();
    }
  }

  /**
   * Get current snapshot of processor state
   */
  getSnapshot(): { metrics: Record<string, number | string | boolean> } {
    const stats = this.getStats();
    return {
      metrics: {
        totalProcessed: stats.totalProcessed,
        successCount: stats.successCount,
        failureCount: stats.failureCount,
        averageDuration: Math.round(stats.averageDuration * 100) / 100,
        pendingCount: stats.pendingCount,
        maxBatchSize: this.config.maxBatchSize,
        enableRetry: this.config.enableRetry,
      },
    };
  }

  /**
   * Reset all processing data and metrics
   */
  reset(): void {
    this.processedEvents = [];
    this.pendingQueue = [];
    this.successCount = 0;
    this.failureCount = 0;
    this.totalProcessingTime = 0;
    
    if (this.config.enableLogging) {
      console.log('[EventProcessor] Reset performed');
    }
  }

  /**
   * Get a human-readable report of the processor state
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      '=== EventProcessor Report ===',
      `Total Processed: ${stats.totalProcessed}`,
      `Successful: ${stats.successCount}`,
      `Failed: ${stats.failureCount}`,
      `Average Duration: ${Math.round(stats.averageDuration)}ms`,
      `Pending: ${stats.pendingCount}`,
      `Max Batch Size: ${this.config.maxBatchSize}`,
      `Retry: ${this.config.enableRetry ? 'Enabled' : 'Disabled'}`,
      '=============================',
    ].join('\n');
  }

  /**
   * Export metrics in a portable format
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    const stats = this.getStats();
    return {
      version: 'V74',
      metrics: {
        totalProcessed: stats.totalProcessed,
        successCount: stats.successCount,
        failureCount: stats.failureCount,
        averageDuration: stats.averageDuration,
        pendingCount: stats.pendingCount,
        config: { ...this.config },
      },
    };
  }
}
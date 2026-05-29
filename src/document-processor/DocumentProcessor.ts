export interface DocumentProcessorConfig {
  maxDocuments?: number;
  timeout?: number;
  enableValidation?: boolean;
  parallelProcessing?: boolean;
}

export interface ProcessedDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  processedAt: Date;
}

export interface QueueItem {
  id: string;
  priority: number;
  document: unknown;
  enqueuedAt: Date;
}

export class DocumentProcessor {
  public config: DocumentProcessorConfig;
  private processed: Map<string, ProcessedDocument> = new Map();
  private queue: QueueItem[] = [];
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    currentlyProcessing: 0,
    avgProcessingTime: 0,
  };
  private processingTimes: number[] = [];

  constructor(config: DocumentProcessorConfig = {}) {
    this.config = {
      maxDocuments: config.maxDocuments ?? 1000,
      timeout: config.timeout ?? 30000,
      enableValidation: config.enableValidation ?? true,
      parallelProcessing: config.parallelProcessing ?? true,
    };
  }

  async process(document: unknown, id?: string): Promise<ProcessedDocument> {
    const docId = id ?? `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.stats.currentlyProcessing++;

    const startTime = Date.now();
    try {
      await this.simulateProcessing(document);

      const processed: ProcessedDocument = {
        id: docId,
        content: JSON.stringify(document),
        metadata: {
          processedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          config: this.config,
        },
        processedAt: new Date(),
      };

      this.processed.set(docId, processed);
      this.stats.totalProcessed++;
      this.updateAvgProcessingTime(Date.now() - startTime);
      return processed;
    } catch (error) {
      this.stats.totalFailed++;
      throw new Error(`Failed to process document: ${error}`);
    } finally {
      this.stats.currentlyProcessing--;
    }
  }

  private async simulateProcessing(_document: unknown): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  getProcessed(): ProcessedDocument[] {
    return Array.from(this.processed.values());
  }

  getProcessedById(id: string): ProcessedDocument | undefined {
    return this.processed.get(id);
  }

  getStats(): {
    totalProcessed: number;
    totalFailed: number;
    currentlyProcessing: number;
    avgProcessingTime: number;
    queueSize: number;
  } {
    return {
      ...this.stats,
      avgProcessingTime: this.stats.avgProcessingTime,
      queueSize: this.queue.length,
    };
  }

  getQueue(): QueueItem[] {
    return [...this.queue].sort((a, b) => b.priority - a.priority);
  }

  addToQueue(document: unknown, priority = 0): string {
    const item: QueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      priority,
      document,
      enqueuedAt: new Date(),
    };
    this.queue.push(item);
    return item.id;
  }

  removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  clearQueue(): void {
    this.queue = [];
  }

  private updateAvgProcessingTime(time: number): void {
    this.processingTimes.push(time);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift();
    }
    const sum = this.processingTimes.reduce((acc, t) => acc + t, 0);
    this.stats.avgProcessingTime = sum / this.processingTimes.length;
  }

  getSnapshot(): { metrics: Record<string, number> } {
    return {
      metrics: {
        totalProcessed: this.stats.totalProcessed,
        totalFailed: this.stats.totalFailed,
        currentlyProcessing: this.stats.currentlyProcessing,
        avgProcessingTime: Math.round(this.stats.avgProcessingTime),
        queueSize: this.queue.length,
        processedCount: this.processed.size,
      },
    };
  }

  reset(): void {
    this.processed.clear();
    this.queue = [];
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      currentlyProcessing: 0,
      avgProcessingTime: 0,
    };
    this.processingTimes = [];
  }

  getReport(): string {
    return `DocumentProcessor Report: processed=${this.stats.totalProcessed}, failed=${this.stats.totalFailed}, ` +
      `processing=${this.stats.currentlyProcessing}, queue=${this.queue.length}, ` +
      `avgTime=${Math.round(this.stats.avgProcessingTime)}ms`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}
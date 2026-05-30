/**
 * Splitter.ts - V114 Splitter Core
 * Handles document splitting operations with configurable rules
 */

export type SplitterConfig = {
  maxChunkSize: number;
  overlap: number;
  delimiter: string;
  enableMetadata: boolean;
};

export interface SplitResult {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, unknown>;
}

export interface SplitterStats {
  totalSplits: number;
  totalChunks: number;
  averageChunkSize: number;
  processingTimeMs: number;
}

export class Splitter {
  public config: SplitterConfig;
  private results: SplitResult[] = [];
  private stats: SplitterStats;
  private idCounter = 0;

  constructor(config: Partial<SplitterConfig> = {}) {
    this.config = {
      maxChunkSize: config.maxChunkSize ?? 1000,
      overlap: config.overlap ?? 0,
      delimiter: config.delimiter ?? '\n',
      enableMetadata: config.enableMetadata ?? true,
    };
    this.stats = {
      totalSplits: 0,
      totalChunks: 0,
      averageChunkSize: 0,
      processingTimeMs: 0,
    };
  }

  split(content: string, options?: { id?: string }): SplitResult[] {
    const startTime = Date.now();
    const chunks: SplitResult[] = [];
    const delimiter = this.config.delimiter;
    const maxSize = this.config.maxChunkSize;
    const overlap = this.config.overlap;

    const parts = content.split(delimiter);
    let currentIndex = 0;
    let chunkContent = '';
    let startOffset = 0;

    for (const part of parts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;

      if (chunkContent.length + trimmedPart.length + 1 <= maxSize) {
        chunkContent += (chunkContent ? delimiter : '') + trimmedPart;
      } else {
        if (chunkContent) {
          chunks.push({
            id: `${options?.id ?? 'split'}-${++this.idCounter}`,
            content: chunkContent,
            startIndex: startOffset,
            endIndex: startOffset + chunkContent.length,
            metadata: this.config.enableMetadata ? {
              size: chunkContent.length,
              parts: chunkContent.split(delimiter).length,
            } : undefined,
          });
          startOffset += chunkContent.length - (overlap > 0 ? overlap : 0);
          if (startOffset < 0) startOffset = 0;
        }
        chunkContent = trimmedPart;
      }
    }

    if (chunkContent) {
      chunks.push({
        id: `${options?.id ?? 'split'}-${++this.idCounter}`,
        content: chunkContent,
        startIndex: startOffset,
        endIndex: startOffset + chunkContent.length,
        metadata: this.config.enableMetadata ? {
          size: chunkContent.length,
          parts: chunkContent.split(delimiter).length,
        } : undefined,
      });
    }

    this.results = chunks;
    this.stats.totalSplits++;
    this.stats.totalChunks += chunks.length;
    this.stats.processingTimeMs += Date.now() - startTime;
    this.stats.averageChunkSize = chunks.length > 0
      ? chunks.reduce((sum, r) => sum + r.content.length, 0) / chunks.length
      : 0;

    return chunks;
  }

  add(result: SplitResult): void {
    this.results.push(result);
    this.stats.totalChunks++;
  }

  remove(id: string): boolean {
    const index = this.results.findIndex(r => r.id === id);
    if (index !== -1) {
      this.results.splice(index, 1);
      this.stats.totalChunks--;
      return true;
    }
    return false;
  }

  getResult(id: string): SplitResult | undefined {
    return this.results.find(r => r.id === id);
  }

  getStats(): SplitterStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: SplitterStats; results: SplitResult[] } {
    return {
      metrics: this.getStats(),
      results: [...this.results],
    };
  }

  reset(): void {
    this.results = [];
    this.stats = {
      totalSplits: 0,
      totalChunks: 0,
      averageChunkSize: 0,
      processingTimeMs: 0,
    };
    this.idCounter = 0;
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== Splitter Report ===',
      `Total Splits: ${snap.metrics.totalSplits}`,
      `Total Chunks: ${snap.metrics.totalChunks}`,
      `Avg Chunk Size: ${snap.metrics.averageChunkSize.toFixed(2)}`,
      `Processing Time: ${snap.metrics.processingTimeMs}ms`,
      `Results Count: ${snap.results.length}`,
      '======================',
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: SplitterStats } {
    return {
      version: '1.14.0',
      stats: this.getStats(),
    };
  }
}
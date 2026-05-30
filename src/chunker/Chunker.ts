/**
 * V126 Chunker - Core chunking unit for document processing
 * Handles chunk creation, item management, and statistics tracking
 */

export interface ChunkerConfig {
  name: string;
  maxChunkSize: number;
  overlapSize: number;
  strategy: 'fixed' | 'dynamic' | 'sliding';
  onChunk?: (chunk: unknown[], index: number) => void;
}

export interface ChunkerStats {
  totalChunks: number;
  totalItems: number;
  currentChunkSize: number;
  lastChunkTime: number | null;
}

export interface Chunk<T = unknown> {
  id: string;
  index: number;
  items: T[];
  size: number;
}

export class Chunker<T = unknown> {
  public config: ChunkerConfig;
  private items: T[] = [];
  private chunks: Chunk<T>[] = [];
  private stats: ChunkerStats = {
    totalChunks: 0,
    totalItems: 0,
    currentChunkSize: 0,
    lastChunkTime: null,
  };

  constructor(config: ChunkerConfig) {
    this.config = { ...config };
  }

  /**
   * Add single item to current chunk
   */
  add(item: T): string {
    this.items.push(item);
    this.stats.totalItems++;
    this.stats.currentChunkSize = this.items.length;

    const chunkId = this.generateChunkId();

    if (this.items.length >= this.config.maxChunkSize) {
      this.createChunk();
    }

    return chunkId;
  }

  /**
   * Add multiple items as a chunk
   */
  chunk(items: T[]): Chunk<T> | null {
    if (items.length === 0) {
      return null;
    }

    const chunkIndex = this.chunks.length;
    const chunk: Chunk<T> = {
      id: this.generateChunkId(),
      index: chunkIndex,
      items: [...items],
      size: items.length,
    };

    this.chunks.push(chunk);
    this.stats.totalChunks++;
    this.stats.totalItems += items.length;
    this.stats.lastChunkTime = Date.now();
    this.stats.currentChunkSize = 0;

    if (this.config.onChunk) {
      this.config.onChunk(items, chunkIndex);
    }

    return chunk;
  }

  /**
   * Remove item by index
   */
  remove(index: number): boolean {
    if (index < 0 || index >= this.items.length) {
      return false;
    }
    this.items.splice(index, 1);
    this.stats.currentChunkSize = this.items.length;
    return true;
  }

  /**
   * Get chunk by index
   */
  getChunk(index: number): Chunk<T> | undefined {
    return this.chunks[index];
  }

  /**
   * Get all chunks
   */
  getAllChunks(): Chunk<T>[] {
    return [...this.chunks];
  }

  /**
   * Get current statistics
   */
  getStats(): ChunkerStats {
    return { ...this.stats };
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: ChunkerStats; config: ChunkerConfig; itemCount: number; chunkCount: number } {
    return {
      metrics: this.getStats(),
      config: { ...this.config },
      itemCount: this.items.length,
      chunkCount: this.chunks.length,
    };
  }

  /**
   * Reset chunker to initial state
   */
  reset(): void {
    this.items = [];
    this.chunks = [];
    this.stats = {
      totalChunks: 0,
      totalItems: 0,
      currentChunkSize: 0,
      lastChunkTime: null,
    };
  }

  /**
   * Generate text report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    return [
      `Chunker Report: ${this.config.name}`,
      `  Items pending: ${snap.itemCount}`,
      `  Total chunks: ${snap.chunkCount}`,
      `  Total items processed: ${snap.metrics.totalItems}`,
      `  Last chunk time: ${snap.metrics.lastChunkTime ? new Date(snap.metrics.lastChunkTime).toISOString() : 'Never'}`,
      `  Max chunk size: ${this.config.maxChunkSize}`,
      `  Overlap size: ${this.config.overlapSize}`,
      `  Strategy: ${this.config.strategy}`,
    ].join('\n');
  }

  /**
   * Export metrics object
   */
  exportMetrics(): { version: string; name: string; stats: ChunkerStats } {
    return {
      version: '1.26.0',
      name: this.config.name,
      stats: this.getStats(),
    };
  }

  private createChunk(): void {
    if (this.items.length === 0) {
      return;
    }

    const chunkIndex = this.chunks.length;
    const chunk: Chunk<T> = {
      id: this.generateChunkId(),
      index: chunkIndex,
      items: [...this.items],
      size: this.items.length,
    };

    this.chunks.push(chunk);
    this.stats.totalChunks++;
    this.stats.lastChunkTime = Date.now();
    this.stats.currentChunkSize = 0;
    this.items = [];

    if (this.config.onChunk) {
      this.config.onChunk(chunk.items, chunkIndex);
    }
  }

  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
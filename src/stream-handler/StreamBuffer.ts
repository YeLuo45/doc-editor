export interface StreamBufferConfig {
  maxSize?: number;
  highWaterMark?: number;
  flushInterval?: number;
  autoFlush?: boolean;
}

export interface BufferedChunk<T = unknown> {
  id: string;
  data: T;
  size: number;
  timestamp: number;
  flushed: boolean;
}

export class StreamBuffer<T = unknown> {
  private buffer: BufferedChunk<T>[] = [];
  private flushCounter = 0;
  public config: StreamBufferConfig;

  constructor(config: StreamBufferConfig = {}) {
    this.config = config;
  }

  write(data: T, id?: string): boolean {
    const chunkId = id || `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const chunkSize = this.estimateSize(data);

    if (this.config.maxSize && this.getBufferedSize() + chunkSize > this.config.maxSize) {
      return false;
    }

    const chunk: BufferedChunk<T> = {
      id: chunkId,
      data,
      size: chunkSize,
      timestamp: Date.now(),
      flushed: false,
    };

    this.buffer.push(chunk);
    return true;
  }

  read(id: string): BufferedChunk<T> | undefined {
    const chunk = this.buffer.find(c => c.id === id);
    return chunk ? { ...chunk } : undefined;
  }

  readAll(): BufferedChunk<T>[] {
    return this.buffer.filter(c => !c.flushed).map(c => ({ ...c }));
  }

  flush(): BufferedChunk<T>[] {
    const unflushed = this.buffer.filter(c => !c.flushed);
    unflushed.forEach(c => (c.flushed = true));
    this.flushCounter++;
    return unflushed.map(c => ({ ...c }));
  }

  getBuffered(): BufferedChunk<T>[] {
    return this.buffer.filter(c => !c.flushed).map(c => ({ ...c }));
  }

  getBufferedSize(): number {
    return this.buffer
      .filter(c => !c.flushed)
      .reduce((sum, c) => sum + c.size, 0);
  }

  clear(): void {
    this.buffer = [];
  }

  markFlushed(ids: string[]): void {
    const idSet = new Set(ids);
    this.buffer.forEach(c => {
      if (idSet.has(c.id)) {
        c.flushed = true;
      }
    });
  }

  remove(id: string): boolean {
    const index = this.buffer.findIndex(c => c.id === id);
    if (index !== -1) {
      this.buffer.splice(index, 1);
      return true;
    }
    return false;
  }

  private estimateSize(data: T): number {
    if (typeof data === 'string') {
      return data.length;
    }
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1;
    }
  }

  getSnapshot(): { metrics: { bufferedCount: number; bufferedSize: number; flushedCount: number } } {
    return {
      metrics: {
        bufferedCount: this.buffer.filter(c => !c.flushed).length,
        bufferedSize: this.getBufferedSize(),
        flushedCount: this.flushCounter,
      },
    };
  }

  reset(): void {
    this.buffer = [];
    this.flushCounter = 0;
  }

  getReport(): string {
    const buffered = this.getBuffered();
    return `StreamBuffer Report: buffered=${buffered.length}, size=${this.getBufferedSize()}, flushCount=${this.flushCounter}`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}
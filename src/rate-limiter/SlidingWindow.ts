export interface SlidingWindowConfig {
  limit: number;
  windowSize: number;
}

interface WindowEntry {
  timestamp: number;
  weight: number;
}

export class SlidingWindow {
  readonly config: SlidingWindowConfig;
  private windows: Map<string, WindowEntry[]> = new Map();
  private totalAdded = 0;
  private totalRejected = 0;

  constructor(config: SlidingWindowConfig) {
    this.config = config;
  }

  add(identifier: string, weight = 1): boolean {
    const now = Date.now();
    const entries = this.windows.get(identifier) || [];
    const windowStart = now - this.config.windowSize;

    const validEntries = entries.filter(e => e.timestamp > windowStart);
    const currentCount = validEntries.reduce((sum, e) => sum + e.weight, 0);

    if (currentCount + weight > this.config.limit) {
      this.totalRejected++;
      return false;
    }

    validEntries.push({ timestamp: now, weight });
    this.windows.set(identifier, validEntries);
    this.totalAdded += weight;
    return true;
  }

  getCount(identifier: string): number {
    const now = Date.now();
    const entries = this.windows.get(identifier) || [];
    const windowStart = now - this.config.windowSize;

    return entries
      .filter(e => e.timestamp > windowStart)
      .reduce((sum, e) => sum + e.weight, 0);
  }

  getWindow(identifier: string): { start: number; end: number; entries: number } {
    const now = Date.now();
    const entries = this.windows.get(identifier) || [];
    const windowStart = now - this.config.windowSize;

    const validEntries = entries.filter(e => e.timestamp > windowStart);

    return {
      start: windowStart,
      end: now,
      entries: validEntries.length,
    };
  }

  getLimit(): number {
    return this.config.limit;
  }

  getStatus(): { healthy: boolean; message: string } {
    const identifiers = [...this.windows.keys()];
    let activeInWindow = 0;

    identifiers.forEach(id => {
      activeInWindow += this.getCount(id);
    });

    return {
      healthy: true,
      message: `${identifiers.length} windows, ${activeInWindow} entries in current window`,
    };
  }

  getStats() {
    const now = Date.now();
    const windowStart = now - this.config.windowSize;
    let activeInWindow = 0;

    this.windows.forEach(entries => {
      activeInWindow += entries.filter(e => e.timestamp > windowStart).reduce((sum, e) => sum + e.weight, 0);
    });

    return {
      totalWindows: this.windows.size,
      totalAdded: this.totalAdded,
      totalRejected: this.totalRejected,
      activeInWindow,
      limit: this.config.limit,
      windowSize: this.config.windowSize,
    };
  }

  getSnapshot() {
    return {
      metrics: this.getStats(),
      windows: [...this.windows.entries()].map(([id, entries]) => ({
        id,
        entryCount: entries.length,
      })),
    };
  }

  reset(): void {
    this.windows.clear();
    this.totalAdded = 0;
    this.totalRejected = 0;
  }

  getReport(): string {
    const stats = this.getStats();
    return `SlidingWindow Report: ${stats.totalWindows} windows, ${stats.totalAdded} added, ${stats.totalRejected} rejected`;
  }

  exportMetrics() {
    return {
      version: '1.0.0',
      ...this.getStats(),
    };
  }
}
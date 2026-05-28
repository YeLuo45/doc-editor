/**
 * MemoryMonitor.ts - Memory usage tracking and leak detection for doc-editor V22
 */

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit?: number;
  external?: number;
  rss?: number;
}

export interface MemoryLeakResult {
  isLeaking: boolean;
  confidence: 'low' | 'medium' | 'high';
  details: string;
  growthRate: number;
}

export interface MemoryStats {
  current: MemorySnapshot;
  snapshots: MemorySnapshot[];
  averageHeapUsed: number;
  peakHeapUsed: number;
  growthTrend: number[];
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private threshold: number;
  private windowSize: number;
  private lastGcTime?: number;

  constructor(threshold: number = 50 * 1024 * 1024, windowSize: number = 10) {
    this.threshold = threshold;
    this.windowSize = windowSize;
  }

  getHeapUsage(): MemorySnapshot {
    const memory = this.getMemoryInfo();
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
    };

    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      snapshot.rss = mem.rss;
      snapshot.heapLimit = mem.heapTotal;
    }

    this.snapshots.push(snapshot);
    return snapshot;
  }

  getSnapshot(): MemoryStats {
    if (this.snapshots.length === 0) {
      this.getHeapUsage();
    }

    const heapValues = this.snapshots.map(s => s.heapUsed);
    const avg = heapValues.reduce((a, b) => a + b, 0) / heapValues.length;
    const peak = Math.max(...heapValues);
    const trend = this.calculateTrend();

    return {
      current: this.snapshots[this.snapshots.length - 1],
      snapshots: [...this.snapshots],
      averageHeapUsed: avg,
      peakHeapUsed: peak,
      growthTrend: trend,
    };
  }

  checkMemoryLeak(): MemoryLeakResult {
    if (this.snapshots.length < 3) {
      return {
        isLeaking: false,
        confidence: 'low',
        details: 'Insufficient data for leak detection',
        growthRate: 0,
      };
    }

    const recent = this.snapshots.slice(-this.windowSize);
    if (recent.length < 3) {
      return {
        isLeaking: false,
        confidence: 'low',
        details: 'Window too small for analysis',
        growthRate: 0,
      };
    }

    const growthRate = this.calculateGrowthRate(recent);
    const isLeaking = growthRate > this.threshold;
    const confidence = this.getLeakConfidence(recent);

    return {
      isLeaking,
      confidence,
      details: isLeaking
        ? `Memory growing at ${this.formatBytes(growthRate)}/sample`
        : 'Memory stable',
      growthRate,
    };
  }

  getReport(): {
    current: MemorySnapshot;
    stats: MemoryStats;
    leakAnalysis: MemoryLeakResult;
  } {
    return {
      current: this.snapshots[this.snapshots.length - 1] || this.getHeapUsage(),
      stats: this.getSnapshot(),
      leakAnalysis: this.checkMemoryLeak(),
    };
  }

  reset(): void {
    this.snapshots = [];
    this.lastGcTime = undefined;
  }

  exportMetrics(): Record<string, unknown> {
    const stats = this.getSnapshot();
    const leak = this.checkMemoryLeak();
    return {
      timestamp: Date.now(),
      current: stats.current,
      averageHeapUsed: stats.averageHeapUsed,
      peakHeapUsed: stats.peakHeapUsed,
      snapshotCount: stats.snapshots.length,
      leakDetection: leak,
      snapshots: stats.snapshots.map(s => ({
        timestamp: s.timestamp,
        heapUsed: s.heapUsed,
        heapTotal: s.heapTotal,
      })),
    };
  }

  triggerGc(): void {
    if (typeof global !== 'undefined' && 'gc' in global) {
      (global as unknown as { gc: () => void }).gc();
      this.lastGcTime = Date.now();
    }
  }

  getLastGcTime(): number | undefined {
    return this.lastGcTime;
  }

  private getMemoryInfo(): { heapUsed: number; heapTotal: number; external: number } {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      return {
        heapUsed: mem.usedJSHeapSize,
        heapTotal: mem.totalJSHeapSize,
        external: mem.jsHeapSizeLimit,
      };
    }
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
      };
    }
    return { heapUsed: 0, heapTotal: 0, external: 0 };
  }

  private calculateTrend(): number[] {
    if (this.snapshots.length < 2) return [];

    const trends: number[] = [];
    for (let i = 1; i < this.snapshots.length; i++) {
      trends.push(this.snapshots[i].heapUsed - this.snapshots[i - 1].heapUsed);
    }
    return trends;
  }

  private calculateGrowthRate(snapshots: MemorySnapshot[]): number {
    if (snapshots.length < 2) return 0;
    const first = snapshots[0].heapUsed;
    const last = snapshots[snapshots.length - 1].heapUsed;
    return (last - first) / snapshots.length;
  }

  private getLeakConfidence(snapshots: MemorySnapshot[]): 'low' | 'medium' | 'high' {
    const trend = this.calculateTrend();
    if (trend.length < 3) return 'low';

    const positiveTrend = trend.filter(v => v > 0).length;
    const ratio = positiveTrend / trend.length;

    if (ratio > 0.8) return 'high';
    if (ratio > 0.6) return 'medium';
    return 'low';
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

export const defaultMemoryMonitor = new MemoryMonitor();
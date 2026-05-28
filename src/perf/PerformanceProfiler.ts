/**
 * PerformanceProfiler.ts - Core profiler for doc-editor V22
 * Tracks render time, memory usage, and operation counts
 */

export interface ProfilerSnapshot {
  id: string;
  timestamp: number;
  renderTime: number;
  memoryUsed: number;
  operationCount: number;
  marks: Map<string, number>;
  duration?: number;
}

export interface ProfilerConfig {
  enableMemoryTracking: boolean;
  enableTimeTracking: boolean;
  maxMarks: number;
}

export class PerformanceProfiler {
  private startTime: number = 0;
  private endTime: number = 0;
  private isRunning: boolean = false;
  private marks: Map<string, number> = new Map();
  private snapshots: ProfilerSnapshot[] = [];
  private renderTime: number = 0;
  private memoryUsed: number = 0;
  private operationCount: number = 0;
  private config: ProfilerConfig;

  constructor(config: Partial<ProfilerConfig> = {}) {
    this.config = {
      enableMemoryTracking: config.enableMemoryTracking ?? true,
      enableTimeTracking: config.enableTimeTracking ?? true,
      maxMarks: config.maxMarks ?? 100,
    };
  }

  start(): void {
    if (this.isRunning) {
      console.warn('[PerformanceProfiler] Already running, call end() first');
      return;
    }
    this.isRunning = true;
    this.startTime = performance.now();
    this.marks.clear();
  }

  end(): number {
    if (!this.isRunning) {
      console.warn('[PerformanceProfiler] Not running, call start() first');
      return 0;
    }
    this.endTime = performance.now();
    this.isRunning = false;
    const duration = this.endTime - this.startTime;
    this.captureSnapshot(duration);
    return duration;
  }

  mark(name: string): void {
    if (!this.isRunning) {
      console.warn('[PerformanceProfiler] Mark called without active session');
      return;
    }
    if (this.marks.size >= this.config.maxMarks) {
      console.warn('[PerformanceProfiler] Max marks reached');
      return;
    }
    this.marks.set(name, performance.now());
  }

  snapshot(): ProfilerSnapshot {
    const snapshot = this.createSnapshot();
    this.snapshots.push(snapshot);
    return snapshot;
  }

  getSnapshot(): ProfilerSnapshot {
    return this.createSnapshot();
  }

  reset(): void {
    this.startTime = 0;
    this.endTime = 0;
    this.isRunning = false;
    this.marks.clear();
    this.snapshots = [];
    this.renderTime = 0;
    this.memoryUsed = 0;
    this.operationCount = 0;
  }

  getReport(): {
    totalDuration: number;
    averageRenderTime: number;
    totalMemoryUsed: number;
    totalOperations: number;
    snapshotCount: number;
    markCount: number;
  } {
    const totalDuration = this.endTime - this.startTime;
    const avgRenderTime = this.snapshots.length > 0
      ? this.snapshots.reduce((sum, s) => sum + s.renderTime, 0) / this.snapshots.length
      : 0;
    const totalMemory = this.snapshots.reduce((sum, s) => sum + s.memoryUsed, 0);

    return {
      totalDuration,
      averageRenderTime: avgRenderTime,
      totalMemoryUsed: totalMemory,
      totalOperations: this.operationCount,
      snapshotCount: this.snapshots.length,
      markCount: this.marks.size,
    };
  }

  exportMetrics(): Record<string, unknown> {
    const snapshot = this.createSnapshot();
    return {
      timestamp: snapshot.timestamp,
      renderTime: snapshot.renderTime,
      memoryUsed: snapshot.memoryUsed,
      operationCount: snapshot.operationCount,
      marks: Object.fromEntries(this.marks),
      snapshots: this.snapshots.map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        renderTime: s.renderTime,
        memoryUsed: s.memoryUsed,
        operationCount: s.operationCount,
      })),
    };
  }

  trackRenderTime(time: number): void {
    this.renderTime += time;
  }

  trackOperation(): void {
    this.operationCount++;
  }

  getMarks(): Map<string, number> {
    return new Map(this.marks);
  }

  getSnapshots(): ProfilerSnapshot[] {
    return [...this.snapshots];
  }

  private createSnapshot(): ProfilerSnapshot {
    return {
      id: `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      renderTime: this.renderTime,
      memoryUsed: this.getMemoryUsage(),
      operationCount: this.operationCount,
      marks: new Map(this.marks),
    };
  }

  private captureSnapshot(duration: number): void {
    const snapshot = this.createSnapshot();
    snapshot.duration = duration;
    this.snapshots.push(snapshot);
  }

  private getMemoryUsage(): number {
    if (!this.config.enableMemoryTracking) return 0;
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
      return mem.usedJSHeapSize;
    }
    return this.memoryUsed;
  }
}

export const defaultProfiler = new PerformanceProfiler();
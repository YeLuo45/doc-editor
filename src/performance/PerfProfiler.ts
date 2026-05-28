/**
 * PerfProfiler - Performance Profiler
 * Measures execution time, memory usage, and call counts for modules.
 * Uses browser Performance API and localStorage persistence.
 */

export interface ProfilerMetric {
  moduleName: string;
  executionTime: number;
  memoryUsage: number;
  callCount: number;
  timestamp: number;
}

export interface ProfilerRecord {
  totalTime: number;
  totalMemory: number;
  callCount: number;
  avgTime: number;
  maxMemory: number;
  minMemory: number;
  samples: number;
}

export interface ProfilerSummary {
  moduleName: string;
  totalTime: number;
  totalMemory: number;
  callCount: number;
  avgTime: number;
  maxMemory: number;
  minMemory: number;
  samples: number;
}

const STORAGE_KEY_PREFIX = 'doc-editor-perf-';

export class PerfProfiler {
  private metrics: Map<string, ProfilerRecord> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private storageKey: string;

  constructor(storageKey: string = 'profiler') {
    this.storageKey = `${STORAGE_KEY_PREFIX}${storageKey}`;
    this.loadFromStorage();
  }

  /**
   * Start timing a module operation
   */
  startTimer(moduleName: string): void {
    this.activeTimers.set(moduleName, performance.now());
  }

  /**
   * End timing and record the metric
   */
  endTimer(moduleName: string): number {
    const startTime = this.activeTimers.get(moduleName);
    if (startTime === undefined) {
      return 0;
    }
    const elapsed = performance.now() - startTime;
    this.activeTimers.delete(moduleName);
    this.recordMetric(moduleName, elapsed);
    return elapsed;
  }

  /**
   * Record a metric for a module
   */
  recordMetric(moduleName: string, executionTime: number, memoryUsage?: number): void {
    const memory = memoryUsage ?? this.getMemoryUsage();
    let record = this.metrics.get(moduleName);

    if (!record) {
      record = {
        totalTime: 0,
        totalMemory: 0,
        callCount: 0,
        avgTime: 0,
        maxMemory: memory,
        minMemory: memory,
        samples: 0,
      };
      this.metrics.set(moduleName, record);
    }

    record.totalTime += executionTime;
    record.totalMemory += memory;
    record.callCount += 1;
    record.samples += 1;
    record.avgTime = record.totalTime / record.callCount;

    if (memory > record.maxMemory) {
      record.maxMemory = memory;
    }
    if (memory < record.minMemory) {
      record.minMemory = memory;
    }

    this.saveToStorage();
  }

  /**
   * Get current memory usage in bytes
   */
  getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
      return memInfo.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get summary for a specific module
   */
  getModuleSummary(moduleName: string): ProfilerSummary | null {
    const record = this.metrics.get(moduleName);
    if (!record) {
      return null;
    }
    return {
      moduleName,
      totalTime: record.totalTime,
      totalMemory: record.totalMemory,
      callCount: record.callCount,
      avgTime: record.avgTime,
      maxMemory: record.maxMemory,
      minMemory: record.minMemory,
      samples: record.samples,
    };
  }

  /**
   * Get summaries for all modules
   */
  getAllSummaries(): ProfilerSummary[] {
    const summaries: ProfilerSummary[] = [];
    this.metrics.forEach((record, moduleName) => {
      summaries.push({
        moduleName,
        totalTime: record.totalTime,
        totalMemory: record.totalMemory,
        callCount: record.callCount,
        avgTime: record.avgTime,
        maxMemory: record.maxMemory,
        minMemory: record.minMemory,
        samples: record.samples,
      });
    });
    return summaries;
  }

  /**
   * Get raw metrics map
   */
  getMetrics(): Map<string, ProfilerRecord> {
    return new Map(this.metrics);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.activeTimers.clear();
    this.clearStorage();
  }

  /**
   * Reset metrics for a specific module
   */
  resetModule(moduleName: string): void {
    this.metrics.delete(moduleName);
    this.activeTimers.delete(moduleName);
    this.saveToStorage();
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.clearMetrics();
  }

  /**
   * Save metrics to localStorage
   */
  private saveToStorage(): void {
    try {
      const data: Record<string, ProfilerRecord> = {};
      this.metrics.forEach((record, moduleName) => {
        data[moduleName] = record;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // localStorage may be unavailable or full
    }
  }

  /**
   * Load metrics from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data: Record<string, ProfilerRecord> = JSON.parse(stored);
        Object.entries(data).forEach(([moduleName, record]) => {
          this.metrics.set(moduleName, record);
        });
      }
    } catch {
      // localStorage may be unavailable or corrupted
    }
  }

  /**
   * Clear metrics from localStorage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore errors
    }
  }
}

export const defaultProfiler = new PerfProfiler();
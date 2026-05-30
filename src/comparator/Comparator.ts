/**
 * Comparator.ts - V135 Comparator
 * Core comparator for comparing document entities
 */

export type ComparatorConfig = {
  strictMode: boolean;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  maxDepth: number;
  tolerance?: number;
};

export type ComparatorResult = {
  equal: boolean;
  differences: Array<{ path: string; left: unknown; right: unknown }>;
  timestamp: number;
  duration: number;
};

export type ComparatorStats = {
  totalComparisons: number;
  successfulComparisons: number;
  failedComparisons: number;
  totalTime: number;
  averageTime: number;
};

export class Comparator {
  config: ComparatorConfig;
  private totalComparisons: number = 0;
  private successfulComparisons: number = 0;
  private failedComparisons: number = 0;
  private totalTime: number = 0;

  constructor(config: ComparatorConfig) {
    this.config = { ...config };
  }

  compare(left: unknown, right: unknown, path: string = 'root'): ComparatorResult {
    const startTime = Date.now();
    this.totalComparisons++;
    const differences: Array<{ path: string; left: unknown; right: unknown }> = [];
    const equal = this.compareValues(left, right, path, differences);
    if (equal) this.successfulComparisons++;
    else this.failedComparisons++;
    const duration = Date.now() - startTime;
    this.totalTime += duration;
    return { equal, differences, timestamp: Date.now(), duration };
  }

  private compareValues(left: unknown, right: unknown, path: string, differences: Array<{ path: string; left: unknown; right: unknown }>): boolean {
    if (left === right) return true;
    if (left === null || right === null) return left === right;
    if (typeof left !== typeof right) { differences.push({ path, left, right }); return false; }
    if (Array.isArray(left) && Array.isArray(right)) return this.compareArrays(left, right, path, differences);
    if (typeof left === 'object' && typeof right === 'object') return this.compareObjects(left as Record<string, unknown>, right as Record<string, unknown>, path, differences);
    if (this.config.ignoreCase && typeof left === 'string' && typeof right === 'string') return left.toLowerCase() === right.toLowerCase();
    if (this.config.tolerance !== undefined && typeof left === 'number' && typeof right === 'number') return Math.abs(left - right) <= this.config.tolerance;
    differences.push({ path, left, right });
    return false;
  }

  private compareArrays(left: unknown[], right: unknown[], path: string, differences: Array<{ path: string; left: unknown; right: unknown }>): boolean {
    if (left.length !== right.length) { differences.push({ path: `${path}.length`, left: left.length, right: right.length }); return false; }
    for (let i = 0; i < left.length; i++) if (!this.compareValues(left[i], right[i], `${path}[${i}]`, differences)) return false;
    return true;
  }

  private compareObjects(left: Record<string, unknown>, right: Record<string, unknown>, path: string, differences: Array<{ path: string; left: unknown; right: unknown }>): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) { differences.push({ path: `${path}.keys`, left: leftKeys, right: rightKeys }); return false; }
    for (const key of leftKeys) {
      if (!right.hasOwnProperty(key)) { differences.push({ path: `${path}.${key}`, left: left[key], right: undefined }); return false; }
      if (!this.compareValues(left[key], right[key], `${path}.${key}`, differences)) return false;
    }
    return true;
  }

  getComparator(): Comparator { return this; }

  getStats(): ComparatorStats {
    return {
      totalComparisons: this.totalComparisons,
      successfulComparisons: this.successfulComparisons,
      failedComparisons: this.failedComparisons,
      totalTime: this.totalTime,
      averageTime: this.totalComparisons > 0 ? this.totalTime / this.totalComparisons : 0,
    };
  }

  getSnapshot(): { metrics: ComparatorStats; timestamp: number } {
    return { metrics: this.getStats(), timestamp: Date.now() };
  }

  reset(): void {
    this.totalComparisons = 0;
    this.successfulComparisons = 0;
    this.failedComparisons = 0;
    this.totalTime = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    return [`=== Comparator Report ===`, `Total: ${s.metrics.totalComparisons}`, `Success: ${s.metrics.successfulComparisons}`, `Failed: ${s.metrics.failedComparisons}`, `Avg: ${s.metrics.averageTime.toFixed(2)}ms`, `Time: ${new Date(s.timestamp).toISOString()}`].join('\n');
  }

  exportMetrics(): { version: string } & ComparatorStats {
    return { version: 'V135', ...this.getStats() };
  }
}
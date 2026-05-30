/**
 * Differentiator.ts - V136 Differentiator
 * Core differentiator for document differentiation
 */

export type DifferentiatorConfig = {
  strictMode: boolean;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  maxDepth: number;
  tolerance?: number;
};

export type DifferentiatorResult = {
  different: boolean;
  differences: Array<{ path: string; left: unknown; right: unknown }>;
  timestamp: number;
  duration: number;
};

export type DifferentiatorStats = {
  totalDifferentiation: number;
  successfulDifferentiation: number;
  failedDifferentiation: number;
  totalTime: number;
  averageTime: number;
};

export class Differentiator {
  config: DifferentiatorConfig;
  private totalDifferentiation: number = 0;
  private successfulDifferentiation: number = 0;
  private failedDifferentiation: number = 0;
  private totalTime: number = 0;

  constructor(config: DifferentiatorConfig) {
    this.config = { ...config };
  }

  differentiate(left: unknown, right: unknown, path: string = 'root'): DifferentiatorResult {
    const startTime = Date.now();
    this.totalDifferentiation++;
    const differences: Array<{ path: string; left: unknown; right: unknown }> = [];
    const different = this.diffValues(left, right, path, differences);
    if (different) this.failedDifferentiation++;
    else this.successfulDifferentiation++;
    const duration = Date.now() - startTime;
    this.totalTime += duration;
    return { different, differences, timestamp: Date.now(), duration };
  }

  private diffValues(left: unknown, right: unknown, path: string, differences: Array<{ path: string; left: unknown; right: unknown }>): boolean {
    if (left === right) return false;
    if (left === null || right === null) return left !== right;
    if (typeof left !== typeof right) { differences.push({ path, left, right }); return true; }
    if (Array.isArray(left) && Array.isArray(right)) return this.diffArrays(left, right, path, differences);
    if (typeof left === 'object' && typeof right === 'object') return this.diffObjects(left as Record<string, unknown>, right as Record<string, unknown>, path, differences);
    if (this.config.ignoreCase && typeof left === 'string' && typeof right === 'string') return left.toLowerCase() !== right.toLowerCase();
    if (this.config.tolerance !== undefined && typeof left === 'number' && typeof right === 'number') return Math.abs(left - right) > this.config.tolerance;
    differences.push({ path, left, right });
    return true;
  }

  private diffArrays(left: unknown[], right: unknown[], path: string, differences: Array<{ path: string; left: unknown; right: unknown }>): boolean {
    if (left.length !== right.length) { differences.push({ path: `${path}.length`, left: left.length, right: right.length }); return true; }
    for (let i = 0; i < left.length; i++) if (this.diffValues(left[i], right[i], `${path}[${i}]`, differences)) return true;
    return false;
  }

  private diffObjects(left: Record<string, unknown>, right: Record<string, unknown>, path: string, differences: Array<{ path: string; left: unknown; right: unknown }>): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) { differences.push({ path: `${path}.keys`, left: leftKeys, right: rightKeys }); return true; }
    for (const key of leftKeys) {
      if (!right.hasOwnProperty(key)) { differences.push({ path: `${path}.${key}`, left: left[key], right: undefined }); return true; }
      if (this.diffValues(left[key], right[key], `${path}.${key}`, differences)) return true;
    }
    return false;
  }

  getDifferentiator(): Differentiator { return this; }

  getStats(): DifferentiatorStats {
    return {
      totalDifferentiation: this.totalDifferentiation,
      successfulDifferentiation: this.successfulDifferentiation,
      failedDifferentiation: this.failedDifferentiation,
      totalTime: this.totalTime,
      averageTime: this.totalDifferentiation > 0 ? this.totalTime / this.totalDifferentiation : 0,
    };
  }

  getSnapshot(): { metrics: DifferentiatorStats; timestamp: number } {
    return { metrics: this.getStats(), timestamp: Date.now() };
  }

  reset(): void {
    this.totalDifferentiation = 0;
    this.successfulDifferentiation = 0;
    this.failedDifferentiation = 0;
    this.totalTime = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    return [
      `=== Differentiator Report ===`,
      `Total: ${s.metrics.totalDifferentiation}`,
      `Success: ${s.metrics.successfulDifferentiation}`,
      `Failed: ${s.metrics.failedDifferentiation}`,
      `Avg: ${s.metrics.averageTime.toFixed(2)}ms`,
      `Time: ${new Date(s.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & DifferentiatorStats {
    return { version: 'V136', ...this.getStats() };
  }
}
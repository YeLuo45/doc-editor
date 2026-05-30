/**
 * V140 Interpolator Module
 * Provides interpolation capabilities for document editing operations
 */

export interface InterpolatorConfig {
  tolerance: number;
  maxIterations: number;
  enableAdaptive: boolean;
  smoothingFactor: number;
}

export interface InterpolatorMetrics {
  totalInterpolations: number;
  successfulInterpolations: number;
  failedInterpolations: number;
  averageDuration: number;
  lastInterpolationTime: number;
}

export type InterpolateFn<T> = (input: T, options?: Record<string, unknown>) => T;

export class Interpolator<T = unknown> {
  public config: InterpolatorConfig;
  private metrics: InterpolatorMetrics;
  private interpolationCache: Map<string, T>;
  private interpolationFn: InterpolateFn<T> | null = null;

  constructor(config: Partial<InterpolatorConfig> = {}) {
    this.config = {
      tolerance: 0.001,
      maxIterations: 100,
      enableAdaptive: true,
      smoothingFactor: 0.5,
      ...config,
    };
    this.metrics = {
      totalInterpolations: 0,
      successfulInterpolations: 0,
      failedInterpolations: 0,
      averageDuration: 0,
      lastInterpolationTime: 0,
    };
    this.interpolationCache = new Map();
  }

  /**
   * Interpolate a value from start to end based on progress (0-1)
   */
  interpolate(start: T, end: T, progress: number): T {
    const startTime = Date.now();
    this.metrics.totalInterpolations++;

    try {
      if (this.interpolationFn) {
        const result = this.interpolationFn({ start, end, progress }, { tolerance: this.config.tolerance });
        this.recordSuccess(Date.now() - startTime);
        return result;
      }

      // Default linear interpolation for primitive types
      if (this.isPrimitive(start) && this.isPrimitive(end)) {
        const result = this.linearInterpolate(
          start as unknown as number,
          end as unknown as number,
          progress
        ) as unknown as T;
        this.recordSuccess(Date.now() - startTime);
        return result;
      }

      // For complex types, return end value when progress >= 1
      const result = progress >= 1 ? end : start;
      this.recordSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordFailure(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Get the current interpolator function
   */
  getInterpolator(): InterpolateFn<T> | null {
    return this.interpolationFn;
  }

  /**
   * Set a custom interpolation function
   */
  setInterpolator(fn: InterpolateFn<T>): void {
    this.interpolationFn = fn;
  }

  /**
   * Get current interpolation statistics
   */
  getStats(): InterpolatorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: InterpolatorMetrics; cacheSize: number } {
    return {
      metrics: this.getStats(),
      cacheSize: this.interpolationCache.size,
    };
  }

  /**
   * Reset all metrics and cache
   */
  reset(): void {
    this.metrics = {
      totalInterpolations: 0,
      successfulInterpolations: 0,
      failedInterpolations: 0,
      averageDuration: 0,
      lastInterpolationTime: 0,
    };
    this.interpolationCache.clear();
  }

  /**
   * Generate a text report of current state
   */
  getReport(): string {
    const successRate = this.metrics.totalInterpolations > 0
      ? ((this.metrics.successfulInterpolations / this.metrics.totalInterpolations) * 100).toFixed(2)
      : '0.00';
    return `Interpolator Report:
  Total Interpolations: ${this.metrics.totalInterpolations}
  Successful: ${this.metrics.successfulInterpolations}
  Failed: ${this.metrics.failedInterpolations}
  Success Rate: ${successRate}%
  Average Duration: ${this.metrics.averageDuration.toFixed(3)}ms
  Last Duration: ${this.metrics.lastInterpolationTime.toFixed(3)}ms
  Cache Size: ${this.interpolationCache.size}`;
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: InterpolatorMetrics } {
    return {
      version: '1.4.0',
      metrics: this.getStats(),
    };
  }

  private isPrimitive(value: unknown): boolean {
    return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
  }

  private linearInterpolate(start: number, end: number, progress: number): number {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    return start + (end - start) * clampedProgress;
  }

  private recordSuccess(duration: number): void {
    this.metrics.successfulInterpolations++;
    this.updateAverageDuration(duration);
    this.metrics.lastInterpolationTime = duration;
  }

  private recordFailure(duration: number): void {
    this.metrics.failedInterpolations++;
    this.updateAverageDuration(duration);
    this.metrics.lastInterpolationTime = duration;
  }

  private updateAverageDuration(newDuration: number): void {
    const total = this.metrics.averageDuration * (this.metrics.totalInterpolations - 1) + newDuration;
    this.metrics.averageDuration = total / this.metrics.totalInterpolations;
  }
}

export default Interpolator;
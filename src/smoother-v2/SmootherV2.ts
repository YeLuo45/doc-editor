/**
 * V144 SmootherV2 - Core smoothing logic for doc-editor
 * Handles data smoothing and noise reduction with enhanced metrics
 */

export type SmootherConfig = {
  name: string;
  type: string;
  windowSize: number;
  smoothingFactor: number;
  enableCache: boolean;
  method: 'moving-average' | 'exponential' | 'weighted' | 'adaptive';
  tolerance?: number;
  maxIterations?: number;
};

export interface SmoothingResult {
  value: number;
  confidence: number;
  timestamp: number;
  method: string;
  iterations?: number;
  converged?: boolean;
}

export interface SmootherStats {
  totalSmoothingOps: number;
  successfulOps: number;
  failedOps: number;
  averageConfidence: number;
  lastSmoothingTime: number;
  cacheHits: number;
  cacheMisses: number;
  adaptiveAdjustments: number;
}

export interface SmootherSnapshot {
  metrics: SmootherStats;
  config: SmootherConfig;
  timestamp: number;
}

export class SmootherV2 {
  config: SmootherConfig;
  private stats: SmootherStats;
  private cache: Map<string, SmoothingResult>;
  private snapshot: SmootherSnapshot | null;
  private history: SmoothingResult[];

  constructor(config: SmootherConfig) {
    this.config = {
      name: config.name || 'smoother-v2-default',
      type: config.type || 'adaptive',
      windowSize: config.windowSize || 7,
      smoothingFactor: config.smoothingFactor || 0.4,
      enableCache: config.enableCache ?? true,
      method: config.method || 'adaptive',
      tolerance: config.tolerance || 0.001,
      maxIterations: config.maxIterations || 100,
    };
    this.stats = {
      totalSmoothingOps: 0,
      successfulOps: 0,
      failedOps: 0,
      averageConfidence: 0,
      lastSmoothingTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      adaptiveAdjustments: 0,
    };
    this.cache = new Map();
    this.snapshot = null;
    this.history = [];
  }

  smooth(data: number[], options?: { method?: string; factor?: number; tolerance?: number }): SmoothingResult {
    this.stats.totalSmoothingOps++;
    const startTime = Date.now();

    try {
      if (!data || data.length === 0) {
        throw new Error('Data array is empty');
      }

      if (data.length === 1) {
        return this.createResult(data[0], 1.0, this.config.method, 0, true);
      }

      const method = options?.method || this.config.method;
      const factor = options?.factor || this.config.smoothingFactor;
      const tolerance = options?.tolerance || this.config.tolerance || 0.001;

      const cacheKey = this.getCacheKey(data, method, factor);
      if (this.config.enableCache && this.cache.has(cacheKey)) {
        this.stats.cacheHits++;
        const cached = this.cache.get(cacheKey)!;
        this.stats.successfulOps++;
        this.updateAverageConfidence(cached.confidence);
        this.stats.lastSmoothingTime = Date.now() - startTime;
        return cached;
      }

      this.stats.cacheMisses++;

      let result: SmoothingResult;
      switch (method) {
        case 'exponential':
          result = this.exponentialSmooth(data, factor);
          break;
        case 'weighted':
          result = this.weightedSmooth(data);
          break;
        case 'adaptive':
          result = this.adaptiveSmooth(data, tolerance);
          break;
        case 'moving-average':
        default:
          result = this.movingAverageSmooth(data);
          break;
      }

      if (this.config.enableCache) {
        this.cache.set(cacheKey, result);
      }

      this.history.push(result);
      if (this.history.length > 1000) {
        this.history = this.history.slice(-500);
      }

      this.stats.successfulOps++;
      this.updateAverageConfidence(result.confidence);
      this.stats.lastSmoothingTime = Date.now() - startTime;
      this.snapshot = {
        metrics: { ...this.stats },
        config: { ...this.config },
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      this.stats.failedOps++;
      this.stats.lastSmoothingTime = Date.now() - startTime;
      throw error;
    }
  }

  private createResult(value: number, confidence: number, method: string, iterations: number, converged: boolean): SmoothingResult {
    return {
      value: Number(value.toFixed(4)),
      confidence,
      timestamp: Date.now(),
      method,
      iterations,
      converged,
    };
  }

  private getCacheKey(data: number[], method: string, factor: number): string {
    const preview = data.slice(0, Math.min(5, data.length)).join(',');
    const hash = data.length > 5 ? data.length : 0;
    return `${method}:${factor}:${preview}:${hash}:${data.length}`;
  }

  private movingAverageSmooth(data: number[]): SmoothingResult {
    const windowSize = Math.min(this.config.windowSize, data.length);
    let sum = 0;
    for (let i = data.length - windowSize; i < data.length; i++) {
      sum += data[i];
    }
    const value = sum / windowSize;
    const confidence = Math.min(0.95, 0.7 + (windowSize / data.length) * 0.25);
    return this.createResult(value, confidence, 'moving-average', 1, true);
  }

  private exponentialSmooth(data: number[], factor: number): SmoothingResult {
    if (data.length < 2) return this.createResult(data[0], 1.0, 'exponential', 0, true);
    let result = data[0];
    const alpha = Math.min(Math.max(factor, 0), 1);
    for (let i = 1; i < data.length; i++) {
      result = alpha * data[i] + (1 - alpha) * result;
    }
    return this.createResult(result, 0.88, 'exponential', 1, true);
  }

  private weightedSmooth(data: number[]): SmoothingResult {
    const n = data.length;
    let sum = 0;
    let weightSum = 0;
    for (let i = 0; i < n; i++) {
      const weight = n - i;
      sum += data[i] * weight;
      weightSum += weight;
    }
    const value = sum / weightSum;
    return this.createResult(value, 0.90, 'weighted', 1, true);
  }

  private adaptiveSmooth(data: number[], tolerance: number): SmoothingResult {
    let factor = this.config.smoothingFactor;
    let prevResult = this.exponentialSmooth(data, factor).value;
    let iterations = 0;
    let converged = false;

    for (let i = 0; i < (this.config.maxIterations || 100); i++) {
      iterations++;
      const result = this.exponentialSmooth(data, factor).value;
      const diff = Math.abs(result - prevResult);

      if (diff < tolerance) {
        converged = true;
        prevResult = result;
        break;
      }

      prevResult = result;
      factor = Math.min(0.99, factor * 1.05);
      this.stats.adaptiveAdjustments++;
    }

    return this.createResult(prevResult, converged ? 0.92 : 0.75, 'adaptive', iterations, converged);
  }

  private updateAverageConfidence(newConfidence: number): void {
    const total = this.stats.successfulOps;
    if (total === 0) {
      this.stats.averageConfidence = newConfidence;
      return;
    }
    const currentAvg = this.stats.averageConfidence;
    this.stats.averageConfidence = (currentAvg * (total - 1) + newConfidence) / total;
  }

  getSmoother(name: string): SmootherV2 | null {
    if (this.config.name === name) {
      return this;
    }
    return null;
  }

  getStats(): SmootherStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: SmootherStats } {
    return {
      metrics: this.snapshot?.metrics || { ...this.stats },
    };
  }

  reset(): void {
    this.stats = {
      totalSmoothingOps: 0,
      successfulOps: 0,
      failedOps: 0,
      averageConfidence: 0,
      lastSmoothingTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      adaptiveAdjustments: 0,
    };
    this.cache.clear();
    this.snapshot = null;
    this.history = [];
  }

  getReport(): string {
    return [
      `SmootherV2 Report: ${this.config.name}`,
      `Type: ${this.config.type}`,
      `Method: ${this.config.method}`,
      `Window Size: ${this.config.windowSize}`,
      `Smoothing Factor: ${this.config.smoothingFactor}`,
      `Tolerance: ${this.config.tolerance}`,
      `Total Smoothing Ops: ${this.stats.totalSmoothingOps}`,
      `Successful: ${this.stats.successfulOps}`,
      `Failed: ${this.stats.failedOps}`,
      `Average Confidence: ${this.stats.averageConfidence.toFixed(4)}`,
      `Cache Hits: ${this.stats.cacheHits}`,
      `Cache Misses: ${this.stats.cacheMisses}`,
      `Adaptive Adjustments: ${this.stats.adaptiveAdjustments}`,
      `Last Smoothing Time: ${this.stats.lastSmoothingTime}ms`,
      `Cache Size: ${this.cache.size}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.44.0',
    };
  }
}

export default SmootherV2;
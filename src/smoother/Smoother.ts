/**
 * V142 Smoother - Core smoothing logic for doc-editor
 * Handles data smoothing and noise reduction
 */

export type SmootherConfig = {
  name: string;
  type: string;
  windowSize: number;
  smoothingFactor: number;
  enableCache: boolean;
  method: 'moving-average' | 'exponential' | 'weighted';
};

export interface SmoothingResult {
  value: number;
  confidence: number;
  timestamp: number;
  method: string;
}

export interface SmootherStats {
  totalSmoothingOps: number;
  successfulOps: number;
  failedOps: number;
  averageConfidence: number;
  lastSmoothingTime: number;
}

export class Smoother {
  private config: SmootherConfig;
  private stats: SmootherStats;
  private cache: Map<string, SmoothingResult>;
  private lastSnapshot: { metrics: SmootherStats } | null;

  constructor(config: SmootherConfig) {
    this.config = {
      name: config.name || 'default',
      type: config.type || 'moving-average',
      windowSize: config.windowSize || 5,
      smoothingFactor: config.smoothingFactor || 0.5,
      enableCache: config.enableCache ?? true,
      method: config.method || 'moving-average',
    };
    this.stats = {
      totalSmoothingOps: 0,
      successfulOps: 0,
      failedOps: 0,
      averageConfidence: 0,
      lastSmoothingTime: 0,
    };
    this.cache = new Map();
    this.lastSnapshot = null;
  }

  get config(): SmootherConfig {
    return { ...this.config };
  }

  smooth(data: number[], options?: { method?: string; factor?: number }): SmoothingResult {
    this.stats.totalSmoothingOps++;
    const startTime = Date.now();

    try {
      if (!data || data.length === 0) {
        throw new Error('Data array is empty');
      }

      if (data.length < 2) {
        return {
          value: data[0],
          confidence: 1.0,
          timestamp: Date.now(),
          method: this.config.method,
        };
      }

      const method = options?.method || this.config.method;
      const factor = options?.factor || this.config.smoothingFactor;

      const cacheKey = `${JSON.stringify(data)}:${method}:${factor}`;
      if (this.config.enableCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        this.stats.successfulOps++;
        this.updateAverageConfidence(cached.confidence);
        this.stats.lastSmoothingTime = Date.now() - startTime;
        return cached;
      }

      let result: number;
      let confidence: number;

      switch (method) {
        case 'exponential':
          result = this.exponentialSmooth(data, factor);
          confidence = 0.85;
          break;
        case 'weighted':
          result = this.weightedSmooth(data);
          confidence = 0.88;
          break;
        case 'moving-average':
        default:
          result = this.movingAverageSmooth(data);
          confidence = 0.9;
          break;
      }

      const smoothingResult: SmoothingResult = {
        value: Number(result.toFixed(2)),
        confidence,
        timestamp: Date.now(),
        method,
      };

      if (this.config.enableCache) {
        this.cache.set(cacheKey, smoothingResult);
      }

      this.stats.successfulOps++;
      this.updateAverageConfidence(smoothingResult.confidence);
      this.stats.lastSmoothingTime = Date.now() - startTime;
      this.lastSnapshot = { metrics: { ...this.stats } };

      return smoothingResult;
    } catch (error) {
      this.stats.failedOps++;
      this.stats.lastSmoothingTime = Date.now() - startTime;
      throw error;
    }
  }

  private movingAverageSmooth(data: number[]): number {
    const windowSize = Math.min(this.config.windowSize, data.length);
    let sum = 0;
    for (let i = data.length - windowSize; i < data.length; i++) {
      sum += data[i];
    }
    return sum / windowSize;
  }

  private exponentialSmooth(data: number[], factor: number): number {
    if (data.length < 2) return data[0];
    let result = data[0];
    const alpha = Math.min(Math.max(factor, 0), 1);
    for (let i = 1; i < data.length; i++) {
      result = alpha * data[i] + (1 - alpha) * result;
    }
    return result;
  }

  private weightedSmooth(data: number[]): number {
    const n = data.length;
    let sum = 0;
    let weightSum = 0;
    for (let i = 0; i < n; i++) {
      const weight = n - i;
      sum += data[i] * weight;
      weightSum += weight;
    }
    return sum / weightSum;
  }

  private updateAverageConfidence(newConfidence: number): void {
    const total = this.stats.successfulOps;
    const currentAvg = this.stats.averageConfidence;
    this.stats.averageConfidence = (currentAvg * (total - 1) + newConfidence) / total;
  }

  getSmoother(name: string): Smoother | null {
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
      metrics: { ...this.stats },
    };
  }

  reset(): void {
    this.stats = {
      totalSmoothingOps: 0,
      successfulOps: 0,
      failedOps: 0,
      averageConfidence: 0,
      lastSmoothingTime: 0,
    };
    this.cache.clear();
    this.lastSnapshot = null;
  }

  getReport(): string {
    return [
      `Smoother Report: ${this.config.name}`,
      `Type: ${this.config.type}`,
      `Method: ${this.config.method}`,
      `Window Size: ${this.config.windowSize}`,
      `Smoothing Factor: ${this.config.smoothingFactor}`,
      `Total Smoothing Ops: ${this.stats.totalSmoothingOps}`,
      `Successful: ${this.stats.successfulOps}`,
      `Failed: ${this.stats.failedOps}`,
      `Average Confidence: ${this.stats.averageConfidence.toFixed(4)}`,
      `Last Smoothing Time: ${this.stats.lastSmoothingTime}ms`,
      `Cache Size: ${this.cache.size}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}

export default Smoother;
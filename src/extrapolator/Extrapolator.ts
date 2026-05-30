/**
 * V141 Extrapolator - Core extrapolation logic for doc-editor
 * Handles data projection and future value estimation
 */

export type ExtrapolatorConfig = {
  name: string;
  type: string;
  maxLookahead: number;
  precision: number;
  enableCache: boolean;
  interpolation: 'linear' | 'polynomial' | 'exponential';
};

export interface ExtrapolationResult {
  value: number | string;
  confidence: number;
  timestamp: number;
  method: string;
}

export interface ExtrapolationStats {
  totalExtrapolations: number;
  successfulExtrapolations: number;
  failedExtrapolations: number;
  averageConfidence: number;
  lastExtrapolationTime: number;
}

export class Extrapolator {
  private config: ExtrapolatorConfig;
  private stats: ExtrapolationStats;
  private cache: Map<string, ExtrapolationResult>;
  private lastSnapshot: { metrics: ExtrapolationStats } | null;

  constructor(config: ExtrapolatorConfig) {
    this.config = {
      name: config.name || 'default',
      type: config.type || 'linear',
      maxLookahead: config.maxLookahead || 10,
      precision: config.precision || 2,
      enableCache: config.enableCache ?? true,
      interpolation: config.interpolation || 'linear',
    };
    this.stats = {
      totalExtrapolations: 0,
      successfulExtrapolations: 0,
      failedExtrapolations: 0,
      averageConfidence: 0,
      lastExtrapolationTime: 0,
    };
    this.cache = new Map();
    this.lastSnapshot = null;
  }

  get config(): ExtrapolatorConfig {
    return { ...this.config };
  }

  extrapolate(
    data: number[],
    steps: number,
    options?: { method?: string; confidence?: number }
  ): ExtrapolationResult {
    this.stats.totalExtrapolations++;
    const startTime = Date.now();

    try {
      if (!data || data.length === 0) {
        throw new Error('Data array is empty');
      }

      if (steps <= 0 || steps > this.config.maxLookahead) {
        throw new Error(`Steps must be between 1 and ${this.config.maxLookahead}`);
      }

      const cacheKey = `${JSON.stringify(data)}:${steps}:${options?.method || this.config.interpolation}`;
      if (this.config.enableCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        this.stats.successfulExtrapolations++;
        this.updateAverageConfidence(cached.confidence);
        this.stats.lastExtrapolationTime = Date.now() - startTime;
        return cached;
      }

      const method = options?.method || this.config.interpolation;
      let result: number;
      let confidence: number;

      switch (method) {
        case 'polynomial':
          result = this.polynomialExtrapolate(data, steps);
          confidence = 0.85;
          break;
        case 'exponential':
          result = this.exponentialExtrapolate(data, steps);
          confidence = 0.75;
          break;
        case 'linear':
        default:
          result = this.linearExtrapolate(data, steps);
          confidence = 0.9;
          break;
      }

      const extrapolationResult: ExtrapolationResult = {
        value: Number(result.toFixed(this.config.precision)),
        confidence: options?.confidence || confidence,
        timestamp: Date.now(),
        method,
      };

      if (this.config.enableCache) {
        this.cache.set(cacheKey, extrapolationResult);
      }

      this.stats.successfulExtrapolations++;
      this.updateAverageConfidence(extrapolationResult.confidence);
      this.stats.lastExtrapolationTime = Date.now() - startTime;
      this.lastSnapshot = { metrics: { ...this.stats } };

      return extrapolationResult;
    } catch (error) {
      this.stats.failedExtrapolations++;
      this.stats.lastExtrapolationTime = Date.now() - startTime;
      throw error;
    }
  }

  private linearExtrapolate(data: number[], steps: number): number {
    const n = data.length;
    if (n < 2) return data[0];

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return intercept + slope * (n - 1 + steps);
  }

  private polynomialExtrapolate(data: number[], steps: number): number {
    const n = data.length;
    if (n < 3) return this.linearExtrapolate(data, steps);

    let sumX = 0, sumY = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
    let sumXY = 0, sumX2Y = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const x2 = x * x;
      const x3 = x2 * x;
      const x4 = x3 * x;
      sumX += x;
      sumX2 += x2;
      sumX3 += x3;
      sumX4 += x4;
      sumY += data[i];
      sumXY += x * data[i];
      sumX2Y += x2 * data[i];
    }

    const slope = (n * sumX2Y - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return intercept + slope * (n - 1 + steps);
  }

  private exponentialExtrapolate(data: number[], steps: number): number {
    const n = data.length;
    if (n < 2) return data[0];

    const ratios: number[] = [];
    for (let i = 1; i < n; i++) {
      if (data[i - 1] !== 0) {
        ratios.push(data[i] / data[i - 1]);
      }
    }

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return data[n - 1] * Math.pow(avgRatio, steps);
  }

  private updateAverageConfidence(newConfidence: number): void {
    const total = this.stats.successfulExtrapolations;
    const currentAvg = this.stats.averageConfidence;
    this.stats.averageConfidence = (currentAvg * (total - 1) + newConfidence) / total;
  }

  getExtrapolator(name: string): Extrapolator | null {
    if (this.config.name === name) {
      return this;
    }
    return null;
  }

  getStats(): ExtrapolationStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: ExtrapolationStats } {
    return {
      metrics: { ...this.stats },
    };
  }

  reset(): void {
    this.stats = {
      totalExtrapolations: 0,
      successfulExtrapolations: 0,
      failedExtrapolations: 0,
      averageConfidence: 0,
      lastExtrapolationTime: 0,
    };
    this.cache.clear();
    this.lastSnapshot = null;
  }

  getReport(): string {
    return [
      `Extrapolator Report: ${this.config.name}`,
      `Type: ${this.config.type}`,
      `Interpolation: ${this.config.interpolation}`,
      `Total Extrapolations: ${this.stats.totalExtrapolations}`,
      `Successful: ${this.stats.successfulExtrapolations}`,
      `Failed: ${this.stats.failedExtrapolations}`,
      `Average Confidence: ${this.stats.averageConfidence.toFixed(4)}`,
      `Last Extrapolation Time: ${this.stats.lastExtrapolationTime}ms`,
      `Cache Size: ${this.cache.size}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}

export default Extrapolator;
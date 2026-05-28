/**
 * PatternAnalyzer - Pattern detection and trend analysis for doc-editor V28
 * Provides detectPattern, analyzeTrend, and getPatternReport capabilities
 */

export interface Pattern {
  id: string;
  type: string;
  frequency: number;
  strength: number;
  detected: number;
  metadata?: Record<string, unknown>;
}

export interface TrendAnalysis {
  direction: 'upward' | 'downward' | 'stable' | 'volatile';
  slope: number;
  volatility: number;
  predictions: number[];
  confidence: number;
}

export interface PatternReport {
  patterns: Pattern[];
  trends: TrendAnalysis[];
  summary: {
    totalPatterns: number;
    dominantPattern: string | null;
    trendDirection: string;
    confidence: number;
  };
  timestamp: number;
}

export interface Snapshot {
  activeDetections: number;
  patternsAnalyzed: number;
  lastDetection: number;
  historyLength: number;
}

export class PatternAnalyzer {
  private patterns: Pattern[] = [];
  private trends: TrendAnalysis[] = [];
  private detectionCount: number = 0;
  private lastDetectionTime: number = 0;

  constructor() {
    this.detectionCount = 0;
    this.lastDetectionTime = Date.now();
  }

  /**
   * Detect patterns in the given data sequence
   */
  detectPattern(data: unknown[], options?: {
    type?: string;
    minFrequency?: number;
    sensitivity?: number;
  }): Pattern {
    const pattern: Pattern = {
      id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: options?.type ?? this.inferType(data),
      frequency: this.calculateFrequency(data),
      strength: this.calculateStrength(data, options?.sensitivity ?? 0.7),
      detected: Date.now(),
      metadata: {
        dataPoints: data.length,
        minFrequency: options?.minFrequency ?? 1,
        sensitivity: options?.sensitivity ?? 0.7,
      },
    };
    this.patterns.push(pattern);
    this.detectionCount++;
    this.lastDetectionTime = Date.now();
    return pattern;
  }

  /**
   * Analyze trends in time-series data
   */
  analyzeTrend(data: number[], options?: {
    windowSize?: number;
    predictFuture?: boolean;
  }): TrendAnalysis {
    const windowSize = options?.windowSize ?? Math.min(data.length, 10);
    const trend = this.computeTrend(data, windowSize);
    const predictions = options?.predictFuture
      ? this.predictFuture(trend, 5)
      : [];
    
    const analysis: TrendAnalysis = {
      direction: this.determineDirection(trend.slope),
      slope: trend.slope,
      volatility: this.calculateVolatility(data),
      predictions,
      confidence: trend.confidence,
    };
    this.trends.push(analysis);
    return analysis;
  }

  /**
   * Get comprehensive pattern report
   */
  getPatternReport(): PatternReport {
    const summary = this.generateSummary();
    return {
      patterns: [...this.patterns],
      trends: [...this.trends],
      summary,
      timestamp: Date.now(),
    };
  }

  /**
   * Get current state snapshot
   */
  getSnapshot(): Snapshot {
    return {
      activeDetections: this.detectionCount,
      patternsAnalyzed: this.patterns.length,
      lastDetection: this.lastDetectionTime,
      historyLength: this.patterns.length + this.trends.length,
    };
  }

  /**
   * Reset analyzer state
   */
  reset(): void {
    this.patterns = [];
    this.trends = [];
    this.detectionCount = 0;
    this.lastDetectionTime = Date.now();
  }

  /**
   * Generate detailed report
   */
  getReport(): {
    analyzer: string;
    version: string;
    snapshot: Snapshot;
    patterns: Pattern[];
    trends: TrendAnalysis[];
    summary: Record<string, unknown>;
  } {
    return {
      analyzer: 'PatternAnalyzer',
      version: 'V28',
      snapshot: this.getSnapshot(),
      patterns: this.patterns.slice(-20),
      trends: this.trends.slice(-10),
      summary: this.generateSummary(),
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): Record<string, unknown> {
    return {
      analyzer: 'PatternAnalyzer',
      version: 'V28',
      timestamp: Date.now(),
      metrics: {
        totalDetections: this.detectionCount,
        totalPatterns: this.patterns.length,
        totalTrends: this.trends.length,
        lastDetection: this.lastDetectionTime,
        byType: this.countByType(),
        averageStrength: this.calculateAverageStrength(),
      },
      patterns: this.patterns.slice(-50),
      trends: this.trends.slice(-20),
    };
  }

  // Private helper methods
  private inferType(data: unknown[]): string {
    if (data.length === 0) return 'unknown';
    const sample = data[0];
    if (typeof sample === 'number') return 'numeric';
    if (typeof sample === 'string') return 'textual';
    if (Array.isArray(sample)) return 'sequential';
    if (sample && typeof sample === 'object') return 'object';
    return 'mixed';
  }

  private calculateFrequency(data: unknown[]): number {
    if (data.length < 2) return 1;
    const frequencies = new Map<string, number>();
    for (const item of data) {
      const key = JSON.stringify(item);
      frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
    }
    const maxFreq = Math.max(...frequencies.values());
    return maxFreq / data.length;
  }

  private calculateStrength(data: unknown[], sensitivity: number): number {
    if (data.length < 2) return sensitivity;
    const uniqueRatio = new Set(data.map(d => JSON.stringify(d))).size / data.length;
    return Math.min(1, sensitivity * (1 - uniqueRatio + 0.1));
  }

  private computeTrend(data: number[], windowSize: number): { slope: number; confidence: number } {
    if (data.length < 2) return { slope: 0, confidence: 0 };
    const window = data.slice(-windowSize);
    const n = window.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = window.reduce((a, b) => a + b, 0);
    const sumXY = window.reduce((acc, y, x) => acc + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return { slope: 0, confidence: 0 };
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const meanY = sumY / n;
    const ssTotal = window.reduce((acc, y) => acc + Math.pow(y - meanY, 2), 0);
    const ssResidual = window.reduce((acc, y, x) => {
      const predicted = slope * (x - (n - 1) / 2) + meanY;
      return acc + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
    return { slope, confidence: Math.max(0, rSquared) };
  }

  private calculateVolatility(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  private determineDirection(slope: number): 'upward' | 'downward' | 'stable' | 'volatile' {
    if (Math.abs(slope) < 0.1) return 'stable';
    if (Math.abs(slope) > 2.0) return 'volatile';
    return slope > 0 ? 'upward' : 'downward';
  }

  private predictFuture(trend: { slope: number; confidence: number }, steps: number): number[] {
    const { slope, confidence } = trend;
    const lastValue = 0;
    return Array.from({ length: steps }, (_, i) => {
      return lastValue + slope * (i + 1) * confidence;
    });
  }

  private generateSummary(): PatternReport['summary'] {
    const typeCount = this.countByType();
    const dominantPattern = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const recentTrends = this.trends.slice(-5);
    const trendDirection = recentTrends.length > 0
      ? this.aggregateTrendDirection(recentTrends)
      : 'stable';
    return {
      totalPatterns: this.patterns.length,
      dominantPattern,
      trendDirection,
      confidence: this.calculateAverageConfidence(),
    };
  }

  private countByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const pattern of this.patterns) {
      counts[pattern.type] = (counts[pattern.type] ?? 0) + 1;
    }
    return counts;
  }

  private calculateAverageStrength(): number {
    if (this.patterns.length === 0) return 0;
    return this.patterns.reduce((acc, p) => acc + p.strength, 0) / this.patterns.length;
  }

  private calculateAverageConfidence(): number {
    if (this.trends.length === 0) return 0;
    return this.trends.reduce((acc, t) => acc + t.confidence, 0) / this.trends.length;
  }

  private aggregateTrendDirection(trends: TrendAnalysis[]): string {
    const directions = trends.map(t => t.direction);
    const counts = new Map<string, number>();
    for (const dir of directions) {
      counts.set(dir, (counts.get(dir) ?? 0) + 1);
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'stable';
  }
}
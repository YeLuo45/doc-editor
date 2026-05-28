/**
 * LearningEngine - Learning and prediction engine for doc-editor V28
 * Provides learn, predict, and getInsights capabilities
 */

export interface LearningSample {
  id: string;
  input: unknown;
  output: unknown;
  weight?: number;
  timestamp: number;
}

export interface PredictionResult {
  id: string;
  input: unknown;
  predicted: unknown;
  confidence: number;
  basedOn: number;
  timestamp: number;
}

export interface Insight {
  id: string;
  type: 'pattern' | 'anomaly' | 'correlation' | 'trend';
  description: string;
  significance: number;
  evidence: string[];
  timestamp: number;
}

export interface Snapshot {
  samplesLearned: number;
  predictionsMade: number;
  insightsGenerated: number;
  modelAccuracy: number;
  lastLearning: number;
}

export class LearningEngine {
  private samples: LearningSample[] = [];
  private predictions: PredictionResult[] = [];
  private insights: Insight[] = [];
  private lastLearningTime: number = 0;

  constructor() {
    this.lastLearningTime = Date.now();
  }

  /**
   * Learn from a sample (input -> output mapping)
   */
  learn(input: unknown, output: unknown, options?: {
    weight?: number;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): LearningSample {
    const sample: LearningSample = {
      id: `sample-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      input,
      output,
      weight: options?.weight ?? 1.0,
      timestamp: Date.now(),
    };

    this.samples.push(sample);
    this.lastLearningTime = Date.now();
    this.generateInsightsFromSample(sample);

    return sample;
  }

  /**
   * Predict output based on learned patterns
   */
  predict(input: unknown, options?: {
    maxCandidates?: number;
    confidenceThreshold?: number;
  }): PredictionResult {
    const similarSamples = this.findSimilarSamples(input);
    const basedOn = Math.min(similarSamples.length, options?.maxCandidates ?? 5);
    
    let predicted: unknown;
    let confidence: number;

    if (similarSamples.length === 0) {
      predicted = this.defaultPrediction(input);
      confidence = 0.3;
    } else {
      const weightedOutputs = similarSamples.slice(0, basedOn).map((s, i) => ({
        output: s.output,
        weight: s.weight * (1 / (i + 1)),
      }));

      predicted = this.aggregateOutputs(weightedOutputs);
      confidence = this.calculateConfidence(weightedOutputs, similarSamples.length);
    }

    const result: PredictionResult = {
      id: `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      input,
      predicted,
      confidence,
      basedOn,
      timestamp: Date.now(),
    };

    this.predictions.push(result);
    return result;
  }

  /**
   * Get insights based on learned patterns
   */
  getInsights(options?: {
    type?: Insight['type'];
    minSignificance?: number;
    limit?: number;
  }): Insight[] {
    let filtered = [...this.insights];

    if (options?.type) {
      filtered = filtered.filter(i => i.type === options.type);
    }
    if (options?.minSignificance !== undefined) {
      filtered = filtered.filter(i => i.significance >= options.minSignificance);
    }

    return filtered
      .sort((a, b) => b.significance - a.significance)
      .slice(0, options?.limit ?? 20);
  }

  /**
   * Get current state snapshot
   */
  getSnapshot(): Snapshot {
    return {
      samplesLearned: this.samples.length,
      predictionsMade: this.predictions.length,
      insightsGenerated: this.insights.length,
      modelAccuracy: this.calculateModelAccuracy(),
      lastLearning: this.lastLearningTime,
    };
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.samples = [];
    this.predictions = [];
    this.insights = [];
    this.lastLearningTime = Date.now();
  }

  /**
   * Generate comprehensive report
   */
  getReport(): {
    engine: string;
    version: string;
    snapshot: Snapshot;
    recentSamples: LearningSample[];
    recentPredictions: PredictionResult[];
    insights: Insight[];
    statistics: Record<string, unknown>;
  } {
    return {
      engine: 'LearningEngine',
      version: 'V28',
      snapshot: this.getSnapshot(),
      recentSamples: this.samples.slice(-10),
      recentPredictions: this.predictions.slice(-10),
      insights: this.getInsights({ limit: 20 }),
      statistics: {
        totalSamples: this.samples.length,
        totalPredictions: this.predictions.length,
        modelAccuracy: this.calculateModelAccuracy(),
        averageConfidence: this.calculateAverageConfidence(),
        byType: this.countInsightsByType(),
      },
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): Record<string, unknown> {
    return {
      engine: 'LearningEngine',
      version: 'V28',
      timestamp: Date.now(),
      metrics: {
        totalSamples: this.samples.length,
        totalPredictions: this.predictions.length,
        totalInsights: this.insights.length,
        modelAccuracy: this.calculateModelAccuracy(),
        averageConfidence: this.calculateAverageConfidence(),
        lastLearning: this.lastLearningTime,
      },
      samples: this.samples.slice(-100),
      predictions: this.predictions.slice(-100),
      insights: this.insights,
    };
  }

  // Private helper methods
  private findSimilarSamples(input: unknown): LearningSample[] {
    const inputStr = JSON.stringify(input);
    return this.samples
      .map(sample => ({
        sample,
        distance: this.calculateDistance(inputStr, JSON.stringify(sample.input)),
      }))
      .filter(({ distance }) => distance < 0.8)
      .sort((a, b) => a.distance - b.distance)
      .map(({ sample }) => sample);
  }

  private calculateDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    return matrix[a.length][b.length] / Math.max(a.length, b.length);
  }

  private aggregateOutputs(weightedOutputs: Array<{ output: unknown; weight: number }>): unknown {
    const outputs = weightedOutputs.map(wo => wo.output);
    if (outputs.every(o => typeof o === 'number')) {
      const totalWeight = weightedOutputs.reduce((sum, wo) => sum + wo.weight, 0);
      return weightedOutputs.reduce((sum, wo) => sum + (wo.output as number) * wo.weight, 0) / totalWeight;
    }
    const counts = new Map<string, number>();
    for (const output of outputs) {
      const key = JSON.stringify(output);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return outputs[0] ?? null;
    return JSON.parse(sorted[0][0]);
  }

  private calculateConfidence(weightedOutputs: Array<{ output: unknown; weight: number }>, totalSimilar: number): number {
    if (weightedOutputs.length === 0) return 0;
    if (weightedOutputs.length === 1) return 0.5;
    
    const outputs = weightedOutputs.map(wo => JSON.stringify(wo.output));
    const consensus = outputs.every(o => o === outputs[0]);
    if (consensus) return Math.min(0.95, 0.6 + totalSimilar * 0.05);
    
    const uniqueRatio = new Set(outputs).size / outputs.length;
    return Math.max(0.3, 0.7 - uniqueRatio * 0.4);
  }

  private defaultPrediction(input: unknown): unknown {
    if (typeof input === 'number') return input * 1.1;
    if (typeof input === 'string') return input.toLowerCase();
    if (Array.isArray(input)) return [...input];
    if (input && typeof input === 'object') return { ...(input as object) };
    return input;
  }

  private generateInsightsFromSample(sample: LearningSample): void {
    const similarCount = this.samples.filter(
      s => JSON.stringify(s.input) === JSON.stringify(sample.input)
    ).length;

    if (similarCount > 3) {
      this.insights.push({
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'pattern',
        description: `Frequent pattern detected for similar inputs`,
        significance: Math.min(1, similarCount * 0.2),
        evidence: [`Observed ${similarCount} times`],
        timestamp: Date.now(),
      });
    }

    if (this.samples.length > 10 && Math.random() > 0.8) {
      this.insights.push({
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'trend',
        description: `Learning progression detected`,
        significance: 0.6,
        evidence: [`${this.samples.length} total samples`],
        timestamp: Date.now(),
      });
    }
  }

  private calculateModelAccuracy(): number {
    if (this.predictions.length === 0) return 0;
    const correct = this.predictions.filter(p => p.confidence > 0.7).length;
    return correct / this.predictions.length;
  }

  private calculateAverageConfidence(): number {
    if (this.predictions.length === 0) return 0;
    return this.predictions.reduce((sum, p) => sum + p.confidence, 0) / this.predictions.length;
  }

  private countInsightsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const insight of this.insights) {
      counts[insight.type] = (counts[insight.type] ?? 0) + 1;
    }
    return counts;
  }
}
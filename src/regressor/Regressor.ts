/**
 * V143 Regressor - Core regression analysis for doc-editor
 * Handles predictor management and statistical regression operations
 */

export type RegressorConfig = {
  name: string;
  version: string;
  tolerance: number;
  maxIterations: number;
  convergenceThreshold: number;
  enableValidation: boolean;
};

export type Predictor = {
  id: string;
  name: string;
  weight: number;
  coefficient: number;
  metadata?: Record<string, unknown>;
};

export type RegressionResult = {
  predictorId: string;
  value: number;
  residual: number;
  confidence: number;
  timestamp: number;
};

export type RegressorStats = {
  rSquared: number;
  adjustedRSquared: number;
  standardError: number;
  fStatistic: number;
  pValue: number;
  observationCount: number;
  degreesOfFreedom: number;
};

export class Regressor {
  private predictors: Map<string, Predictor> = new Map();
  private results: RegressionResult[] = [];
  private stats: RegressorStats | null = null;
  private iteration: number = 0;
  private lastRun: number = 0;
  private converged: boolean = false;

  readonly config: RegressorConfig;

  constructor(config: RegressorConfig) {
    this.config = { ...config };
  }

  addPredictor(predictor: Omit<Predictor, 'id'>): string {
    const id = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullPredictor: Predictor = { id, ...predictor };
    this.predictors.set(id, fullPredictor);
    this.iteration = 0;
    this.converged = false;
    return id;
  }

  removePredictor(id: string): boolean {
    const deleted = this.predictors.delete(id);
    if (deleted) {
      this.results = this.results.filter(r => r.predictorId !== id);
      this.iteration = 0;
      this.converged = false;
    }
    return deleted;
  }

  getRegressor(id: string): Predictor | undefined {
    return this.predictors.get(id);
  }

  getStats(): RegressorStats | null {
    return this.stats;
  }

  regress(inputData: number[]): RegressionResult[] {
    if (this.predictors.size === 0) {
      throw new Error('No predictors available for regression');
    }

    this.iteration++;
    this.lastRun = Date.now();
    const newResults: RegressionResult[] = [];

    let sumY = 0;
    let sumYsq = 0;
    const n = inputData.length || this.predictors.size;

    for (const [id, predictor] of this.predictors) {
      const baseValue = inputData[this.predictors.size > 0 ? 
        Array.from(this.predictors.keys()).indexOf(id) % inputData.length : 0] || 0;
      
      const value = baseValue * predictor.coefficient * predictor.weight;
      const residual = Math.random() * this.config.tolerance;
      const confidence = Math.max(0, Math.min(1, 1 - residual));

      const result: RegressionResult = {
        predictorId: id,
        value,
        residual,
        confidence,
        timestamp: Date.now(),
      };
      newResults.push(result);
    }

    this.results = newResults;
    this.calculateStats(n);
    this.checkConvergence();

    return this.results;
  }

  private calculateStats(n: number): void {
    const residuals = this.results.map(r => r.residual);
    const sumResiduals = residuals.reduce((a, b) => a + b, 0);
    const meanResidual = sumResiduals / (n || 1);
    const variance = residuals.reduce((acc, r) => acc + Math.pow(r - meanResidual, 2), 0) / (n || 1);
    const standardError = Math.sqrt(variance);

    const totalSumSquares = this.results.reduce((acc, r) => acc + Math.pow(r.value, 2), 0);
    const explainedSumSquares = totalSumSquares - variance * n;

    this.stats = {
      rSquared: Math.max(0, Math.min(1, 1 - variance / (totalSumSquares || 1))),
      adjustedRSquared: Math.max(0, Math.min(1, 1 - (variance / (totalSumSquares || 1)) * ((n - 1) / (n - this.predictors.size - 1 || 1)))),
      standardError,
      fStatistic: explainedSumSquares / (variance || 1),
      pValue: Math.max(0, Math.min(1, variance / (totalSumSquares || 1))),
      observationCount: n,
      degreesOfFreedom: n - this.predictors.size - 1,
    };
  }

  private checkConvergence(): void {
    if (this.stats && this.iteration > 0) {
      this.converged = this.stats.standardError < this.config.convergenceThreshold;
    }
  }

  getSnapshot(): { metrics: RegressorStats | null; iteration: number; converged: boolean } {
    return {
      metrics: this.stats,
      iteration: this.iteration,
      converged: this.converged,
    };
  }

  reset(): void {
    this.predictors.clear();
    this.results = [];
    this.stats = null;
    this.iteration = 0;
    this.lastRun = 0;
    this.converged = false;
  }

  getReport(): string {
    const predictorList = Array.from(this.predictors.values())
      .map(p => `  - ${p.name} (id: ${p.id}, weight: ${p.weight}, coeff: ${p.coefficient})`)
      .join('\n');

    const statsStr = this.stats ? `
  R-Squared: ${this.stats.rSquared.toFixed(4)}
  Adjusted R-Squared: ${this.stats.adjustedRSquared.toFixed(4)}
  Standard Error: ${this.stats.standardError.toFixed(4)}
  F-Statistic: ${this.stats.fStatistic.toFixed(4)}
  P-Value: ${this.stats.pValue.toFixed(4)}
  Observations: ${this.stats.observationCount}
  Degrees of Freedom: ${this.stats.degreesOfFreedom}` : '  No statistics available';

    return `=== Regressor Report ===
Name: ${this.config.name}
Version: ${this.config.version}
Tolerance: ${this.config.tolerance}
Max Iterations: ${this.config.maxIterations}
Convergence Threshold: ${this.config.convergenceThreshold}
Status: ${this.converged ? 'CONVERGED' : 'RUNNING'}
Iteration: ${this.iteration}
Last Run: ${this.lastRun ? new Date(this.lastRun).toISOString() : 'Never'}

Predictors (${this.predictors.size}):
${predictorList || '  No predictors'}

Statistics:${statsStr}
`;
  }

  exportMetrics(): { version: string; config: RegressorConfig; stats: RegressorStats | null } {
    return {
      version: '1.4.3',
      config: this.config,
      stats: this.stats,
    };
  }
}
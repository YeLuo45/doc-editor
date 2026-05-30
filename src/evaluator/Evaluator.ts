/**
 * V133 Evaluator Module
 * Core evaluation engine for doc-editor
 */

export type EvaluatorConfig = {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  timeout: number;
  strict: boolean;
  metadata?: Record<string, unknown>;
};

export type Criterion = {
  id: string;
  name: string;
  weight: number;
  description: string;
  validator: (value: unknown) => boolean;
};

export type EvaluationResult = {
  id: string;
  score: number;
  passed: boolean;
  details: Record<string, unknown>;
  timestamp: number;
};

export type EvaluatorStats = {
  totalEvaluations: number;
  passedEvaluations: number;
  failedEvaluations: number;
  averageScore: number;
  lastEvaluation?: EvaluationResult;
};

export class Evaluator {
  private _config: EvaluatorConfig;
  private _criteria: Map<string, Criterion> = new Map();
  private _stats: EvaluatorStats = {
    totalEvaluations: 0,
    passedEvaluations: 0,
    failedEvaluations: 0,
    averageScore: 0,
  };
  private _history: EvaluationResult[] = [];
  private readonly MAX_HISTORY = 100;

  constructor(config: EvaluatorConfig) {
    this._config = { ...config };
  }

  get config(): EvaluatorConfig {
    return { ...this._config };
  }

  getEvaluator(): Evaluator {
    return this;
  }

  evaluate(value: unknown): EvaluationResult {
    const result: EvaluationResult = {
      id: `${this._config.id}-${Date.now()}`,
      score: 0,
      passed: true,
      details: {},
      timestamp: Date.now(),
    };

    if (!this._config.enabled) {
      result.passed = true;
      result.score = 1;
      return result;
    }

    let totalWeight = 0;
    let earnedScore = 0;

    this._criteria.forEach((criterion) => {
      totalWeight += criterion.weight;
      try {
        const passed = criterion.validator(value);
        if (passed) {
          earnedScore += criterion.weight;
        }
        result.details[criterion.id] = passed;
      } catch {
        result.details[criterion.id] = false;
        result.passed = false;
      }
    });

    result.score = totalWeight > 0 ? earnedScore / totalWeight : 0;
    result.passed = result.passed && result.score >= 0.7;

    this.updateStats(result);
    this.addToHistory(result);

    return result;
  }

  addCriterion(criterion: Criterion): boolean {
    if (this._criteria.has(criterion.id)) {
      return false;
    }
    this._criteria.set(criterion.id, { ...criterion });
    return true;
  }

  removeCriterion(criterionId: string): boolean {
    return this._criteria.delete(criterionId);
  }

  getStats(): EvaluatorStats {
    return { ...this._stats };
  }

  getSnapshot(): { metrics: EvaluatorStats } {
    return {
      metrics: this.getStats(),
    };
  }

  reset(): void {
    this._stats = {
      totalEvaluations: 0,
      passedEvaluations: 0,
      failedEvaluations: 0,
      averageScore: 0,
    };
    this._history = [];
  }

  getReport(): string {
    const passRate =
      this._stats.totalEvaluations > 0
        ? (
            (this._stats.passedEvaluations / this._stats.totalEvaluations) *
            100
          ).toFixed(2)
        : "0.00";

    return [
      `=== Evaluator Report: ${this._config.name} ===`,
      `ID: ${this._config.id}`,
      `Version: ${this._config.version}`,
      `Status: ${this._config.enabled ? "Enabled" : "Disabled"}`,
      `Criteria Count: ${this._criteria.size}`,
      `Total Evaluations: ${this._stats.totalEvaluations}`,
      `Passed: ${this._stats.passedEvaluations}`,
      `Failed: ${this._stats.failedEvaluations}`,
      `Pass Rate: ${passRate}%`,
      `Average Score: ${this._stats.averageScore.toFixed(4)}`,
    ].join("\n");
  }

  exportMetrics(): { version: string } {
    return {
      version: "1.33.0",
    };
  }

  private updateStats(result: EvaluationResult): void {
    this._stats.totalEvaluations++;
    if (result.passed) {
      this._stats.passedEvaluations++;
    } else {
      this._stats.failedEvaluations++;
    }

    const total = this._stats.totalEvaluations;
    const prevAvg = this._stats.averageScore;
    this._stats.averageScore = prevAvg + (result.score - prevAvg) / total;
    this._stats.lastEvaluation = result;
  }

  private addToHistory(result: EvaluationResult): void {
    this._history.push(result);
    if (this._history.length > this.MAX_HISTORY) {
      this._history.shift();
    }
  }

  getHistory(): EvaluationResult[] {
    return [...this._history];
  }
}
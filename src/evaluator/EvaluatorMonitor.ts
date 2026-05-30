/**
 * V133 EvaluatorMonitor Module
 * Monitors and tracks evaluation metrics across the system
 */

import { EvaluationResult } from "./Evaluator";

export type MonitorConfig = {
  name: string;
  version: string;
  retentionPeriod: number;
  samplingRate: number;
  alertThreshold: number;
};

export type MonitorMetrics = {
  totalTracked: number;
  successfulTracked: number;
  failedTracked: number;
  averageScore: number;
  peakScore: number;
  lowestScore: number;
};

export type MonitorStatus = {
  isActive: boolean;
  lastTrackTime?: number;
  uptime: number;
};

export class EvaluatorMonitor {
  private _config: MonitorConfig;
  private _metrics: MonitorMetrics = {
    totalTracked: 0,
    successfulTracked: 0,
    failedTracked: 0,
    averageScore: 0,
    peakScore: 0,
    lowestScore: 1,
  };
  private _history: Array<{
    metrics: MonitorMetrics;
    timestamp: number;
  }> = [];
  private _startTime: number = Date.now();
  private readonly MAX_HISTORY = 100;

  constructor(config: MonitorConfig) {
    this._config = { ...config };
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  track(result: EvaluationResult): void {
    this._metrics.totalTracked++;

    if (result.passed) {
      this._metrics.successfulTracked++;
    } else {
      this._metrics.failedTracked++;
    }

    const prevAvg = this._metrics.averageScore;
    const n = this._metrics.totalTracked;
    this._metrics.averageScore = prevAvg + (result.score - prevAvg) / n;

    if (result.score > this._metrics.peakScore) {
      this._metrics.peakScore = result.score;
    }

    if (result.score < this._metrics.lowestScore) {
      this._metrics.lowestScore = result.score;
    }

    this.saveSnapshot();
  }

  getMetrics(): MonitorMetrics {
    return { ...this._metrics };
  }

  getHistory(): Array<{ metrics: MonitorMetrics; timestamp: number }> {
    return [...this._history];
  }

  getStatus(): MonitorStatus {
    return {
      isActive: true,
      lastTrackTime: this._history.length > 0 ? this._history[this._history.length - 1].timestamp : undefined,
      uptime: Date.now() - this._startTime,
    };
  }

  getSnapshot(): { metrics: MonitorMetrics } {
    return {
      metrics: this.getMetrics(),
    };
  }

  reset(): void {
    this._metrics = {
      totalTracked: 0,
      successfulTracked: 0,
      failedTracked: 0,
      averageScore: 0,
      peakScore: 0,
      lowestScore: 1,
    };
    this._history = [];
    this._startTime = Date.now();
  }

  getReport(): string {
    return [
      `=== Evaluator Monitor Report ===`,
      `Name: ${this._config.name}`,
      `Version: ${this._config.version}`,
      `Retention Period: ${this._config.retentionPeriod}ms`,
      `Sampling Rate: ${this._config.samplingRate}`,
      `Alert Threshold: ${this._config.alertThreshold}`,
      `Total Tracked: ${this._metrics.totalTracked}`,
      `Successful: ${this._metrics.successfulTracked}`,
      `Failed: ${this._metrics.failedTracked}`,
      `Average Score: ${this._metrics.averageScore.toFixed(4)}`,
      `Peak Score: ${this._metrics.peakScore.toFixed(4)}`,
      `Lowest Score: ${this._metrics.lowestScore.toFixed(4)}`,
      `Uptime: ${(Date.now() - this._startTime).toFixed(0)}ms`,
    ].join("\n");
  }

  exportMetrics(): { version: string } {
    return {
      version: "1.33.0",
    };
  }

  private saveSnapshot(): void {
    this._history.push({
      metrics: { ...this._metrics },
      timestamp: Date.now(),
    });

    if (this._history.length > this.MAX_HISTORY) {
      this._history.shift();
    }
  }
}
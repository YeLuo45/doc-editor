/**
 * V123 Decoder Monitor - Monitors and tracks decoding operations
 */

import { DecoderExecutor, ExecutionResult } from './DecoderExecutor';

export type MonitorConfig = {
  maxHistorySize?: number;
  trackingInterval?: number;
  alertThreshold?: number;
};

export interface MonitorMetrics {
  totalTracked: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  peakDuration: number;
  lastUpdate: number;
}

export interface MonitorSnapshot {
  config: MonitorConfig;
  metrics: MonitorMetrics;
  trackedDecoders: string[];
}

interface TrackedEntry {
  timestamp: number;
  result: ExecutionResult;
  decoderName: string;
}

export class DecoderMonitor {
  private _executor: DecoderExecutor;
  private _config: MonitorConfig;
  private _history: TrackedEntry[];
  private _metrics: MonitorMetrics;
  private _trackedDecoders: Set<string>;
  private _status: 'idle' | 'tracking' | 'paused';

  constructor(executor: DecoderExecutor, config: MonitorConfig = {}) {
    this._executor = executor;
    this._config = { maxHistorySize: 1000, trackingInterval: 100, alertThreshold: 5000, ...config };
    this._history = [];
    this._trackedDecoders = new Set();
    this._status = 'idle';
    this._metrics = this._initMetrics();
  }

  private _initMetrics(): MonitorMetrics {
    return { totalTracked: 0, successCount: 0, failureCount: 0, averageDuration: 0, peakDuration: 0, lastUpdate: 0 };
  }

  get config(): MonitorConfig { return { ...this._config }; }
  get metrics(): MonitorMetrics { return { ...this._metrics }; }
  get status(): 'idle' | 'tracking' | 'paused' { return this._status; }
  get history(): TrackedEntry[] { return [...this._history]; }

  track(decoderName: string, result: ExecutionResult): void {
    if (this._status === 'paused') { return; }
    this._status = 'tracking';
    this._trackedDecoders.add(decoderName);
    const entry: TrackedEntry = { timestamp: Date.now(), result, decoderName };
    this._history.push(entry);
    this._trimHistory();
    this._updateMetrics(entry);
    this._status = 'idle';
  }

  trackResult(result: ExecutionResult): void { this.track(result.decoderName, result); }

  private _trimHistory(): void {
    const maxSize = this._config.maxHistorySize ?? 1000;
    if (this._history.length > maxSize) { this._history = this._history.slice(-maxSize); }
  }

  private _updateMetrics(entry: TrackedEntry): void {
    const { result } = entry;
    this._metrics.totalTracked++;
    this._metrics.lastUpdate = entry.timestamp;
    if (result.success) { this._metrics.successCount++; }
    else { this._metrics.failureCount++; }
    if (result.duration > this._metrics.peakDuration) { this._metrics.peakDuration = result.duration; }
    const totalDuration = this._metrics.averageDuration * (this._metrics.totalTracked - 1);
    this._metrics.averageDuration = (totalDuration + result.duration) / this._metrics.totalTracked;
  }

  getMetrics(): MonitorMetrics { return { ...this._metrics }; }
  getHistory(limit?: number): TrackedEntry[] { return limit ? this._history.slice(-limit) : [...this._history]; }
  getHistoryByDecoder(decoderName: string): TrackedEntry[] { return this._history.filter(e => e.decoderName === decoderName); }

  getStatus(): { status: string; metrics: MonitorMetrics; trackedDecoders: string[] } {
    return { status: this._status, metrics: { ...this._metrics }, trackedDecoders: Array.from(this._trackedDecoders) };
  }

  pause(): void { this._status = 'paused'; }
  resume(): void { this._status = 'idle'; }

  getSnapshot(): { metrics: MonitorSnapshot } {
    return { metrics: { config: this.config, metrics: { ...this._metrics }, trackedDecoders: Array.from(this._trackedDecoders) } };
  }

  reset(): void { this._history = []; this._metrics = this._initMetrics(); this._trackedDecoders.clear(); this._status = 'idle'; }

  getReport(): string {
    const { totalTracked, successCount, failureCount, averageDuration, peakDuration, lastUpdate } = this._metrics;
    const successRate = totalTracked > 0 ? ((successCount / totalTracked) * 100).toFixed(2) : '0.00';
    return [
      '=== Decoder Monitor Report ===',
      `Status: ${this._status.toUpperCase()}`,
      `Tracked: ${totalTracked} | Success: ${successCount} (${successRate}%) | Failed: ${failureCount}`,
      `Avg: ${averageDuration.toFixed(2)}ms | Peak: ${peakDuration.toFixed(2)}ms`,
      `Last: ${lastUpdate ? new Date(lastUpdate).toISOString() : 'N/A'} | Decoders: ${this._trackedDecoders.size}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: '1.2.3', monitor: { metrics: { ...this._metrics }, trackedDecoders: Array.from(this._trackedDecoders), historySize: this._history.length } };
  }

  updateConfig(config: Partial<MonitorConfig>): void { this._config = { ...this._config, ...config }; }
  clearHistory(): void { this._history = []; }
}
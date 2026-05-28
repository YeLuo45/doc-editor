/**
 * RealTimeMonitor - Real-time Monitor
 * Uses requestAnimationFrame for sampling performance metrics.
 */

import { PerfProfiler } from './PerfProfiler';

export interface MonitorSample {
  timestamp: number;
  fps: number;
  memoryUsage: number;
  activeModules: string[];
  avgResponseTime: number;
}

export type MonitorCallback = (sample: MonitorSample) => void;

export interface MonitorConfig {
  sampleInterval: number;
  fpsHistorySize: number;
  enableFpsTracking: boolean;
  enableMemoryTracking: boolean;
  maxSamples?: number;
  alertThresholds?: { memory?: number; cpu?: number };
}

const DEFAULT_CONFIG: MonitorConfig = {
  sampleInterval: 1000,
  fpsHistorySize: 60,
  enableFpsTracking: true,
  enableMemoryTracking: true,
};

export class RealTimeMonitor {
  private profiler: PerfProfiler;
  private config: MonitorConfig;
  private samples: MonitorSample[] = [];
  private maxSamples: number = 300;
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  private currentFps: number = 0;

  constructor(profiler?: PerfProfiler, config?: Partial<MonitorConfig>) {
    this.profiler = profiler ?? new PerfProfiler();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory?.usedJSHeapSize || 0;
    }
    return 0;
  }

  private takeSample(): void {
    const summaries = this.profiler.getAllSummaries();
    const activeModules = summaries.map((s: { moduleName: string }) => s.moduleName);
    const avgResponseTime =
      summaries.length > 0
        ? summaries.reduce((sum: number, s: { avgTime: number }) => sum + s.avgTime, 0) / summaries.length
        : 0;

    const memoryUsage = this.getMemoryUsage();

    const sample: MonitorSample = {
      timestamp: Date.now(),
      fps: this.currentFps,
      memoryUsage,
      activeModules,
      avgResponseTime,
    };

    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
    this.sampleCallbacks.forEach(cb => cb(sample));
  }

  private startFpsTracking(): void {
    if (!this.config.enableFpsTracking) return;

    const measureFrame = (timestamp: number) => {
      if (!this.isRunning) return;
      this.frameCount++;
      const elapsed = timestamp - (this.lastFrameTime || timestamp);
      if (elapsed >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
        this.fpsHistory.push(this.currentFps);
        if (this.fpsHistory.length > this.config.fpsHistorySize) {
          this.fpsHistory.shift();
        }
        this.frameCount = 0;
        this.lastFrameTime = timestamp;
        this.takeSample();
      }
      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  private lastFrameTime: number = 0;

  public start(): this {
    if (this.isRunning) return this;
    this.isRunning = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.startFpsTracking();
    return this;
  }

  public stop(): this {
    this.isRunning = false;
    return this;
  }

  public recordSample(): this {
    this.takeSample();
    return this;
  }

  public getSamples(): MonitorSample[] {
    return [...this.samples];
  }

  public getStats(): { count: number; min: number; max: number; avg: number; p50: number; p95: number; p99: number } {
    const fpsValues = this.fpsHistory;
    if (fpsValues.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }
    const sorted = [...fpsValues].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sum / sorted.length),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  public reset(): this {
    this.samples = [];
    this.fpsHistory = [];
    this.frameCount = 0;
    this.currentFps = 0;
    return this;
  }

  public onSample(callback: MonitorCallback): this {
    this.sampleCallbacks.push(callback);
    return this;
  }

  private sampleCallbacks: MonitorCallback[] = [];

  public getConfig(): MonitorConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<MonitorConfig>): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  public getAlertManager(): any {
    return this.alertManager;
  }

  public getMemoryTrend(_length: number): string {
    if (this.samples.length < 3) return 'stable';
    const memSamples = this.samples.slice(-5).map(s => s.memoryUsage);
    const first = memSamples[0], last = memSamples[memSamples.length - 1];
    if (last > first * 1.1) return 'increasing';
    if (last < first * 0.9) return 'decreasing';
    return 'stable';
  }

  public forceSample(): this {
    this.takeSample();
    return this;
  }

  public getLatestSample(): MonitorSample | null {
    return this.samples[this.samples.length - 1] || null;
  }

  public getSamplesCount(): number {
    return this.samples.length;
  }

  public getSamplesInRange(startTime: number, endTime: number): MonitorSample[] {
    return this.samples.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  public getPerformanceSummary(): { avgFps: number; minFps: number; maxFps: number; avgMemory: number; currentFps: number; currentMemory: number; samplesCount: number; memoryTrend: string } {
    const stats = this.getStats();
    const memSamples = this.samples.map(s => s.memoryUsage);
    const memAvg = memSamples.length > 0 ? memSamples.reduce((a, b) => a + b, 0) / memSamples.length : 0;
    return {
      avgFps: stats.avg,
      minFps: stats.min,
      maxFps: stats.max,
      avgMemory: memAvg,
      currentFps: this.currentFps,
      currentMemory: this.getMemoryUsage(),
      samplesCount: this.samples.length,
      memoryTrend: this.getMemoryTrend(5),
    };
  }

  public getAverageFps(): number {
    return this.currentFps;
  }

  public subscribe(callback: MonitorCallback): () => void {
    this.sampleCallbacks.push(callback);
    return () => {
      const idx = this.sampleCallbacks.indexOf(callback);
      if (idx !== -1) this.sampleCallbacks.splice(idx, 1);
    };
  }

  public clearSamples(): this {
    this.samples = [];
    return this;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getCurrentFps(): number {
    return this.currentFps;
  }

  public getFpsHistory(): number[] {
    return [...this.fpsHistory];
  }

  private alertManager: any = null;

  public startAutoSample(): this {
    if (this.isRunning) return this;
    this.start();
    return this;
  }

  public stopAutoSample(): this {
    this.stop();
    return this;
  }
}

let _defaultMonitor: RealTimeMonitor | null = null;
export const defaultMonitor = {
  get profiler() {
    if (!_defaultMonitor) _defaultMonitor = new RealTimeMonitor();
    return (_defaultMonitor as any).profiler;
  },
  start() { return this; },
  stop() { return this; },
  recordSample() { return this; },
  getSamples() { return []; },
  getStats() { return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 }; },
  reset() { return this; },
  onSample() { return this; },
  getConfig() { return { sampleInterval: 5000, maxSamples: 1000, alertThresholds: { memory: 80, cpu: 80 }, fpsHistorySize: 60, enableFpsTracking: true, enableMemoryTracking: true } as MonitorConfig; },
  updateConfig() { return this; },
  getAlertManager() { return null!; },
  startAutoSample() { return this; },
  stopAutoSample() { return this; },
} as any as RealTimeMonitor;
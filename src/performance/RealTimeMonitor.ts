/**
 * RealTimeMonitor - Real-time Monitor
 * Uses requestAnimationFrame for sampling performance metrics.
 */

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
  private rafId: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callbacks: Set<MonitorCallback> = new Set();
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];
  private currentFps: number = 0;

  constructor(profiler?: PerfProfiler, config?: Partial<MonitorConfig>) {
    this.profiler = profiler ?? new PerfProfiler();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the real-time monitor
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    if (this.config.enableFpsTracking) {
      this.startFpsTracking();
    }

    this.startIntervalSampling();
  }

  /**
   * Stop the real-time monitor
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if monitor is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Start FPS tracking using requestAnimationFrame
   */
  private startFpsTracking(): void {
    const trackFrame = (currentTime: number): void => {
      if (!this.isRunning) {
        return;
      }

      this.frameCount++;
      const elapsed = currentTime - this.lastFrameTime;

      if (elapsed >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
        this.fpsHistory.push(this.currentFps);

        if (this.fpsHistory.length > this.config.fpsHistorySize) {
          this.fpsHistory = this.fpsHistory.slice(-this.config.fpsHistorySize);
        }

        this.frameCount = 0;
        this.lastFrameTime = currentTime;
      }

      this.rafId = requestAnimationFrame(trackFrame);
    };

    this.rafId = requestAnimationFrame(trackFrame);
  }

  /**
   * Start interval-based sampling
   */
  private startIntervalSampling(): void {
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.takeSample();
      }
    }, this.config.sampleInterval);
  }

  /**
   * Take a sample of current metrics
   */
  private takeSample(): void {
    const summaries = this.profiler.getAllSummaries();
    const activeModules = summaries.map((s) => s.moduleName);
    const avgResponseTime =
      summaries.length > 0
        ? summaries.reduce((sum, s) => sum + s.avgTime, 0) / summaries.length
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
      this.samples = this.samples.slice(-this.maxSamples);
    }

    this.notifyCallbacks(sample);
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
      return memInfo.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get current FPS
   */
  getCurrentFps(): number {
    return this.currentFps;
  }

  /**
   * Get FPS history
   */
  getFpsHistory(): number[] {
    return [...this.fpsHistory];
  }

  /**
   * Get average FPS over the history
   */
  getAverageFps(): number {
    if (this.fpsHistory.length === 0) {
      return 0;
    }
    return Math.round(this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length);
  }

  /**
   * Get all collected samples
   */
  getSamples(): MonitorSample[] {
    return [...this.samples];
  }

  /**
   * Get samples within a time range
   */
  getSamplesInRange(startTime: number, endTime: number): MonitorSample[] {
    return this.samples.filter((s) => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  /**
   * Get the latest sample
   */
  getLatestSample(): MonitorSample | null {
    return this.samples.length > 0 ? this.samples[this.samples.length - 1] : null;
  }

  /**
   * Get samples count
   */
  getSamplesCount(): number {
    return this.samples.length;
  }

  /**
   * Register a callback for sample updates
   */
  subscribe(callback: MonitorCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Notify all callbacks of a new sample
   */
  private notifyCallbacks(sample: MonitorSample): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(sample);
      } catch {
        // Ignore callback errors
      }
    });
  }

  /**
   * Clear all samples
   */
  clearSamples(): void {
    this.samples = [];
    this.fpsHistory = [];
    this.currentFps = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitorConfig {
    return { ...this.config };
  }

  /**
   * Force a sample (useful for testing)
   */
  forceSample(): void {
    this.takeSample();
  }

  /**
   * Get memory trend (last N samples)
   */
  getMemoryTrend(count: number = 10): 'increasing' | 'decreasing' | 'stable' {
    const recent = this.samples.slice(-count);
    if (recent.length < 2) {
      return 'stable';
    }

    const first = recent[0].memoryUsage;
    const last = recent[recent.length - 1].memoryUsage;
    const diff = last - first;
    const threshold = first * 0.1; // 10% change threshold

    if (diff > threshold) {
      return 'increasing';
    }
    if (diff < -threshold) {
      return 'decreasing';
    }
    return 'stable';
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    avgFps: number;
    minFps: number;
    maxFps: number;
    avgMemory: number;
    currentFps: number;
    currentMemory: number;
    samplesCount: number;
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    const minFps = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0;
    const maxFps = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0;
    const avgMemory =
      this.samples.length > 0
        ? this.samples.reduce((sum, s) => sum + s.memoryUsage, 0) / this.samples.length
        : 0;

    return {
      avgFps: this.getAverageFps(),
      minFps,
      maxFps,
      avgMemory,
      currentFps: this.currentFps,
      currentMemory: this.getMemoryUsage(),
      samplesCount: this.samples.length,
      memoryTrend: this.getMemoryTrend(),
    };
  }
}

let _defaultMonitor: RealTimeMonitor | null = null;
export const defaultMonitor: RealTimeMonitor = {
  get profiler() {
    if (!_defaultMonitor) _defaultMonitor = new RealTimeMonitor();
    return _defaultMonitor.profiler;
  },
  start() { return this; },
  stop() { return this; },
  recordSample() { return this; },
  getSamples() { return []; },
  getStats() { return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 }; },
  reset() { return this; },
  onSample() { return this; },
  getConfig() { return { sampleInterval: 5000, maxSamples: 1000, alertThresholds: { memory: 80, cpu: 80 } }; },
  updateConfig() { return this; },
  getAlertManager() { return null!; },
  startAutoSample() { return this; },
  stopAutoSample() { return this; },
};
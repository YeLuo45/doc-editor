export type TimeoutConfig = {
  defaultTimeout: number;
  maxTimeout: number;
  minTimeout: number;
  cleanupInterval: number;
  enableAutoCleanup: boolean;
};

export type TimeoutEntry = {
  id: string;
  callback: () => void;
  duration: number;
  startTime: number;
  endTime: number;
  state: 'pending' | 'running' | 'completed' | 'cancelled';
};

export type TimeoutMetrics = {
  totalTimeouts: number;
  activeTimeouts: number;
  completedTimeouts: number;
  cancelledTimeouts: number;
  averageDuration: number;
  totalDuration: number;
};

const DEFAULT_CONFIG: TimeoutConfig = {
  defaultTimeout: 5000,
  maxTimeout: 300000,
  minTimeout: 100,
  cleanupInterval: 30000,
  enableAutoCleanup: true,
};

export class TimeoutManager {
  private timeouts: Map<string, TimeoutEntry> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private config: TimeoutConfig;
  private metrics: TimeoutMetrics;

  constructor(config: Partial<TimeoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalTimeouts: 0,
      activeTimeouts: 0,
      completedTimeouts: 0,
      cancelledTimeouts: 0,
      averageDuration: 0,
      totalDuration: 0,
    };
  }

  set(id: string, callback: () => void, duration?: number): void {
    const actualDuration = Math.max(
      this.config.minTimeout,
      Math.min(duration ?? this.config.defaultTimeout, this.config.maxTimeout)
    );

    this.clear(id);

    const now = Date.now();
    const entry: TimeoutEntry = {
      id,
      callback,
      duration: actualDuration,
      startTime: now,
      endTime: now + actualDuration,
      state: 'pending',
    };

    this.timeouts.set(id, entry);
    this.metrics.totalTimeouts++;
    this.metrics.activeTimeouts++;

    const timer = setTimeout(() => {
      this.executeTimeout(id);
    }, actualDuration);

    this.timers.set(id, timer);
  }

  clear(id: string): boolean {
    const existing = this.timeouts.get(id);
    if (!existing) return false;

    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    if (existing.state === 'pending') {
      this.metrics.activeTimeouts--;
      this.metrics.cancelledTimeouts++;
    }

    this.timeouts.delete(id);
    return true;
  }

  getTimeout(id: string): TimeoutEntry | undefined {
    return this.timeouts.get(id);
  }

  getActiveTimeouts(): TimeoutEntry[] {
    return Array.from(this.timeouts.values()).filter(t => t.state === 'pending');
  }

  private executeTimeout(id: string): void {
    const entry = this.timeouts.get(id);
    if (!entry) return;

    entry.state = 'running';
    this.metrics.activeTimeouts--;

    try {
      entry.callback();
      entry.state = 'completed';
      this.metrics.completedTimeouts++;
      this.metrics.totalDuration += entry.duration;
      this.metrics.averageDuration = this.metrics.totalDuration / this.metrics.completedTimeouts;
    } catch (error) {
      entry.state = 'completed';
      this.metrics.completedTimeouts++;
    }

    this.timers.delete(id);
  }

  getSnapshot(): { metrics: TimeoutMetrics } {
    return {
      metrics: { ...this.metrics },
    };
  }

  reset(): void {
    for (const [id, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timeouts.clear();
    this.timers.clear();
    this.metrics = {
      totalTimeouts: 0,
      activeTimeouts: 0,
      completedTimeouts: 0,
      cancelledTimeouts: 0,
      averageDuration: 0,
      totalDuration: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `TimeoutManager Report:
  Total Timeouts: ${snapshot.metrics.totalTimeouts}
  Active: ${snapshot.metrics.activeTimeouts}
  Completed: ${snapshot.metrics.completedTimeouts}
  Cancelled: ${snapshot.metrics.cancelledTimeouts}
  Average Duration: ${snapshot.metrics.averageDuration.toFixed(2)}ms`;
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}
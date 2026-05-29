/**
 * SyncScheduler.ts - V90 Sync Scheduler
 * Provides scheduled sync operations with cron-like scheduling
 */

export type ScheduleFrequency = 'once' | 'minute' | 'hourly' | 'daily' | 'weekly';
export type ScheduleStatus = 'pending' | 'running' | 'paused' | 'cancelled' | 'completed';

export interface ScheduledSync {
  id: string;
  name: string;
  frequency: ScheduleFrequency;
  interval?: number;
  nextRunAt: number;
  lastRunAt?: number;
  status: ScheduleStatus;
  config: SyncScheduleConfig;
  runCount: number;
  metadata?: Record<string, unknown>;
}

export interface SyncScheduleConfig {
  direction: 'push' | 'pull' | 'bidirectional';
  retryOnFailure: boolean;
  maxRetries: number;
  enableNotifications: boolean;
  startDelay?: number;
}

export interface ScheduleConflict {
  id: string;
  scheduleId: string;
  conflictAt: number;
  resolved: boolean;
}

interface SchedulerMetrics {
  scheduledCount: number;
  executedCount: number;
  cancelledCount: number;
  failureCount: number;
  resetAt: number;
}

export class SyncScheduler {
  readonly config: SyncScheduleConfig;
  private readonly schedules: Map<string, ScheduledSync> = new Map();
  private readonly conflictLog: ScheduleConflict[] = [];
  private metrics: SchedulerMetrics = {
    scheduledCount: 0,
    executedCount: 0,
    cancelledCount: 0,
    failureCount: 0,
    resetAt: 0,
  };

  constructor(config: Partial<SyncScheduleConfig> = {}) {
    this.config = {
      direction: config.direction ?? 'bidirectional',
      retryOnFailure: config.retryOnFailure ?? true,
      maxRetries: config.maxRetries ?? 3,
      enableNotifications: config.enableNotifications ?? true,
      startDelay: config.startDelay ?? 0,
    };
  }

  schedule(
    name: string,
    frequency: ScheduleFrequency,
    options?: { interval?: number; config?: Partial<SyncScheduleConfig>; metadata?: Record<string, unknown> }
  ): ScheduledSync {
    const id = `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const intervalMs = this.frequencyToMs(frequency, options?.interval);

    const sync: ScheduledSync = {
      id,
      name,
      frequency,
      interval: options?.interval,
      nextRunAt: Date.now() + intervalMs + (this.config.startDelay ?? 0),
      status: 'pending',
      config: { ...this.config, ...options?.config },
      runCount: 0,
      metadata: options?.metadata,
    };

    this.schedules.set(id, sync);
    this.metrics.scheduledCount++;
    return sync;
  }

  cancel(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    schedule.status = 'cancelled';
    this.metrics.cancelledCount++;
    return true;
  }

  getScheduled(filter?: { status?: ScheduleStatus; frequency?: ScheduleFrequency }): ScheduledSync[] {
    let result = Array.from(this.schedules.values());

    if (filter?.status) {
      result = result.filter((s) => s.status === filter.status);
    }
    if (filter?.frequency) {
      result = result.filter((s) => s.frequency === filter.frequency);
    }

    return result;
  }

  getHistory(limit?: number): ScheduledSync[] {
    const completed = Array.from(this.schedules.values())
      .filter((s) => s.status === 'completed' || s.status === 'cancelled')
      .sort((a, b) => b.lastRunAt! - a.lastRunAt!);

    return limit ? completed.slice(0, limit) : completed;
  }

  execute(scheduleId: string): Promise<{ success: boolean; executedAt: number }> {
    return new Promise((resolve) => {
      const schedule = this.schedules.get(scheduleId);
      if (!schedule) {
        resolve({ success: false, executedAt: 0 });
        return;
      }

      schedule.status = 'running';
      schedule.lastRunAt = Date.now();
      schedule.runCount++;

      setTimeout(() => {
        const success = Math.random() > 0.1;
        if (success) {
          schedule.status = 'completed';
          this.metrics.executedCount++;
        } else {
          schedule.status = schedule.runCount >= schedule.config.maxRetries ? 'cancelled' : 'pending';
          this.metrics.failureCount++;
        }
        resolve({ success, executedAt: Date.now() });
      }, 100);
    });
  }

  getSnapshot(): { metrics: SchedulerMetrics; activeSchedules: number; pendingCount: number } {
    const pending = Array.from(this.schedules.values()).filter((s) => s.status === 'pending');
    return {
      metrics: { ...this.metrics },
      activeSchedules: this.schedules.size,
      pendingCount: pending.length,
    };
  }

  reset(): void {
    this.schedules.clear();
    this.conflictLog.length = 0;
    this.metrics = {
      scheduledCount: 0,
      executedCount: 0,
      cancelledCount: 0,
      failureCount: 0,
      resetAt: Date.now(),
    };
  }

  getReport(): string {
    return JSON.stringify({
      config: this.config,
      metrics: this.metrics,
      schedules: Array.from(this.schedules.values()),
      conflictLog: this.conflictLog,
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V90',
    };
  }

  private frequencyToMs(frequency: ScheduleFrequency, customInterval?: number): number {
    switch (frequency) {
      case 'once': return customInterval ?? 0;
      case 'minute': return customInterval ?? 60000;
      case 'hourly': return customInterval ?? 3600000;
      case 'daily': return customInterval ?? 86400000;
      case 'weekly': return customInterval ?? 604800000;
    }
  }
}
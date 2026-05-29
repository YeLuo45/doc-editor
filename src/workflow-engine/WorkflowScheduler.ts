/**
 * V65 Workflow Engine - WorkflowScheduler
 * Schedule workflows with schedule/cancel/getScheduled/getHistory
 */

import { WorkflowDefinition } from './WorkflowBuilder.js';

export interface ScheduledWorkflow {
  id: string;
  workflow: WorkflowDefinition;
  scheduledAt: Date;
  scheduledFor: Date;
  recurring: boolean;
  intervalMs?: number;
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'cancelled';
  lastRun?: Date;
  nextRun?: Date;
}

export interface ScheduleConfig {
  maxScheduled: number;
  defaultDelay: number;
  enableRecurring: boolean;
  timezone: string;
}

type SchedConfig = Required<ScheduleConfig>;

export class WorkflowScheduler {
  private _config: SchedConfig;
  private scheduled: Map<string, ScheduledWorkflow>;
  private history: ScheduledWorkflow[];

  constructor(config: Partial<ScheduleConfig> = {}) {
    this._config = {
      maxScheduled: config.maxScheduled ?? 50,
      defaultDelay: config.defaultDelay ?? 5000,
      enableRecurring: config.enableRecurring ?? true,
      timezone: config.timezone ?? 'UTC',
    };
    this.scheduled = new Map();
    this.history = [];
  }

  get config(): SchedConfig {
    return { ...this._config };
  }

  schedule(workflow: WorkflowDefinition, delayMs?: number): string {
    if (this.scheduled.size >= this._config.maxScheduled) {
      throw new Error('Maximum scheduled workflows reached');
    }

    const scheduleId = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();
    const scheduledFor = new Date(now.getTime() + (delayMs ?? this._config.defaultDelay));

    const entry: ScheduledWorkflow = {
      id: scheduleId,
      workflow,
      scheduledAt: now,
      scheduledFor,
      recurring: false,
      status: 'pending',
    };

    this.scheduled.set(scheduleId, entry);
    return scheduleId;
  }

  scheduleRecurring(workflow: WorkflowDefinition, intervalMs: number): string {
    if (!this._config.enableRecurring) {
      throw new Error('Recurring schedules not enabled');
    }

    const scheduleId = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();

    const entry: ScheduledWorkflow = {
      id: scheduleId,
      workflow,
      scheduledAt: now,
      scheduledFor: now,
      recurring: true,
      intervalMs,
      status: 'scheduled',
      nextRun: new Date(now.getTime() + intervalMs),
    };

    this.scheduled.set(scheduleId, entry);
    return scheduleId;
  }

  cancel(scheduleId: string): boolean {
    const entry = this.scheduled.get(scheduleId);
    if (entry && entry.status !== 'cancelled') {
      entry.status = 'cancelled';
      this.history.push(entry);
      this.scheduled.delete(scheduleId);
      return true;
    }
    return false;
  }

  getScheduled(): ScheduledWorkflow[] {
    return Array.from(this.scheduled.values()).filter((e) => e.status === 'scheduled');
  }

  getHistory(limit = 50): ScheduledWorkflow[] {
    return this.history.slice(-limit);
  }

  getSnapshot(): { metrics: { totalScheduled: number; recurring: number; pending: number } } {
    let recurring = 0;
    let pending = 0;
    this.scheduled.forEach((e) => {
      if (e.recurring) recurring++;
      if (e.status === 'pending') pending++;
    });
    return {
      metrics: {
        totalScheduled: this.scheduled.size,
        recurring,
        pending,
      },
    };
  }

  reset(): void {
    this.scheduled.clear();
    this.history = [];
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return `WorkflowScheduler Report: ${snap.metrics.totalScheduled} scheduled, ${snap.metrics.recurring} recurring, ${snap.metrics.pending} pending`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}

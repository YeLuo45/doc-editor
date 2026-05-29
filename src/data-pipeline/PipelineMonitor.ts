/**
 * V66 Data Pipeline - PipelineMonitor
 * Monitor pipeline execution with track/getMetrics/getRunning/getHistory
 */

export type MonitorConfig = {
  interval?: number;
  maxHistory?: number;
  enableLogging?: boolean;
};

export type PipelineMetrics = {
  pipelineId: string;
  name: string;
  status: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  stageCount: number;
  completedStages: number;
};

export type TrackedExecution = {
  id: string;
  pipelineId: string;
  metrics: PipelineMetrics;
  events: PipelineEvent[];
};

export type PipelineEvent = {
  timestamp: number;
  type: 'start' | 'stage_complete' | 'stage_fail' | 'pause' | 'resume' | 'stop' | 'complete';
  data?: unknown;
};

export class PipelineMonitor {
  config: MonitorConfig;
  private running: Map<string, TrackedExecution> = new Map();
  private history: TrackedExecution[] = [];
  private globalMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalDuration: 0,
  };

  constructor(config: MonitorConfig = {}) {
    this.config = {
      interval: config.interval || 1000,
      maxHistory: config.maxHistory || 100,
      enableLogging: config.enableLogging || false,
    };
  }

  track(pipelineId: string, name: string, stageCount: number): string {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const tracked: TrackedExecution = {
      id: executionId,
      pipelineId,
      metrics: {
        pipelineId,
        name,
        status: 'running',
        startTime: Date.now(),
        stageCount,
        completedStages: 0,
      },
      events: [{ timestamp: Date.now(), type: 'start' }],
    };

    this.running.set(executionId, tracked);
    this.globalMetrics.totalExecutions++;

    if (this.config.enableLogging) {
      console.log(`[PipelineMonitor] Tracking execution ${executionId} for pipeline ${pipelineId}`);
    }

    return executionId;
  }

  getMetrics(executionId: string): PipelineMetrics | null {
    const tracked = this.running.get(executionId) || this.history.find(h => h.id === executionId);
    return tracked?.metrics || null;
  }

  getRunning(): TrackedExecution[] {
    return Array.from(this.running.values());
  }

  getHistory(limit?: number): TrackedExecution[] {
    const sorted = [...this.history].sort((a, b) => b.metrics.startTime - a.metrics.startTime);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  completeExecution(executionId: string, status: 'completed' | 'failed'): void {
    const tracked = this.running.get(executionId);
    if (!tracked) return;

    tracked.metrics.status = status;
    tracked.metrics.endTime = Date.now();
    tracked.metrics.duration = tracked.metrics.endTime - tracked.metrics.startTime;
    tracked.events.push({ timestamp: Date.now(), type: status === 'completed' ? 'complete' : 'stage_fail' });

    this.running.delete(executionId);
    this.addToHistory(tracked);

    if (status === 'completed') {
      this.globalMetrics.successfulExecutions++;
    } else {
      this.globalMetrics.failedExecutions++;
    }
    this.globalMetrics.totalDuration += tracked.metrics.duration || 0;
  }

  addStageEvent(executionId: string, stageId: string, type: 'complete' | 'fail', data?: unknown): void {
    const tracked = this.running.get(executionId);
    if (!tracked) return;

    if (type === 'complete') {
      tracked.metrics.completedStages++;
    }

    tracked.events.push({
      timestamp: Date.now(),
      type: type === 'complete' ? 'stage_complete' : 'stage_fail',
      data: { stageId, ...data },
    });
  }

  private addToHistory(execution: TrackedExecution): void {
    this.history.unshift(execution);
    if (this.history.length > (this.config.maxHistory || 100)) {
      this.history.pop();
    }
  }

  getSnapshot(): { metrics: { running: number; history: number; total: number; successRate: number } } {
    const total = this.globalMetrics.totalExecutions;
    return {
      metrics: {
        running: this.running.size,
        history: this.history.length,
        total,
        successRate: total > 0 ? this.globalMetrics.successfulExecutions / total : 0,
      },
    };
  }

  reset(): void {
    this.running.clear();
    this.history = [];
    this.globalMetrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
    };
  }

  getReport(): string {
    const total = this.globalMetrics.totalExecutions;
    return `PipelineMonitor Report
========================
Running: ${this.running.size}
History: ${this.history.length}
TotalExecutions: ${total}
Successful: ${this.globalMetrics.successfulExecutions}
Failed: ${this.globalMetrics.failedExecutions}
SuccessRate: ${total > 0 ? (this.globalMetrics.successfulExecutions / total * 100).toFixed(2) : 0}%
AvgDuration: ${total > 0 ? (this.globalMetrics.totalDuration / total).toFixed(2) : 0}ms`;
  }

  exportMetrics(): { version: string; running: number; total: number; successRate: number } {
    const total = this.globalMetrics.totalExecutions;
    return {
      version: 'v66',
      running: this.running.size,
      total,
      successRate: total > 0 ? this.globalMetrics.successfulExecutions / total : 0,
    };
  }
}

export default PipelineMonitor;
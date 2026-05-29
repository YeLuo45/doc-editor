/**
 * PipelineRunner.ts - V92 Pipeline Runner
 * Executes pipeline stages with lifecycle control (run/stop/pause/resume)
 */

export type RunnerConfig = {
  maxExecutionTime: number;
  enableCheckpoints: boolean;
  gracefulShutdownTimeout: number;
};

export type RunnerStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'completed';

export type RunnerStats = {
  stagesCompleted: number;
  stagesFailed: number;
  totalDuration: number;
  lastCheckpoint: string | null;
};

export type RunnerSnapshot = {
  metrics: {
    status: RunnerStatus;
    stagesCompleted: number;
    stagesFailed: number;
  };
  timestamp: number;
};

export class PipelineRunner {
  config: RunnerConfig;
  private status: RunnerStatus = 'idle';
  private currentPipelineId: string | null = null;
  private stagesCompleted: number = 0;
  private stagesFailed: number = 0;
  private startTime: number = 0;
  private totalDuration: number = 0;
  private lastCheckpoint: string | null = null;
  private checkpoints: Map<string, unknown> = new Map();

  constructor(config: RunnerConfig) {
    this.config = { ...config };
  }

  run(pipelineId: string, stages: Array<() => Promise<void>>): Promise<void> {
    this.currentPipelineId = pipelineId;
    this.status = 'running';
    this.startTime = Date.now();
    this.stagesCompleted = 0;
    this.stagesFailed = 0;

    return new Promise((resolve, reject) => {
      this.executeStages(pipelineId, stages, 0)
        .then(() => {
          this.status = 'completed';
          this.totalDuration += Date.now() - this.startTime;
          resolve();
        })
        .catch((error) => {
          this.status = 'stopped';
          this.stagesFailed++;
          reject(error);
        });
    });
  }

  private async executeStages(
    pipelineId: string,
    stages: Array<() => Promise<void>>,
    index: number
  ): Promise<void> {
    if (index >= stages.length || this.status === 'stopped') return;

    if (this.status === 'paused') {
      await this.waitForResume();
    }

    if (this.config.enableCheckpoints) {
      this.checkpoints.set(`stage_${index}`, { pipelineId, stageIndex: index, timestamp: Date.now() });
      this.lastCheckpoint = `stage_${index}`;
    }

    await stages[index]();
    this.stagesCompleted++;
    await this.executeStages(pipelineId, stages, index + 1);
  }

  private async waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.status !== 'paused') {
          resolve();
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  stop(): void {
    this.status = 'stopped';
    this.totalDuration += Date.now() - this.startTime;
    this.checkpoints.clear();
  }

  pause(): boolean {
    if (this.status !== 'running') return false;
    this.status = 'paused';
    return true;
  }

  resume(): boolean {
    if (this.status !== 'paused') return false;
    this.status = 'running';
    return true;
  }

  getStatus(): RunnerStatus {
    return this.status;
  }

  getStats(): RunnerStats {
    return {
      stagesCompleted: this.stagesCompleted,
      stagesFailed: this.stagesFailed,
      totalDuration: this.totalDuration,
      lastCheckpoint: this.lastCheckpoint,
    };
  }

  getSnapshot(): RunnerSnapshot {
    return {
      metrics: {
        status: this.status,
        stagesCompleted: this.stagesCompleted,
        stagesFailed: this.stagesFailed,
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.status = 'idle';
    this.currentPipelineId = null;
    this.stagesCompleted = 0;
    this.stagesFailed = 0;
    this.startTime = 0;
    this.totalDuration = 0;
    this.lastCheckpoint = null;
    this.checkpoints.clear();
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== Pipeline Runner Report ===',
      `Status: ${snapshot.metrics.status}`,
      `Stages Completed: ${snapshot.metrics.stagesCompleted}`,
      `Stages Failed: ${snapshot.metrics.stagesFailed}`,
      `Total Duration: ${this.totalDuration}ms`,
      `Checkpoints: ${this.checkpoints.size}`,
      `Timestamp: ${new Date(snapshot.timestamp).toISOString()}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } & RunnerSnapshot['metrics'] {
    return {
      version: 'V92',
      ...this.getSnapshot().metrics,
    };
  }
}
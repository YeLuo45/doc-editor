/**
 * TelemetryExporter - V64 Telemetry System
 * Exports telemetry data to external systems
 */

export interface ExporterConfig {
  endpoint: string;
  format: 'json' | 'csv' | 'prometheus';
  interval: number;
  batchSize: number;
  enabled: boolean;
  retryAttempts: number;
  serviceName: string;
}

export interface ExportJob {
  id: string;
  scheduledAt: number;
  interval: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRun?: number;
  nextRun?: number;
}

export interface ExportResult {
  success: boolean;
  exportedAt: string;
  recordCount: number;
  format: string;
  error?: string;
}

export class TelemetryExporter {
  private scheduledJobs: Map<string, ExportJob> = new Map();
  private config: ExporterConfig;
  private exportCount: number = 0;
  private lastExportTime?: number;

  constructor(config: ExporterConfig) {
    this.config = { ...config };
    this.scheduledJobs = new Map();
    this.exportCount = 0;
  }

  /**
   * Export data to the configured endpoint
   */
  export(data: unknown): ExportResult {
    if (!this.config.enabled) {
      return {
        success: false,
        exportedAt: new Date().toISOString(),
        recordCount: 0,
        format: this.config.format,
        error: 'Exporter is disabled'
      };
    }

    try {
      const recordCount = this.countRecords(data);
      this.exportCount++;
      this.lastExportTime = Date.now();

      return {
        success: true,
        exportedAt: new Date().toISOString(),
        recordCount,
        format: this.config.format
      };
    } catch (error) {
      return {
        success: false,
        exportedAt: new Date().toISOString(),
        recordCount: 0,
        format: this.config.format,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Schedule a recurring export job
   */
  schedule(jobId: string, interval: number): ExportJob {
    const job: ExportJob = {
      id: jobId,
      scheduledAt: Date.now(),
      interval,
      status: 'pending',
      nextRun: Date.now() + interval
    };

    this.scheduledJobs.set(jobId, job);
    return job;
  }

  /**
   * Cancel a scheduled export job
   */
  cancel(jobId: string): boolean {
    const job = this.scheduledJobs.get(jobId);
    if (job) {
      this.scheduledJobs.delete(jobId);
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled jobs
   */
  getScheduled(): ExportJob[] {
    return Array.from(this.scheduledJobs.values());
  }

  /**
   * Get a snapshot of current exporter state
   */
  getSnapshot(): { exportCount: number; scheduledJobs: number; lastExportTime?: number } {
    return {
      exportCount: this.exportCount,
      scheduledJobs: this.scheduledJobs.size,
      lastExportTime: this.lastExportTime
    };
  }

  /**
   * Reset the exporter state
   */
  reset(): void {
    this.scheduledJobs.clear();
    this.exportCount = 0;
    this.lastExportTime = undefined;
  }

  /**
   * Generate a text report of exporter state
   */
  getReport(): string {
    const lines = [
      `TelemetryExporter Report`,
      `=========================`,
      `Service: ${this.config.serviceName}`,
      `Enabled: ${this.config.enabled}`,
      `Endpoint: ${this.config.endpoint}`,
      `Format: ${this.config.format}`,
      `Interval: ${this.config.interval}ms`,
      `Batch Size: ${this.config.batchSize}`,
      `Retry Attempts: ${this.config.retryAttempts}`,
      `Total Exports: ${this.exportCount}`,
      `Last Export: ${this.lastExportTime ? new Date(this.lastExportTime).toISOString() : 'Never'}`,
      `Scheduled Jobs: ${this.scheduledJobs.size}`,
      `Jobs:`
    ];

    this.scheduledJobs.forEach((job, id) => {
      lines.push(`  ${id}: status=${job.status}, interval=${job.interval}ms`);
    });

    return lines.join('\n');
  }

  /**
   * Export metrics in a standardized format
   */
  exportMetrics(): { version: string; exportedAt: string; exportCount: number; scheduledJobs: number } {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportCount: this.exportCount,
      scheduledJobs: this.scheduledJobs.size
    };
  }

  private countRecords(data: unknown): number {
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object' && data !== null) return Object.keys(data).length;
    return 1;
  }
}
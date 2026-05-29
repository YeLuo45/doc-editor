/**
 * MetricsExporter.ts
 * V76 Metrics Exporter - Exports metrics to various destinations
 * Supports scheduled exports, one-time exports, and export cancellation
 */

export type MetricsExporterConfig = {
  name: string;
  format: 'json' | 'csv' | 'prometheus';
  destination: string;
  batchSize: number;
  tags: Record<string, string>;
};

export interface ExportJob {
  id: string;
  scheduledAt: number;
  interval?: number;
  metrics: unknown[];
  status: 'pending' | 'running' | 'completed' | 'cancelled';
}

export interface ExportResult {
  jobId: string;
  exportedAt: number;
  recordCount: number;
  destination: string;
  success: boolean;
  format: string;
}

export class MetricsExporter {
  private _config: MetricsExporterConfig;
  private _scheduledJobs: Map<string, ExportJob> = new Map();
  private _exportHistory: ExportResult[] = [];
  private _exportCount = 0;

  constructor(config: Partial<MetricsExporterConfig> = {}) {
    this._config = {
      name: config.name ?? 'default-exporter',
      format: config.format ?? 'json',
      destination: config.destination ?? 'stdout',
      batchSize: config.batchSize ?? 100,
      tags: config.tags ?? {},
    };
  }

  get config(): MetricsExporterConfig {
    return { ...this._config };
  }

  export(metrics: unknown[], format?: 'json' | 'csv' | 'prometheus'): ExportResult {
    this._exportCount++;
    const jobId = `export-${this._exportCount}-${Date.now()}`;
    const formatToUse = format ?? this._config.format;

    const output = this._formatMetrics(metrics, formatToUse);
    const result: ExportResult = {
      jobId,
      exportedAt: Date.now(),
      recordCount: Array.isArray(metrics) ? metrics.length : 0,
      destination: this._config.destination,
      success: true,
      format: formatToUse,
    };

    this._exportHistory.push(result);

    if (this._exportHistory.length > 1000) {
      this._exportHistory = this._exportHistory.slice(-500);
    }

    return result;
  }

  schedule(
    metrics: unknown[],
    intervalMs: number,
    startAt?: number
  ): ExportJob {
    const jobId = `scheduled-${Date.now()}`;
    const job: ExportJob = {
      id: jobId,
      scheduledAt: startAt ?? Date.now() + intervalMs,
      interval: intervalMs,
      metrics,
      status: 'pending',
    };

    this._scheduledJobs.set(jobId, job);
    return job;
  }

  cancel(jobId: string): boolean {
    const job = this._scheduledJobs.get(jobId);
    if (!job) return false;

    if (job.status === 'completed' || job.status === 'cancelled') {
      return false;
    }

    job.status = 'cancelled';
    this._scheduledJobs.set(jobId, job);
    return true;
  }

  getScheduled(): ExportJob[] {
    return Array.from(this._scheduledJobs.values()).filter(
      (j) => j.status === 'pending' || j.status === 'running'
    );
  }

  reset(): void {
    this._scheduledJobs.clear();
    this._exportHistory = [];
    this._exportCount = 0;
  }

  getSnapshot(): { scheduledJobs: number; exportCount: number; version: string } {
    return {
      scheduledJobs: this.getScheduled().length,
      exportCount: this._exportCount,
      version: 'V76',
    };
  }

  getReport(): string {
    const scheduled = this.getScheduled();
    const history = this._exportHistory.slice(-10);

    const lines = [
      `=== MetricsExporter Report [${this._config.name}] ===`,
      `Format: ${this._config.format}`,
      `Destination: ${this._config.destination}`,
      `Batch Size: ${this._config.batchSize}`,
      `Total Exports: ${this._exportCount}`,
      `Scheduled Jobs: ${scheduled.length}`,
      '--- Recent Exports (last 10) ---',
    ];

    for (const entry of history) {
      lines.push(
        `  ${entry.jobId}: ${entry.recordCount} records, ${entry.format}, success=${entry.success}`
      );
    }

    lines.push('=== End Report ===');
    return lines.join('\n');
  }

  exportMetrics(): { version: string; config: MetricsExporterConfig; exportCount: number } {
    return {
      version: 'V76',
      config: this._config,
      exportCount: this._exportCount,
    };
  }

  getExportHistory(): ExportResult[] {
    return [...this._exportHistory];
  }

  private _formatMetrics(metrics: unknown[], format: string): string {
    switch (format) {
      case 'json':
        return JSON.stringify({ metrics, exportedAt: Date.now() });
      case 'csv':
        if (!Array.isArray(metrics) || metrics.length === 0) return '';
        const headers = Object.keys(metrics[0] as object);
        const rows = metrics.map((m) =>
          headers.map((h) => (m as Record<string, unknown>)[h]).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
      case 'prometheus':
        if (!Array.isArray(metrics)) return '';
        return metrics
          .map((m) => {
            const obj = m as Record<string, unknown>;
            return `${obj.name}{${JSON.stringify(obj.tags)}} ${obj.value}`;
          })
          .join('\n');
      default:
        return String(metrics);
    }
  }
}
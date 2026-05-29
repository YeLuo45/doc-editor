/**
 * V67 Analytics Engine - AnalyticsExporter
 * Export analytics data in various formats
 */

export type ExportConfig = {
  format: 'json' | 'csv' | 'xml';
  destination: 'file' | 'api' | 'storage';
  compression: boolean;
  maxFileSize: number;
};

export type ScheduledExport = {
  id: string;
  config: ExportConfig;
  interval: number;
  lastRun: number;
  nextRun: number;
  active: boolean;
};

export type ExportResult = {
  success: boolean;
  path?: string;
  size?: number;
  timestamp: number;
  error?: string;
};

export class AnalyticsExporter {
  config: ExportConfig;
  private scheduledExports: Map<string, ScheduledExport> = new Map();
  private exportHistory: ExportResult[] = [];
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: ExportConfig) {
    this.config = config;
  }

  export(data: unknown): ExportResult {
    const timestamp = Date.now();
    
    try {
      const serialized = this.serializeData(data);
      const path = this.generatePath();
      
      const result: ExportResult = {
        success: true,
        path,
        size: serialized.length,
        timestamp,
      };

      this.exportHistory.push(result);
      return result;
    } catch (error) {
      const result: ExportResult = {
        success: false,
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this.exportHistory.push(result);
      return result;
    }
  }

  schedule(exportId: string, data: unknown, intervalMs: number): ScheduledExport {
    const now = Date.now();
    const scheduled: ScheduledExport = {
      id: exportId,
      config: { ...this.config },
      interval: intervalMs,
      lastRun: 0,
      nextRun: now + intervalMs,
      active: true,
    };

    this.scheduledExports.set(exportId, scheduled);
    
    const timer = setInterval(() => {
      this.executeScheduledExport(exportId, data);
    }, intervalMs);
    
    this.timers.set(exportId, timer);
    return scheduled;
  }

  cancel(exportId: string): boolean {
    const scheduled = this.scheduledExports.get(exportId);
    if (!scheduled) {
      return false;
    }

    scheduled.active = false;
    const timer = this.timers.get(exportId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(exportId);
    }
    
    return true;
  }

  getScheduled(): ScheduledExport[] {
    return Array.from(this.scheduledExports.values());
  }

  private serializeData(data: unknown): string {
    switch (this.config.format) {
      case 'json':
        return JSON.stringify(data);
      case 'csv':
        return this.toCSV(data);
      case 'xml':
        return this.toXML(data);
      default:
        return JSON.stringify(data);
    }
  }

  private toCSV(data: unknown): string {
    if (Array.isArray(data)) {
      const headers = Object.keys(data[0] || {});
      const rows = data.map(item => headers.map(h => (item as Record<string, unknown>)[h]).join(','));
      return [headers.join(','), ...rows].join('\n');
    }
    return JSON.stringify(data);
  }

  private toXML(data: unknown): string {
    const json = JSON.stringify(data);
    return `<?xml version="1.0" encoding="UTF-8"?><data>${json}</data>`;
  }

  private generatePath(): string {
    const timestamp = Date.now();
    const ext = this.config.format;
    return `export_${timestamp}.${ext}`;
  }

  private executeScheduledExport(exportId: string, data: unknown): void {
    const scheduled = this.scheduledExports.get(exportId);
    if (!scheduled || !scheduled.active) {
      return;
    }

    const result = this.export(data);
    scheduled.lastRun = Date.now();
    scheduled.nextRun = scheduled.lastRun + scheduled.interval;

    if (!result.success && scheduled.active) {
      scheduled.active = false;
      const timer = this.timers.get(exportId);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(exportId);
      }
    }
  }

  getSnapshot(): { scheduledCount: number; historyCount: number } {
    return {
      scheduledCount: this.scheduledExports.size,
      historyCount: this.exportHistory.length,
    };
  }

  reset(): void {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    this.scheduledExports.clear();
    this.exportHistory = [];
  }

  getReport(): string {
    return JSON.stringify({
      config: this.config,
      scheduled: this.getScheduled(),
      historyCount: this.exportHistory.length,
      lastExport: this.exportHistory[this.exportHistory.length - 1] || null,
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v67.0.0',
    };
  }
}
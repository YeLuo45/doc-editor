/**
 * AuditReporter.ts - Audit report generation for doc-editor V63
 * Provides reporting, summaries, and exports
 */

import { AuditLogger, AuditEntry } from './AuditLogger';
import { AuditPolicy } from './AuditPolicy';
import { AuditArchiver } from './AuditArchiver';

export interface ReportConfig {
  title?: string;
  includeArchived?: boolean;
  dateFormat?: string;
  maxDetailEntries?: number;
}

export interface AuditReport {
  id: string;
  title: string;
  generatedAt: Date;
  period?: { start: Date; end: Date };
  summary: ReportSummary;
  entries: AuditEntry[];
  policies: ReportPolicy[];
  archives: ReportArchive[];
}

export interface ReportSummary {
  totalEntries: number;
  entriesByLevel: Record<string, number>;
  entriesByAction: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  topResources: Array<{ resourceType: string; count: number }>;
}

export interface ReportPolicy {
  id: string;
  name: string;
  effect: string;
  enabled: boolean;
  evaluationCount: number;
}

export interface ReportArchive {
  id: string;
  name: string;
  entryCount: number;
  sizeBytes: number;
  createdAt: Date;
}

interface ReporterSnapshot {
  metrics: {
    totalReportsGenerated: number;
    totalExports: number;
    reportsByType: Record<string, number>;
    lastReportDate?: string;
    averageReportSize: number;
  };
}

const DEFAULT_CONFIG: ReportConfig = {
  title: 'Audit Report',
  includeArchived: true,
  dateFormat: 'YYYY-MM-DD HH:mm:ss',
  maxDetailEntries: 100,
};

export class AuditReporter {
  private _config: ReportConfig;
  private reports: AuditReport[] = [];
  private metrics: ReporterSnapshot['metrics'] = {
    totalReportsGenerated: 0,
    totalExports: 0,
    reportsByType: {},
    lastReportDate: undefined,
    averageReportSize: 0,
  };

  constructor(config: ReportConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get config(): ReportConfig {
    return { ...this._config };
  }

  private generateId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  generate(
    logger: AuditLogger,
    policy: AuditPolicy,
    archiver: AuditArchiver,
    options?: { startDate?: Date; endDate?: Date; title?: string }
  ): AuditReport {
    const id = this.generateId();
    const now = new Date();
    const startDate = options?.startDate;
    const endDate = options?.endDate;

    // Get entries within date range
    let entries = logger.query({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    // Get summary statistics
    const summary = this.buildSummary(entries);

    // Get policy information
    const policies = this.buildPolicyReport(policy);

    // Get archive information
    const archives = this.buildArchiveReport(archiver);

    const report: AuditReport = {
      id,
      title: options?.title || this._config.title || 'Audit Report',
      generatedAt: now,
      period: startDate && endDate ? { start: startDate, end: endDate } : undefined,
      summary,
      entries: entries.slice(0, this._config.maxDetailEntries),
      policies,
      archives,
    };

    this.reports.push(report);
    this.metrics.totalReportsGenerated++;
    this.metrics.lastReportDate = now.toISOString();
    this.metrics.reportsByType['standard'] = (this.metrics.reportsByType['standard'] || 0) + 1;
    this.updateAverageReportSize(report);

    return report;
  }

  private buildSummary(entries: AuditEntry[]): ReportSummary {
    const entriesByLevel: Record<string, number> = {};
    const entriesByAction: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    const resourceCounts: Record<string, number> = {};

    for (const entry of entries) {
      entriesByLevel[entry.level] = (entriesByLevel[entry.level] || 0) + 1;
      entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
      if (entry.userId) {
        userCounts[entry.userId] = (userCounts[entry.userId] || 0) + 1;
      }
      if (entry.resourceType) {
        resourceCounts[entry.resourceType] = (resourceCounts[entry.resourceType] || 0) + 1;
      }
    }

    const topUsers = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count }));

    const topResources = Object.entries(resourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([resourceType, count]) => ({ resourceType, count }));

    return {
      totalEntries: entries.length,
      entriesByLevel,
      entriesByAction,
      topUsers,
      topResources,
    };
  }

  private buildPolicyReport(policy: AuditPolicy): ReportPolicy[] {
    const rules = policy.getRules();
    return rules.slice(0, 20).map((rule) => ({
      id: rule.id,
      name: rule.name,
      effect: rule.effect,
      enabled: rule.enabled,
      evaluationCount: 0,
    }));
  }

  private buildArchiveReport(archiver: AuditArchiver): ReportArchive[] {
    return archiver.getArchives().map((archive) => ({
      id: archive.id,
      name: archive.name,
      entryCount: archive.entryCount,
      sizeBytes: archive.sizeBytes,
      createdAt: archive.createdAt,
    }));
  }

  private updateAverageReportSize(report: AuditReport): void {
    const totalSize = JSON.stringify(report).length;
    const currentTotal = this.metrics.averageReportSize * (this.reports.length - 1);
    this.metrics.averageReportSize = (currentTotal + totalSize) / this.reports.length;
  }

  summary(reportId: string): string {
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) return 'Report not found';

    return [
      `Report: ${report.title}`,
      `Generated: ${report.generatedAt.toISOString()}`,
      `Total Entries: ${report.summary.totalEntries}`,
      `Top Level: ${Object.entries(report.summary.entriesByLevel).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}`,
      `Top Action: ${Object.entries(report.summary.entriesByAction).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}`,
      `Archives: ${report.archives.length}`,
      `Policies: ${report.policies.length}`,
    ].join('\n');
  }

  export(reportId: string, format: 'json' | 'csv' | 'text' = 'json'): string {
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) return '';

    this.metrics.totalExports++;
    this.metrics.reportsByType[format] = (this.metrics.reportsByType[format] || 0) + 1;

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.toCSV(report);
      case 'text':
        return this.toText(report);
      default:
        return JSON.stringify(report);
    }
  }

  private toCSV(report: AuditReport): string {
    const headers = ['Timestamp', 'Level', 'Action', 'User ID', 'Resource Type', 'Resource ID'];
    const rows = report.entries.map((e) =>
      [
        e.timestamp.toISOString(),
        e.level,
        e.action,
        e.userId || '',
        e.resourceType || '',
        e.resourceId || '',
      ].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  private toText(report: AuditReport): string {
    return [
      `=== ${report.title} ===`,
      `Generated: ${report.generatedAt.toISOString()}`,
      `Total Entries: ${report.summary.totalEntries}`,
      '',
      'Top 5 Actions:',
      ...Object.entries(report.summary.entriesByAction)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => `  ${action}: ${count}`),
      '',
      'Top 5 Users:',
      ...report.summary.topUsers.map((u) => `  ${u.userId}: ${u.count}`),
    ].join('\n');
  }

  getReport(reportId: string): AuditReport | undefined {
    return this.reports.find((r) => r.id === reportId);
  }

  getSnapshot(): ReporterSnapshot {
    return {
      metrics: { ...this.metrics },
    };
  }

  reset(): void {
    this.reports = [];
    this.metrics = {
      totalReportsGenerated: 0,
      totalExports: 0,
      reportsByType: {},
      lastReportDate: undefined,
      averageReportSize: 0,
    };
  }

  getStatus(): string {
    const lines = [
      '=== Audit Reporter Status ===',
      `Total Reports Generated: ${this.metrics.totalReportsGenerated}`,
      `Total Exports: ${this.metrics.totalExports}`,
      `Average Report Size: ${this.metrics.averageReportSize.toFixed(2)} bytes`,
      '',
      'Reports by Type:',
      ...Object.entries(this.metrics.reportsByType).map(
        ([type, count]) => `  ${type}: ${count}`
      ),
      '',
      `Last Report Date: ${this.metrics.lastReportDate || 'N/A'}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string; metrics: ReporterSnapshot['metrics'] } {
    return {
      version: 'V63',
      metrics: { ...this.metrics },
    };
  }
}

export default AuditReporter;
/**
 * Reporter - Report generation module for V39 Iteration 9
 * Generates reports, summarizes data, and exports metrics
 */

export interface ReportData {
  timestamp: number;
  title: string;
  sections: ReportSection[];
  metadata: Record<string, unknown>;
}

export interface ReportSection {
  name: string;
  content: string;
  level: number;
}

export interface ReporterConfig {
  format: 'text' | 'json' | 'html';
  includeTimestamp: boolean;
  maxSectionLength: number;
}

export interface ReporterState {
  generatedReports: ReportData[];
  lastReport: ReportData | null;
  errorCount: number;
  totalSections: number;
}

export interface ReporterMetrics {
  reportsGenerated: number;
  sectionsGenerated: number;
  averageSectionsPerReport: number;
  lastReportTimestamp: number | null;
  uptime: number;
}

export class Reporter {
  private config: ReporterConfig;
  private state: ReporterState;
  private startTime: number;

  constructor(config: Partial<ReporterConfig> = {}) {
    this.config = {
      format: config.format ?? 'text',
      includeTimestamp: config.includeTimestamp ?? true,
      maxSectionLength: config.maxSectionLength ?? 10000,
    };
    this.state = {
      generatedReports: [],
      lastReport: null,
      errorCount: 0,
      totalSections: 0,
    };
    this.startTime = Date.now();
  }

  /**
   * Generate a report with given sections
   */
  report(title: string, sections: Array<{ name: string; content: string; level?: number }>): ReportData {
    const report: ReportData = {
      timestamp: Date.now(),
      title,
      sections: sections.map((s) => ({
        name: s.name,
        content: s.content.substring(0, this.config.maxSectionLength),
        level: s.level ?? 1,
      })),
      metadata: {
        format: this.config.format,
        sectionCount: sections.length,
      },
    };

    this.state.generatedReports.push(report);
    this.state.lastReport = report;
    this.state.totalSections += sections.length;

    return report;
  }

  /**
   * Summarize data into a summary report
   */
  summarize(data: Record<string, unknown>, title: string = 'Summary'): ReportData {
    const sections: Array<{ name: string; content: string; level: number }> = [];

    for (const [key, value] of Object.entries(data)) {
      const content = typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : String(value);

      sections.push({
        name: this.formatKey(key),
        content,
        level: 2,
      });
    }

    return this.report(title, sections);
  }

  /**
   * Get the last generated report
   */
  getLastReport(): ReportData | null {
    return this.state.lastReport;
  }

  /**
   * Get all generated reports
   */
  getAllReports(): ReportData[] {
    return [...this.state.generatedReports];
  }

  /**
   * Get snapshot of reporter state
   */
  getSnapshot(): ReporterState & { metrics: ReporterMetrics } {
    return {
      ...this.state,
      metrics: this.exportMetrics(),
    };
  }

  /**
   * Reset reporter to initial state
   */
  reset(): void {
    this.state = {
      generatedReports: [],
      lastReport: null,
      errorCount: 0,
      totalSections: 0,
    };
    this.startTime = Date.now();
  }

  /**
   * Export formatted report as string
   */
  exportReport(report: ReportData): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push(` ${report.title}`);
    lines.push('═'.repeat(60));

    if (this.config.includeTimestamp) {
      lines.push(`Generated: ${new Date(report.timestamp).toISOString()}`);
      lines.push('');
    }

    for (const section of report.sections) {
      const prefix = '#'.repeat(section.level);
      lines.push(`${prefix} ${section.name}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export reporter metrics
   */
  exportMetrics(): ReporterMetrics {
    return {
      reportsGenerated: this.state.generatedReports.length,
      sectionsGenerated: this.state.totalSections,
      averageSectionsPerReport: this.state.generatedReports.length > 0
        ? this.state.totalSections / this.state.generatedReports.length
        : 0,
      lastReportTimestamp: this.state.lastReport?.timestamp ?? null,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get formatted text report of current state
   */
  getReport(): string {
    const metrics = this.exportMetrics();
    return [
      '=== Reporter Status ===',
      `Reports Generated: ${metrics.reportsGenerated}`,
      `Total Sections: ${metrics.sectionsGenerated}`,
      `Avg Sections/Report: ${metrics.averageSectionsPerReport.toFixed(2)}`,
      `Last Report: ${metrics.lastReportTimestamp ? new Date(metrics.lastReportTimestamp).toISOString() : 'None'}`,
      `Errors: ${this.state.errorCount}`,
    ].join('\n');
  }

  private formatKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  /**
   * Clear all generated reports
   */
  clearReports(): void {
    this.state.generatedReports = [];
    this.state.lastReport = null;
  }

  /**
   * Get report count
   */
  getReportCount(): number {
    return this.state.generatedReports.length;
  }

  /**
   * Set report format
   */
  setFormat(format: 'text' | 'json' | 'html'): void {
    this.config.format = format;
  }
}

export default Reporter;
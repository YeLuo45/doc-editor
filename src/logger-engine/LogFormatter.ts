/**
 * LogFormatter.ts - V87 Log Formatter
 * Handles log formatting with format/parse/getFormats/getStats
 */

export type FormatType = 'json' | 'text' | 'xml' | 'csv';

export interface FormatterConfig {
  defaultFormat: FormatType;
  timestampFormat: string;
  includeMetadata: boolean;
  customPatterns?: Record<string, string>;
}

export interface FormatterStats {
  totalFormatted: number;
  formatsUsed: Record<FormatType, number>;
  parseAttempts: number;
  parseFailures: number;
  lastFormat: string;
}

export interface LogFormat {
  type: FormatType;
  pattern?: string;
  template?: string;
}

export class LogFormatter {
  private stats: FormatterStats;
  private startTime: number;
  private formats: Map<FormatType, LogFormat>;

  constructor(public config: FormatterConfig) {
    this.startTime = Date.now();
    this.stats = {
      totalFormatted: 0,
      formatsUsed: { json: 0, text: 0, xml: 0, csv: 0 },
      parseAttempts: 0,
      parseFailures: 0,
      lastFormat: 'text'
    };
    this.formats = new Map();
    this.initializeFormats();
  }

  private initializeFormats(): void {
    this.formats.set('json', { type: 'json' });
    this.formats.set('text', { type: 'text', pattern: '[{level}] {timestamp} {message}' });
    this.formats.set('xml', { type: 'xml', pattern: '<log><level>{level}</level><message>{message}</message></log>' });
    this.formats.set('csv', { type: 'csv', pattern: 'level,timestamp,message' });
  }

  public format(entry: { level: string; timestamp: number; message: string; context?: Record<string, unknown> }, formatType?: FormatType): string {
    const type = formatType || this.config.defaultFormat;
    this.stats.totalFormatted++;
    this.stats.formatsUsed[type]++;
    this.stats.lastFormat = type;

    switch (type) {
      case 'json':
        return this.formatJson(entry);
      case 'text':
        return this.formatText(entry);
      case 'xml':
        return this.formatXml(entry);
      case 'csv':
        return this.formatCsv(entry);
      default:
        return this.formatText(entry);
    }
  }

  private formatJson(entry: { level: string; timestamp: number; message: string; context?: Record<string, unknown> }): string {
    const obj: Record<string, unknown> = {
      level: entry.level,
      timestamp: new Date(entry.timestamp).toISOString(),
      message: entry.message
    };
    if (this.config.includeMetadata && entry.context) {
      obj.context = entry.context;
    }
    return JSON.stringify(obj);
  }

  private formatText(entry: { level: string; timestamp: number; message: string }): string {
    const ts = this.formatTimestamp(entry.timestamp);
    return `[${entry.level.toUpperCase()}] ${ts} ${entry.message}`;
  }

  private formatXml(entry: { level: string; timestamp: number; message: string }): string {
    const ts = this.formatTimestamp(entry.timestamp);
    return `<log><level>${entry.level}</level><timestamp>${ts}</timestamp><message>${this.escapeXml(entry.message)}</message></log>`;
  }

  private formatCsv(entry: { level: string; timestamp: number; message: string }): string {
    const ts = this.formatTimestamp(entry.timestamp);
    return `${entry.level},${ts},"${this.escapeCsv(entry.message)}"`;
  }

  private formatTimestamp(ts: number): string {
    return new Date(ts).toISOString();
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private escapeCsv(str: string): string {
    return str.replace(/"/g, '""');
  }

  public parse(input: string, formatType?: FormatType): Record<string, unknown> | null {
    const type = formatType || this.config.defaultFormat;
    this.stats.parseAttempts++;

    try {
      switch (type) {
        case 'json':
          return JSON.parse(input);
        case 'text':
          return this.parseText(input);
        case 'xml':
          return this.parseXml(input);
        case 'csv':
          return this.parseCsv(input);
        default:
          return null;
      }
    } catch {
      this.stats.parseFailures++;
      return null;
    }
  }

  private parseText(input: string): Record<string, unknown> {
    const match = input.match(/\[(\w+)\]\s*(.+?)\s*(.+)/);
    if (match) {
      return { level: match[1], timestamp: Date.now(), message: match[3] };
    }
    return { message: input };
  }

  private parseXml(input: string): Record<string, unknown> {
    const level = input.match(/<level>(.*?)<\/level>/)?.[1] || '';
    const message = input.match(/<message>(.*?)<\/message>/)?.[1] || '';
    return { level, message };
  }

  private parseCsv(input: string): Record<string, unknown> {
    const parts = input.split(',');
    if (parts.length >= 3) {
      return { level: parts[0], timestamp: parts[1], message: parts[2].replace(/"/g, '') };
    }
    return { message: input };
  }

  public getFormats(): LogFormat[] {
    return Array.from(this.formats.values());
  }

  public getStats(): FormatterStats {
    return {
      ...this.stats,
      lastFormat: this.stats.lastFormat
    };
  }

  public getSnapshot(): { metrics: FormatterStats } {
    return {
      metrics: this.getStats()
    };
  }

  public reset(): void {
    this.stats = {
      totalFormatted: 0,
      formatsUsed: { json: 0, text: 0, xml: 0, csv: 0 },
      parseAttempts: 0,
      parseFailures: 0,
      lastFormat: 'text'
    };
  }

  public getReport(): string {
    const s = this.getStats();
    return `LogFormatter Report:
  Total Formatted: ${s.totalFormatted}
  Parse Attempts: ${s.parseAttempts}
  Parse Failures: ${s.parseFailures}
  Last Format: ${s.lastFormat}
  Formats Used: json=${s.formatsUsed.json}, text=${s.formatsUsed.text}, xml=${s.formatsUsed.xml}, csv=${s.formatsUsed.csv}`;
  }

  public exportMetrics(): { version: string } {
    return {
      version: 'V87-1.0.0'
    };
  }
}

export default LogFormatter;

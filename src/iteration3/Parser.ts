/**
 * Parser.ts - Data parser module for doc-editor V33 Iteration 3
 * Handles data parsing operations with parse/format/getParsed
 */

export interface ParsedData<T = unknown> {
  data: T;
  format: string;
  timestamp: number;
  size: number;
}

export interface ParserMetrics {
  totalParsed: number;
  totalFormatted: number;
  totalErrors: number;
  averageParseTime: number;
  supportedFormats: string[];
}

export interface ParserSnapshot {
  parsedData: Map<string, ParsedData>;
  metrics: ParserMetrics;
  timestamp: number;
}

export interface ParserReport {
  status: 'idle' | 'active' | 'error';
  metrics: ParserMetrics;
  parsedCount: number;
  formattedCount: number;
  errorCount: number;
}

export interface ParserExportedMetrics {
  timestamp: number;
  metrics: ParserMetrics;
  version: string;
  exportVersion: string;
}

export class Parser {
  private parsedData: Map<string, ParsedData> = new Map();
  private metrics: ParserMetrics = {
    totalParsed: 0,
    totalFormatted: 0,
    totalErrors: 0,
    averageParseTime: 0,
    supportedFormats: ['json', 'yaml', 'xml', 'csv', 'text'],
  };
  private parseHistory: Array<{ id: string; format: string; duration: number; success: boolean }> = [];

  /**
   * Parse data with the specified format
   */
  parse<T = unknown>(data: string, format: string): ParsedData<T> {
    const startTime = Date.now();
    const id = `parse_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      let parsed: T;

      switch (format.toLowerCase()) {
        case 'json':
          parsed = JSON.parse(data) as T;
          break;
        case 'yaml':
          parsed = this.parseYaml(data) as T;
          break;
        case 'xml':
          parsed = this.parseXml(data) as T;
          break;
        case 'csv':
          parsed = this.parseCsv(data) as T;
          break;
        case 'text':
        default:
          parsed = data as unknown as T;
          break;
      }

      const duration = Date.now() - startTime;
      const result: ParsedData<T> = {
        data: parsed,
        format,
        timestamp: Date.now(),
        size: data.length,
      };

      this.parsedData.set(id, result);
      this.metrics.totalParsed++;
      this.parseHistory.push({ id, format, duration, success: true });
      this.updateAverageParseTime();

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.totalErrors++;
      this.parseHistory.push({ id, format, duration, success: false });
      this.updateAverageParseTime();
      throw new Error(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Format data to the specified format
   */
  format(data: unknown, format: string): string {
    const startTime = Date.now();

    try {
      let formatted: string;

      switch (format.toLowerCase()) {
        case 'json':
          formatted = JSON.stringify(data, null, 2);
          break;
        case 'yaml':
          formatted = this.toYaml(data);
          break;
        case 'xml':
          formatted = this.toXml(data);
          break;
        case 'csv':
          formatted = this.toCsv(data);
          break;
        case 'text':
        default:
          formatted = String(data);
          break;
      }

      const duration = Date.now() - startTime;
      this.metrics.totalFormatted++;
      this.updateAverageParseTime();

      return formatted;
    } catch (error) {
      this.metrics.totalErrors++;
      this.updateAverageParseTime();
      throw new Error(`Format error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get parsed data by ID
   */
  getParsed(id: string): ParsedData | undefined {
    return this.parsedData.get(id);
  }

  /**
   * Get all parsed data entries
   */
  getAllParsed(): Map<string, ParsedData> {
    return new Map(this.parsedData);
  }

  /**
   * Get a snapshot of current parser state
   */
  getSnapshot(): ParserSnapshot {
    return {
      parsedData: new Map(this.parsedData),
      metrics: { ...this.metrics },
      timestamp: Date.now(),
    };
  }

  /**
   * Reset all parsed data and metrics
   */
  reset(): void {
    this.parsedData.clear();
    this.metrics = {
      totalParsed: 0,
      totalFormatted: 0,
      totalErrors: 0,
      averageParseTime: 0,
      supportedFormats: ['json', 'yaml', 'xml', 'csv', 'text'],
    };
    this.parseHistory = [];
  }

  /**
   * Generate a detailed status report
   */
  getReport(): ParserReport {
    return {
      status: this.metrics.totalErrors > 0 ? 'error' : this.parsedData.size > 0 ? 'active' : 'idle',
      metrics: { ...this.metrics },
      parsedCount: this.metrics.totalParsed,
      formattedCount: this.metrics.totalFormatted,
      errorCount: this.metrics.totalErrors,
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): ParserExportedMetrics {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      version: '1.0.0',
      exportVersion: 'V33-I3',
    };
  }

  private parseYaml(data: string): unknown {
    const result: Record<string, unknown> = {};
    const lines = data.split('\n');
    let currentKey = '';
    let currentValue: unknown;

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        currentKey = match[1];
        currentValue = match[2].replace(/^["']|["']$/g, '');
        result[currentKey] = currentValue;
      }
    }

    return result;
  }

  private parseXml(data: string): unknown {
    const result: Record<string, string> = {};
    const tagMatch = data.match(/<(\w+)>([^<]*)<\/\1>/g);
    if (tagMatch) {
      for (const tag of tagMatch) {
        const innerMatch = tag.match(/<(\w+)>([^<]*)<\/\1>/);
        if (innerMatch) {
          result[innerMatch[1]] = innerMatch[2];
        }
      }
    }
    return result;
  }

  private parseCsv(data: string): unknown[] {
    const lines = data.split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',');
    const result: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      result.push(row);
    }

    return result;
  }

  private toYaml(data: unknown): string {
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data as Record<string, unknown>)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join('\n');
    }
    return String(data);
  }

  private toXml(data: unknown): string {
    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data as Record<string, unknown>);
      return '<root>' + entries.map(([key, value]) => `<${key}>${value}</${key}>`).join('') + '</root>';
    }
    return `<root>${data}</root>`;
  }

  private toCsv(data: unknown): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0] as Record<string, unknown>);
      const rows = data.map(item =>
        headers.map(h => (item as Record<string, unknown>)[h]).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }
    return String(data);
  }

  private updateAverageParseTime(): void {
    const total = this.parseHistory.length;
    if (total > 0) {
      const sum = this.parseHistory.reduce((acc, p) => acc + p.duration, 0);
      this.metrics.averageParseTime = sum / total;
    }
  }
}

export default Parser;
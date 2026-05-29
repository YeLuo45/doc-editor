/**
 * Converter.ts - Format converter module for doc-editor V33 Iteration 3
 * Handles format conversion with convert/transform/getConverted
 */

export type FormatType = 'json' | 'yaml' | 'xml' | 'csv' | 'text' | 'binary' | 'base64';

export interface ConvertResult<T = unknown> {
  data: T;
  sourceFormat: FormatType;
  targetFormat: FormatType;
  timestamp: number;
  size: number;
}

export interface ConverterMetrics {
  totalConversions: number;
  totalTransformed: number;
  totalErrors: number;
  averageConversionTime: number;
  supportedFormats: FormatType[];
}

export interface ConverterSnapshot {
  conversions: Map<string, ConvertResult>;
  metrics: ConverterMetrics;
  timestamp: number;
}

export interface ConverterReport {
  status: 'idle' | 'active' | 'error';
  metrics: ConverterMetrics;
  conversionCount: number;
  transformedCount: number;
  errorCount: number;
}

export interface ConverterExportedMetrics {
  timestamp: number;
  metrics: ConverterMetrics;
  version: string;
  exportVersion: string;
}

export class Converter {
  private conversions: Map<string, ConvertResult> = new Map();
  private metrics: ConverterMetrics = {
    totalConversions: 0,
    totalTransformed: 0,
    totalErrors: 0,
    averageConversionTime: 0,
    supportedFormats: ['json', 'yaml', 'xml', 'csv', 'text', 'binary', 'base64'],
  };
  private conversionHistory: Array<{ id: string; source: FormatType; target: FormatType; duration: number; success: boolean }> = [];

  /**
   * Convert data from one format to another
   */
  convert<T = unknown>(data: unknown, sourceFormat: FormatType, targetFormat: FormatType): ConvertResult<T> {
    const startTime = Date.now();
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (sourceFormat === targetFormat) {
      return {
        data: data as T,
        sourceFormat,
        targetFormat,
        timestamp: Date.now(),
        size: this.calculateSize(data),
      };
    }

    try {
      const intermediate = this.parseToIntermediate(data, sourceFormat);
      const result = this.intermediateToTarget(intermediate, targetFormat);

      const duration = Date.now() - startTime;
      const convertResult: ConvertResult<T> = {
        data: result as T,
        sourceFormat,
        targetFormat,
        timestamp: Date.now(),
        size: this.calculateSize(result),
      };

      this.conversions.set(id, convertResult);
      this.metrics.totalConversions++;
      this.conversionHistory.push({ id, source: sourceFormat, target: targetFormat, duration, success: true });
      this.updateAverageConversionTime();

      return convertResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.totalErrors++;
      this.conversionHistory.push({ id, source: sourceFormat, target: targetFormat, duration, success: false });
      this.updateAverageConversionTime();
      throw new Error(`Conversion error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transform data with a transformation function
   */
  transform<T = unknown>(data: unknown, fn: (data: unknown) => T, targetFormat?: FormatType): ConvertResult<T> {
    const startTime = Date.now();
    const id = `trans_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const transformed = fn(data);
      const result: ConvertResult<T> = {
        data: transformed,
        sourceFormat: 'json',
        targetFormat: targetFormat || 'json',
        timestamp: Date.now(),
        size: this.calculateSize(transformed),
      };

      this.conversions.set(id, result);
      this.metrics.totalTransformed++;
      this.updateAverageConversionTime();

      return result;
    } catch (error) {
      this.metrics.totalErrors++;
      this.updateAverageConversionTime();
      throw new Error(`Transform error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get converted data by ID
   */
  getConverted(id: string): ConvertResult | undefined {
    return this.conversions.get(id);
  }

  /**
   * Get all conversion results
   */
  getAllConverted(): Map<string, ConvertResult> {
    return new Map(this.conversions);
  }

  /**
   * Get a snapshot of current converter state
   */
  getSnapshot(): ConverterSnapshot {
    return {
      conversions: new Map(this.conversions),
      metrics: { ...this.metrics },
      timestamp: Date.now(),
    };
  }

  /**
   * Reset all conversions and metrics
   */
  reset(): void {
    this.conversions.clear();
    this.metrics = {
      totalConversions: 0,
      totalTransformed: 0,
      totalErrors: 0,
      averageConversionTime: 0,
      supportedFormats: ['json', 'yaml', 'xml', 'csv', 'text', 'binary', 'base64'],
    };
    this.conversionHistory = [];
  }

  /**
   * Generate a detailed status report
   */
  getReport(): ConverterReport {
    return {
      status: this.metrics.totalErrors > 0 ? 'error' : this.conversions.size > 0 ? 'active' : 'idle',
      metrics: { ...this.metrics },
      conversionCount: this.metrics.totalConversions,
      transformedCount: this.metrics.totalTransformed,
      errorCount: this.metrics.totalErrors,
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): ConverterExportedMetrics {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      version: '1.0.0',
      exportVersion: 'V33-I3',
    };
  }

  private parseToIntermediate(data: unknown, format: FormatType): unknown {
    switch (format) {
      case 'json':
        return typeof data === 'string' ? JSON.parse(data) : data;
      case 'yaml':
        return this.parseYaml(typeof data === 'string' ? data : JSON.stringify(data));
      case 'xml':
        return this.parseXml(typeof data === 'string' ? data : JSON.stringify(data));
      case 'csv':
        return this.parseCsv(typeof data === 'string' ? data : JSON.stringify(data));
      case 'text':
        return typeof data === 'string' ? data : String(data);
      case 'base64':
        return this.fromBase64(typeof data === 'string' ? data : '');
      case 'binary':
      default:
        return data;
    }
  }

  private intermediateToTarget(data: unknown, format: FormatType): unknown {
    switch (format) {
      case 'json':
        return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      case 'yaml':
        return this.toYaml(data);
      case 'xml':
        return this.toXml(data);
      case 'csv':
        return this.toCsv(data);
      case 'text':
        return typeof data === 'string' ? data : String(data);
      case 'base64':
        return this.toBase64(typeof data === 'string' ? data : JSON.stringify(data));
      case 'binary':
      default:
        return data;
    }
  }

  private parseYaml(data: string): unknown {
    const result: Record<string, unknown> = {};
    const lines = data.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        result[match[1]] = match[2].replace(/^["']|["']$/g, '');
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

  private toBase64(data: string): string {
    return Buffer.from(data).toString('base64');
  }

  private fromBase64(data: string): string {
    return Buffer.from(data, 'base64').toString();
  }

  private calculateSize(data: unknown): number {
    return JSON.stringify(data).length;
  }

  private updateAverageConversionTime(): void {
    const total = this.conversionHistory.length;
    if (total > 0) {
      const sum = this.conversionHistory.reduce((acc, c) => acc + c.duration, 0);
      this.metrics.averageConversionTime = sum / total;
    }
  }
}

export default Converter;
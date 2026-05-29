/**
 * ImportEngine.ts - V71 Import/Export Engine - Import Module
 * Handles data import with support for multiple formats
 */

type ImportConfig = {
  maxFileSize: number;
  supportedFormats: string[];
  autoValidate: boolean;
  encoding: string;
  strictMode: boolean;
  chunkSize: number;
};

interface ImportResult {
  success: boolean;
  data: unknown;
  format: string;
  warnings: string[];
  errors: string[];
  metadata: Record<string, unknown>;
}

interface ImportMetrics {
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  totalBytesProcessed: number;
  averageImportTime: number;
}

export class ImportEngine {
  private importHistory: ImportResult[] = [];
  private metrics: ImportMetrics = {
    totalImports: 0,
    successfulImports: 0,
    failedImports: 0,
    totalBytesProcessed: 0,
    averageImportTime: 0,
  };
  public readonly config: ImportConfig;

  constructor(config: Partial<ImportConfig> = {}) {
    this.config = {
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024, // 10MB default
      supportedFormats: config.supportedFormats ?? ['json', 'yaml', 'xml', 'csv', 'txt'],
      autoValidate: config.autoValidate ?? true,
      encoding: config.encoding ?? 'utf-8',
      strictMode: config.strictMode ?? false,
      chunkSize: config.chunkSize ?? 1024 * 1024, // 1MB default
    };
  }

  async import(data: string | ArrayBuffer, format: string): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      success: false,
      data: null,
      format,
      warnings: [],
      errors: [],
      metadata: {},
    };

    try {
      if (!this.getSupportedFormats().includes(format.toLowerCase())) {
        throw new Error(`Unsupported format: ${format}`);
      }

      const normalizedData = typeof data === 'string' ? data : this.arrayBufferToString(data);
      
      if (normalizedData.length > this.config.maxFileSize) {
        throw new Error(`File exceeds max size: ${normalizedData.length} > ${this.config.maxFileSize}`);
      }

      const parsed = this.parse(normalizedData, format);
      result.data = parsed;
      result.success = true;

      if (this.config.autoValidate) {
        const validation = this.validate(parsed, format);
        if (!validation.valid) {
          result.warnings.push(...validation.errors);
        }
      }

      result.metadata = {
        size: normalizedData.length,
        importTime: Date.now() - startTime,
        format,
      };
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    this.importHistory.push(result);
    this.metrics.totalImports++;
    if (result.success) {
      this.metrics.successfulImports++;
    } else {
      this.metrics.failedImports++;
    }
    this.metrics.totalBytesProcessed += result.metadata?.size as number || 0;

    return result;
  }

  parse(data: string, format: string): unknown {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.parse(data);
      case 'yaml':
        return this.parseYaml(data);
      case 'xml':
        return this.parseXml(data);
      case 'csv':
        return this.parseCsv(data);
      case 'txt':
        return { content: data, type: 'text' };
      default:
        throw new Error(`Cannot parse format: ${format}`);
    }
  }

  validate(data: unknown, format: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (data === null || data === undefined) {
      errors.push('Data is null or undefined');
      return { valid: false, errors };
    }

    if (format === 'json' && typeof data !== 'object') {
      errors.push('JSON data must be an object or array');
    }

    return { valid: errors.length === 0, errors };
  }

  getSupportedFormats(): string[] {
    return [...this.config.supportedFormats];
  }

  getSnapshot(): { metrics: ImportMetrics } {
    return {
      metrics: {
        ...this.metrics,
        averageImportTime: this.metrics.totalImports > 0
          ? this.metrics.totalBytesProcessed / this.metrics.totalImports
          : 0,
      },
    };
  }

  reset(): void {
    this.importHistory = [];
    this.metrics = {
      totalImports: 0,
      successfulImports: 0,
      failedImports: 0,
      totalBytesProcessed: 0,
      averageImportTime: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== ImportEngine Report ===',
      `Total Imports: ${snapshot.metrics.totalImports}`,
      `Successful: ${snapshot.metrics.successfulImports}`,
      `Failed: ${snapshot.metrics.failedImports}`,
      `Total Bytes: ${snapshot.metrics.totalBytesProcessed}`,
      `Average Time: ${snapshot.metrics.averageImportTime.toFixed(2)}ms`,
      `Supported Formats: ${this.config.supportedFormats.join(', ')}`,
      '===========================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v71-import-engine' };
  }

  private parseYaml(data: string): unknown {
    // Simple YAML parsing - in production use js-yaml
    try {
      const lines = data.split('\n');
      const result: Record<string, unknown> = {};
      let currentKey = '';
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          result[key] = value || '';
        }
      }
      return result;
    } catch {
      return { raw: data };
    }
  }

  private parseXml(data: string): unknown {
    // Simple XML parsing - in production use DOMParser
    const tagMatch = data.match(/<(\w+)>([^<]*)<\/\1>/);
    if (tagMatch) {
      return { tag: tagMatch[1], content: tagMatch[2] };
    }
    return { raw: data };
  }

  private parseCsv(data: string): unknown[] {
    const lines = data.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });
  }

  private arrayBufferToString(buffer: ArrayBuffer): string {
    return new TextDecoder().decode(buffer);
  }
}
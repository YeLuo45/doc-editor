/**
 * ExportEngine.ts - V71 Import/Export Engine - Export Module
 * Handles data export to multiple formats with conversion support
 */

type ExportConfig = {
  defaultFormat: string;
  supportedFormats: string[];
  compressionEnabled: boolean;
  prettyPrint: boolean;
  includeMetadata: boolean;
  maxExportSize: number;
};

interface ExportResult {
  success: boolean;
  data: string | ArrayBuffer;
  format: string;
  size: number;
  warnings: string[];
  errors: string[];
  metadata: Record<string, unknown>;
}

interface ExportMetrics {
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  totalBytesExported: number;
  formatUsage: Record<string, number>;
}

export class ExportEngine {
  private exportHistory: ExportResult[] = [];
  private metrics: ExportMetrics = {
    totalExports: 0,
    successfulExports: 0,
    failedExports: 0,
    totalBytesExported: 0,
    formatUsage: {},
  };
  public readonly config: ExportConfig;

  constructor(config: Partial<ExportConfig> = {}) {
    this.config = {
      defaultFormat: config.defaultFormat ?? 'json',
      supportedFormats: config.supportedFormats ?? ['json', 'yaml', 'xml', 'csv', 'txt'],
      compressionEnabled: config.compressionEnabled ?? false,
      prettyPrint: config.prettyPrint ?? true,
      includeMetadata: config.includeMetadata ?? true,
      maxExportSize: config.maxExportSize ?? 50 * 1024 * 1024, // 50MB
    };
  }

  async export(data: unknown, format?: string): Promise<ExportResult> {
    const targetFormat = format ?? this.config.defaultFormat;
    const result: ExportResult = {
      success: false,
      data: '',
      format: targetFormat,
      size: 0,
      warnings: [],
      errors: [],
      metadata: {},
    };

    try {
      if (!this.getExportFormats().includes(targetFormat.toLowerCase())) {
        throw new Error(`Unsupported export format: ${targetFormat}`);
      }

      const formatted = this.format(data, targetFormat);
      
      if (formatted.length > this.config.maxExportSize) {
        throw new Error(`Export exceeds max size: ${formatted.length} > ${this.config.maxExportSize}`);
      }

      result.data = formatted;
      result.size = formatted.length;
      result.success = true;

      if (this.config.compressionEnabled) {
        result.warnings.push('Compression is enabled but not applied in this implementation');
      }

      result.metadata = {
        originalSize: JSON.stringify(data).length,
        exportedSize: result.size,
        format: targetFormat,
        timestamp: Date.now(),
      };
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    this.exportHistory.push(result);
    this.metrics.totalExports++;
    if (result.success) {
      this.metrics.successfulExports++;
      this.metrics.formatUsage[targetFormat] = (this.metrics.formatUsage[targetFormat] || 0) + 1;
    } else {
      this.metrics.failedExports++;
    }
    this.metrics.totalBytesExported += result.size;

    return result;
  }

  format(data: unknown, format: string): string {
    const pretty = this.config.prettyPrint;
    
    switch (format.toLowerCase()) {
      case 'json':
        return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      case 'yaml':
        return this.toYaml(data);
      case 'xml':
        return this.toXml(data);
      case 'csv':
        return this.toCsv(data);
      case 'txt':
        return this.toText(data);
      default:
        throw new Error(`Cannot format to: ${format}`);
    }
  }

  convert(data: unknown, fromFormat: string, toFormat: string): string {
    // First parse the data based on source format
    let parsed: unknown;
    
    switch (fromFormat.toLowerCase()) {
      case 'json':
        parsed = typeof data === 'string' ? JSON.parse(data) : data;
        break;
      case 'yaml':
        parsed = data;
        break;
      case 'xml':
        parsed = data;
        break;
      case 'csv':
        parsed = data;
        break;
      default:
        parsed = data;
    }

    // Then format to target format
    return this.format(parsed, toFormat);
  }

  getExportFormats(): string[] {
    return [...this.config.supportedFormats];
  }

  getSnapshot(): { metrics: ExportMetrics } {
    return { metrics: { ...this.metrics } };
  }

  reset(): void {
    this.exportHistory = [];
    this.metrics = {
      totalExports: 0,
      successfulExports: 0,
      failedExports: 0,
      totalBytesExported: 0,
      formatUsage: {},
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const formatStats = Object.entries(snapshot.metrics.formatUsage)
      .map(([fmt, count]) => `  ${fmt}: ${count}`)
      .join('\n');
    
    return [
      '=== ExportEngine Report ===',
      `Total Exports: ${snapshot.metrics.totalExports}`,
      `Successful: ${snapshot.metrics.successfulExports}`,
      `Failed: ${snapshot.metrics.failedExports}`,
      `Total Bytes: ${snapshot.metrics.totalBytesExported}`,
      `Format Usage:\n${formatStats || '  (none)'}`,
      '============================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v71-export-engine' };
  }

  private toYaml(data: unknown): string {
    if (typeof data !== 'object' || data === null) {
      return String(data);
    }
    
    const lines: string[] = [];
    const obj = data as Record<string, unknown>;
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        lines.push(`${key}:`);
        lines.push(`  ${JSON.stringify(value)}`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    
    return lines.join('\n');
  }

  private toXml(data: unknown): string {
    if (typeof data !== 'object' || data === null) {
      return `<value>${data}</value>`;
    }
    
    const obj = data as Record<string, unknown>;
    const entries = Object.entries(obj)
      .map(([k, v]) => `<${k}>${v}</${k}>`)
      .join('\n');
    
    return `<document>\n${entries}\n</document>`;
  }

  private toCsv(data: unknown): string {
    if (!Array.isArray(data)) {
      if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        const headers = Object.keys(obj);
        const values = Object.values(obj).map(v => String(v));
        return [headers.join(','), values.join(',')].join('\n');
      }
      return String(data);
    }
    
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map(row => {
      const obj = row as Record<string, unknown>;
      return headers.map(h => {
        const val = obj[h];
        return String(val ?? '').includes(',') ? `"${val}"` : val ?? '';
      }).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }

  private toText(data: unknown): string {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  }
}
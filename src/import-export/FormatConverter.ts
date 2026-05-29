/**
 * FormatConverter.ts - V71 Import/Export Engine - Format Conversion Module
 * Handles format conversion and transformation between different data formats
 */

type ConverterConfig = {
  sourceFormats: string[];
  targetFormats: string[];
  preserveWhitespace: boolean;
  validateAfterConvert: boolean;
  strictSchemaValidation: boolean;
};

interface ConversionResult {
  success: boolean;
  originalFormat: string;
  targetFormat: string;
  data: unknown;
  errors: string[];
  warnings: string[];
  metadata: Record<string, unknown>;
}

interface ConversionStats {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  averageConversionTime: number;
  formatPairs: Record<string, number>;
}

export class FormatConverter {
  private conversionHistory: ConversionResult[] = [];
  private stats: ConversionStats = {
    totalConversions: 0,
    successfulConversions: 0,
    failedConversions: 0,
    averageConversionTime: 0,
    formatPairs: {},
  };
  public readonly config: ConverterConfig;

  constructor(config: Partial<ConverterConfig> = {}) {
    this.config = {
      sourceFormats: config.sourceFormats ?? ['json', 'yaml', 'xml', 'csv'],
      targetFormats: config.targetFormats ?? ['json', 'yaml', 'xml', 'csv', 'txt'],
      preserveWhitespace: config.preserveWhitespace ?? true,
      validateAfterConvert: config.validateAfterConvert ?? true,
      strictSchemaValidation: config.strictSchemaValidation ?? false,
    };
  }

  convert(data: unknown, fromFormat: string, toFormat: string): ConversionResult {
    const startTime = Date.now();
    const result: ConversionResult = {
      success: false,
      originalFormat: fromFormat,
      targetFormat: toFormat,
      data: null,
      errors: [],
      warnings: [],
      metadata: {},
    };

    try {
      if (!this.config.sourceFormats.includes(fromFormat.toLowerCase())) {
        throw new Error(`Source format not supported: ${fromFormat}`);
      }
      if (!this.config.targetFormats.includes(toFormat.toLowerCase())) {
        throw new Error(`Target format not supported: ${toFormat}`);
      }

      // Parse source data
      let parsed = this.parseSource(data, fromFormat);

      // Transform to target format
      const transformed = this.transform(parsed, toFormat);
      result.data = transformed;
      result.success = true;

      if (this.config.validateAfterConvert) {
        const validation = this.validateOutput(result.data, toFormat);
        if (!validation.valid) {
          result.warnings.push(...validation.errors);
        }
      }

      result.metadata = {
        conversionTime: Date.now() - startTime,
        originalSize: JSON.stringify(data).length,
        convertedSize: JSON.stringify(result.data).length,
      };
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown conversion error');
    }

    this.conversionHistory.push(result);
    this.stats.totalConversions++;
    if (result.success) {
      this.stats.successfulConversions++;
      const pair = `${fromFormat}->${toFormat}`;
      this.stats.formatPairs[pair] = (this.stats.formatPairs[pair] || 0) + 1;
    } else {
      this.stats.failedConversions++;
    }

    return result;
  }

  transform(data: unknown, toFormat: string): unknown {
    switch (toFormat.toLowerCase()) {
      case 'json':
        return typeof data === 'string' ? this.tryParseJson(data) : data;
      case 'yaml':
        return this.toYamlStructure(data);
      case 'xml':
        return this.toXmlStructure(data);
      case 'csv':
        return this.toCsvStructure(data);
      case 'txt':
        return this.toText(data);
      default:
        return data;
    }
  }

  getConversionStats(): ConversionStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: ConversionStats } {
    return {
      metrics: {
        ...this.stats,
        averageConversionTime: this.stats.totalConversions > 0
          ? this.stats.totalConversions / this.stats.successfulConversions
          : 0,
      },
    };
  }

  reset(): void {
    this.conversionHistory = [];
    this.stats = {
      totalConversions: 0,
      successfulConversions: 0,
      failedConversions: 0,
      averageConversionTime: 0,
      formatPairs: {},
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const pairStats = Object.entries(snapshot.metrics.formatPairs)
      .map(([pair, count]) => `  ${pair}: ${count}`)
      .join('\n');
    
    return [
      '=== FormatConverter Report ===',
      `Total Conversions: ${snapshot.metrics.totalConversions}`,
      `Successful: ${snapshot.metrics.successfulConversions}`,
      `Failed: ${snapshot.metrics.failedConversions}`,
      `Format Pairs:\n${pairStats || '  (none)'}`,
      '==============================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v71-format-converter' };
  }

  private parseSource(data: unknown, format: string): unknown {
    if (format === 'json') {
      return typeof data === 'string' ? JSON.parse(data) : data;
    }
    if (format === 'yaml') {
      return typeof data === 'string' ? this.parseYamlSimple(data) : data;
    }
    if (format === 'xml') {
      return typeof data === 'string' ? this.parseXmlSimple(data) : data;
    }
    if (format === 'csv') {
      return typeof data === 'string' ? this.parseCsvSimple(data) : data;
    }
    return data;
  }

  private tryParseJson(data: string): unknown {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  private parseYamlSimple(data: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = data.split('\n');
    
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).trim();
        const value = line.substring(colonIdx + 1).trim();
        result[key] = value || '';
      }
    }
    
    return result;
  }

  private parseXmlSimple(data: string): Record<string, unknown> {
    const tagMatch = data.match(/<(\w+)>([^<]*)<\/\1>/);
    if (tagMatch) {
      return { tag: tagMatch[1], content: tagMatch[2] };
    }
    return { raw: data };
  }

  private parseCsvSimple(data: string): unknown[] {
    const lines = data.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });
  }

  private toYamlStructure(data: unknown): string {
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

  private toXmlStructure(data: unknown): string {
    if (typeof data !== 'object' || data === null) {
      return `<value>${data}</value>`;
    }
    
    const obj = data as Record<string, unknown>;
    const entries = Object.entries(obj)
      .map(([k, v]) => `<${k}>${v}</${k}>`)
      .join('\n');
    
    return `<document>\n${entries}\n</document>`;
  }

  private toCsvStructure(data: unknown): string {
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
      return headers.map(h => String(obj[h] ?? '')).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }

  private toText(data: unknown): string {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  }

  private validateOutput(data: unknown, format: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (format === 'json') {
      if (typeof data !== 'object') {
        errors.push('JSON output must be an object or array');
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}
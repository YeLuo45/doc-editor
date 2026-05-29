/**
 * ResponseFormatter.ts - V78 Response Formatter
 * Formats and parses API responses
 */

export type FormatType = 'json' | 'xml' | 'html' | 'text' | 'binary';

export interface FormatterConfig {
  defaultFormat: FormatType;
  prettyPrint: boolean;
  includeMetadata: boolean;
  maxDataSize: number;
  escapeHtml: boolean;
}

type ResponseFormatterConfig = FormatterConfig;

export interface FormatStats {
  totalFormatted: number;
  jsonCount: number;
  xmlCount: number;
  htmlCount: number;
  textCount: number;
  binaryCount: number;
  errors: number;
}

export class ResponseFormatter {
  private formatters: Map<FormatType, (data: unknown, config: FormatterConfig) => string> = new Map();
  private parsers: Map<FormatType, (input: string) => unknown> = new Map();
  private stats: FormatStats = {
    totalFormatted: 0,
    jsonCount: 0,
    xmlCount: 0,
    htmlCount: 0,
    textCount: 0,
    binaryCount: 0,
    errors: 0,
  };

  public readonly config: ResponseFormatterConfig;

  constructor(config: Partial<FormatterConfig> = {}) {
    this.config = {
      defaultFormat: config.defaultFormat ?? 'json',
      prettyPrint: config.prettyPrint ?? true,
      includeMetadata: config.includeMetadata ?? true,
      maxDataSize: config.maxDataSize ?? 1048576,
      escapeHtml: config.escapeHtml ?? true,
    };

    this.initializeFormatters();
  }

  private initializeFormatters(): void {
    this.formatters.set('json', (data) => {
      if (this.config.prettyPrint) {
        return JSON.stringify(data, null, 2);
      }
      return JSON.stringify(data);
    });

    this.formatters.set('xml', (data) => {
      const json = typeof data === 'string' ? JSON.parse(data) : data;
      const items = Array.isArray(json) ? json : [json];
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n';
      
      for (const item of items) {
        xml += this.objectToXml(item, '  ');
      }
      xml += '</root>';
      
      return xml;
    });

    this.formatters.set('html', (data) => {
      const json = typeof data === 'string' ? JSON.parse(data) : data;
      const jsonStr = this.config.prettyPrint 
        ? JSON.stringify(json, null, 2) 
        : JSON.stringify(json);
      
      return `<!DOCTYPE html>
<html>
<head><title>Response</title></head>
<body>
<pre>${this.config.escapeHtml ? this.escapeHtml(jsonStr) : jsonStr}</pre>
</body>
</html>`;
    });

    this.formatters.set('text', (data) => {
      if (typeof data === 'string') {
        return data;
      }
      return JSON.stringify(data, null, 2);
    });

    this.formatters.set('binary', (data) => {
      if (typeof data === 'string') {
        return btoa(data);
      }
      return btoa(JSON.stringify(data));
    });

    this.parsers.set('json', (input) => JSON.parse(input));
    this.parsers.set('xml', this.parseXml.bind(this));
    this.parsers.set('text', (input) => input);
    this.parsers.set('html', (input) => input);
    this.parsers.set('binary', (input) => atob(input));
  }

  private objectToXml(obj: unknown, indent: string): string {
    if (obj === null || obj === undefined) {
      return `${indent}<null/>\n`;
    }

    if (typeof obj !== 'object') {
      return `${indent}<value>${String(obj)}</value>\n`;
    }

    let xml = '';
    if (Array.isArray(obj)) {
      for (const item of obj) {
        xml += `${indent}<item>\n${this.objectToXml(item, indent + '  ')}${indent}</item>\n`;
      }
    } else {
      for (const [key, value] of Object.entries(obj)) {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
        xml += `${indent}<${safeKey}>${typeof value === 'object' ? '\n' + this.objectToXml(value, indent + '  ') : String(value)}</${safeKey}>\n`;
      }
    }

    return xml;
  }

  private parseXml(input: string): unknown {
    const result: Record<string, unknown> = {};
    const matches = input.matchAll(/<(\w+)>([\s\S]*?)<\/\1>/g);
    
    for (const match of matches) {
      const [, key, value] = match;
      const nested = value.match(/<(\w+)>/);
      result[key] = nested ? this.parseXml(value) : value.trim();
    }

    return result;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format data to the specified format
   */
  format(data: unknown, format?: FormatType): string {
    const fmt = format ?? this.config.defaultFormat;
    const formatter = this.formatters.get(fmt);

    if (!formatter) {
      this.stats.errors++;
      return JSON.stringify({ error: `Unsupported format: ${fmt}` });
    }

    try {
      const result = formatter(data, this.config);
      this.stats.totalFormatted++;
      
      switch (fmt) {
        case 'json': this.stats.jsonCount++; break;
        case 'xml': this.stats.xmlCount++; break;
        case 'html': this.stats.htmlCount++; break;
        case 'text': this.stats.textCount++; break;
        case 'binary': this.stats.binaryCount++; break;
      }

      return result;
    } catch (error) {
      this.stats.errors++;
      return JSON.stringify({ error: String(error) });
    }
  }

  /**
   * Parse input in the specified format
   */
  parse(input: string, format?: FormatType): unknown {
    const fmt = format ?? this.config.defaultFormat;
    const parser = this.parsers.get(fmt);

    if (!parser) {
      this.stats.errors++;
      return { error: `Unsupported format: ${fmt}` };
    }

    try {
      return parser(input);
    } catch (error) {
      this.stats.errors++;
      return { error: String(error) };
    }
  }

  /**
   * Get all supported formats
   */
  getFormats(): FormatType[] {
    return Array.from(this.formatters.keys());
  }

  /**
   * Get formatter statistics
   */
  getStats(): FormatStats {
    return { ...this.stats };
  }

  /**
   * Get a snapshot of formatter state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        totalFormatted: this.stats.totalFormatted,
        formats: this.getFormats(),
        ...this.stats,
      },
    };
  }

  /**
   * Reset formatter state
   */
  reset(): void {
    this.stats = {
      totalFormatted: 0,
      jsonCount: 0,
      xmlCount: 0,
      htmlCount: 0,
      textCount: 0,
      binaryCount: 0,
      errors: 0,
    };
  }

  /**
   * Generate a detailed report
   */
  getReport(): string {
    return [
      '=== Response Formatter Report ===',
      `Total Formatted: ${this.stats.totalFormatted}`,
      `JSON: ${this.stats.jsonCount}`,
      `XML: ${this.stats.xmlCount}`,
      `HTML: ${this.stats.htmlCount}`,
      `Text: ${this.stats.textCount}`,
      `Binary: ${this.stats.binaryCount}`,
      `Errors: ${this.stats.errors}`,
      `Default Format: ${this.config.defaultFormat}`,
      `Pretty Print: ${this.config.prettyPrint}`,
    ].join('\n');
  }

  /**
   * Export metrics for monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}
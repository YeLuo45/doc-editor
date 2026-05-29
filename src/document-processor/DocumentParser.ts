export interface DocumentParserConfig {
  maxFileSize?: number;
  supportedFormats?: string[];
  strictMode?: boolean;
  encoding?: string;
}

export interface ParsedDocument {
  id: string;
  format: string;
  content: unknown;
  tokens: number;
  parsedAt: Date;
}

export class DocumentParser {
  public config: DocumentParserConfig;
  private parsed: Map<string, ParsedDocument> = new Map();
  private stats = {
    totalParsed: 0,
    totalFailed: 0,
    currentlyParsing: 0,
    bytesProcessed: 0,
  };
  private supportedFormatsList = ['json', 'xml', 'yaml', 'txt', 'csv', 'markdown'];

  constructor(config: DocumentParserConfig = {}) {
    this.config = {
      maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024,
      supportedFormats: config.supportedFormats ?? [...this.supportedFormatsList],
      strictMode: config.strictMode ?? false,
      encoding: config.encoding ?? 'utf-8',
    };
  }

  async parse(input: string | object, format?: string): Promise<ParsedDocument> {
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    const detectedFormat = format ?? this.detectFormat(inputStr);

    if (!this.isFormatSupported(detectedFormat)) {
      throw new Error(`Format '${detectedFormat}' is not supported`);
    }

    this.stats.currentlyParsing++;
    const docId = `parsed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const content = this.parseContent(inputStr, detectedFormat);
      const tokens = this.countTokens(inputStr);

      const parsed: ParsedDocument = {
        id: docId,
        format: detectedFormat,
        content,
        tokens,
        parsedAt: new Date(),
      };

      this.parsed.set(docId, parsed);
      this.stats.totalParsed++;
      this.stats.bytesProcessed += inputStr.length;

      return parsed;
    } catch (error) {
      this.stats.totalFailed++;
      throw new Error(`Failed to parse document: ${error}`);
    } finally {
      this.stats.currentlyParsing--;
    }
  }

  private detectFormat(input: string): string {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    if (trimmed.startsWith('<')) return 'xml';
    if (trimmed.startsWith('---') || /^\w+:\s/m.test(trimmed)) return 'yaml';
    if (/^[a-zA-Z0-9]+(,[a-zA-Z0-9]+)+$/.test(trimmed)) return 'csv';
    if (/^#+ |^\* |^\d+\. /.test(trimmed)) return 'markdown';
    return 'txt';
  }

  private isFormatSupported(format: string): boolean {
    return this.config.supportedFormats?.includes(format) ?? false;
  }

  private parseContent(input: string, format: string): unknown {
    switch (format) {
      case 'json':
        return JSON.parse(input);
      case 'xml':
        return { raw: input, note: 'XML parsing would require xml2js library' };
      case 'yaml':
        return { raw: input, note: 'YAML parsing would require js-yaml library' };
      case 'csv':
        return input.split(',').map((item) => item.trim());
      case 'markdown':
        return { raw: input, lines: input.split('\n').length };
      default:
        return { raw: input };
    }
  }

  private countTokens(input: string): number {
    return input.split(/\s+/).filter(Boolean).length;
  }

  getParsed(): ParsedDocument[] {
    return Array.from(this.parsed.values());
  }

  getParsedById(id: string): ParsedDocument | undefined {
    return this.parsed.get(id);
  }

  getFormats(): string[] {
    return [...this.supportedFormatsList];
  }

  getStats(): {
    totalParsed: number;
    totalFailed: number;
    currentlyParsing: number;
    bytesProcessed: number;
    supportedFormats: number;
  } {
    return {
      ...this.stats,
      supportedFormats: this.supportedFormatsList.length,
    };
  }

  getSnapshot(): { metrics: Record<string, number> } {
    return {
      metrics: {
        totalParsed: this.stats.totalParsed,
        totalFailed: this.stats.totalFailed,
        currentlyParsing: this.stats.currentlyParsing,
        bytesProcessed: this.stats.bytesProcessed,
        supportedFormats: this.supportedFormatsList.length,
        parsedCount: this.parsed.size,
      },
    };
  }

  reset(): void {
    this.parsed.clear();
    this.stats = {
      totalParsed: 0,
      totalFailed: 0,
      currentlyParsing: 0,
      bytesProcessed: 0,
    };
  }

  getReport(): string {
    return `DocumentParser Report: parsed=${this.stats.totalParsed}, failed=${this.stats.totalFailed}, ` +
      `parsing=${this.stats.currentlyParsing}, bytes=${this.stats.bytesProcessed}, ` +
      `formats=${this.supportedFormatsList.length}`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}
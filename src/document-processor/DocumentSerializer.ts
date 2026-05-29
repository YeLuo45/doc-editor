export interface DocumentSerializerConfig {
  defaultFormat?: string;
  prettyPrint?: boolean;
  includeMetadata?: boolean;
  validateOutput?: boolean;
}

export interface SerializedDocument {
  id: string;
  format: string;
  data: string;
  size: number;
  serializedAt: Date;
}

export class DocumentSerializer {
  public config: DocumentSerializerConfig;
  private serialized: Map<string, SerializedDocument> = new Map();
  private stats = {
    totalSerialized: 0,
    totalDeserialized: 0,
    totalFailed: 0,
    bytesProcessed: 0,
  };
  private supportedFormatsList = ['json', 'xml', 'yaml', 'txt', 'csv'];

  constructor(config: DocumentSerializerConfig = {}) {
    this.config = {
      defaultFormat: config.defaultFormat ?? 'json',
      prettyPrint: config.prettyPrint ?? true,
      includeMetadata: config.includeMetadata ?? true,
      validateOutput: config.validateOutput ?? true,
    };
  }

  async serialize(document: unknown, format?: string): Promise<SerializedDocument> {
    const targetFormat = format ?? this.config.defaultFormat ?? 'json';

    if (!this.isFormatSupported(targetFormat)) {
      throw new Error(`Format '${targetFormat}' is not supported`);
    }

    const docId = `serialized-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const data = this.serializeContent(document, targetFormat);
      const size = typeof data === 'string' ? data.length : JSON.stringify(data).length;

      const serialized: SerializedDocument = {
        id: docId,
        format: targetFormat,
        data,
        size,
        serializedAt: new Date(),
      };

      this.serialized.set(docId, serialized);
      this.stats.totalSerialized++;
      this.stats.bytesProcessed += size;

      return serialized;
    } catch (error) {
      this.stats.totalFailed++;
      throw new Error(`Failed to serialize document: ${error}`);
    }
  }

  async deserialize(data: string, format?: string): Promise<unknown> {
    const sourceFormat = format ?? this.detectFormat(data);

    if (!this.isFormatSupported(sourceFormat)) {
      throw new Error(`Format '${sourceFormat}' is not supported`);
    }

    this.stats.totalDeserialized++;
    this.stats.bytesProcessed += data.length;

    try {
      return this.deserializeContent(data, sourceFormat);
    } catch (error) {
      this.stats.totalFailed++;
      throw new Error(`Failed to deserialize document: ${error}`);
    }
  }

  private detectFormat(data: string): string {
    const trimmed = data.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
    if (trimmed.startsWith('<')) return 'xml';
    if (trimmed.startsWith('---')) return 'yaml';
    if (/^\d+(,\d+)+$/.test(trimmed)) return 'csv';
    return 'txt';
  }

  private isFormatSupported(format: string): boolean {
    return this.supportedFormatsList.includes(format);
  }

  private serializeContent(document: unknown, format: string): string {
    const metadata = this.config.includeMetadata
      ? { data: document, serializedAt: new Date().toISOString(), version: '1.0' }
      : document;

    switch (format) {
      case 'json':
        return this.config.prettyPrint ? JSON.stringify(metadata, null, 2) : JSON.stringify(metadata);
      case 'xml':
        return `<document>${JSON.stringify(metadata)}</document>`;
      case 'yaml':
        return JSON.stringify(metadata);
      case 'csv':
        if (Array.isArray(document)) {
          return document.join(',');
        }
        return String(document);
      default:
        return String(document);
    }
  }

  private deserializeContent(data: string, format: string): unknown {
    switch (format) {
      case 'json':
        return JSON.parse(data);
      case 'xml':
        return { raw: data, note: 'XML deserialization would require library' };
      case 'yaml':
        return { raw: data, note: 'YAML deserialization would require library' };
      case 'csv':
        return data.split(',').map((item) => item.trim());
      default:
        return data;
    }
  }

  getSerialized(): SerializedDocument[] {
    return Array.from(this.serialized.values());
  }

  getSerializedById(id: string): SerializedDocument | undefined {
    return this.serialized.get(id);
  }

  getFormats(): string[] {
    return [...this.supportedFormatsList];
  }

  getStats(): {
    totalSerialized: number;
    totalDeserialized: number;
    totalFailed: number;
    bytesProcessed: number;
  } {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: Record<string, number> } {
    return {
      metrics: {
        totalSerialized: this.stats.totalSerialized,
        totalDeserialized: this.stats.totalDeserialized,
        totalFailed: this.stats.totalFailed,
        bytesProcessed: this.stats.bytesProcessed,
        serializedCount: this.serialized.size,
      },
    };
  }

  reset(): void {
    this.serialized.clear();
    this.stats = {
      totalSerialized: 0,
      totalDeserialized: 0,
      totalFailed: 0,
      bytesProcessed: 0,
    };
  }

  getReport(): string {
    return `DocumentSerializer Report: serialized=${this.stats.totalSerialized}, ` +
      `deserialized=${this.stats.totalDeserialized}, failed=${this.stats.totalFailed}, ` +
      `bytes=${this.stats.bytesProcessed}`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}
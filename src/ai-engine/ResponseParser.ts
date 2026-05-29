/**
 * V59 AI Engine - ResponseParser.ts
 * AI Response Parsing and Validation Module
 */

export interface ParsePattern {
  id: string;
  name: string;
  pattern: RegExp;
  extractGroup: number;
  description: string;
  usageCount: number;
}

export interface ParseResult {
  success: boolean;
  data: unknown;
  error?: string;
  matchedPattern?: string;
}

export interface ResponseConfig {
  strictMode: boolean;
  maxLength: number;
  encoding: string;
}

export interface ResponseSnapshot {
  parsedCount: number;
  extractCount: number;
  validatedCount: number;
  failedCount: number;
  totalPatterns: number;
}

const DEFAULT_PATTERNS: ParsePattern[] = [
  { id: 'json', name: 'JSON', pattern: /\{[\s\S]*\}/, extractGroup: 0, description: 'Extract JSON objects', usageCount: 0 },
  { id: 'code', name: 'Code Block', pattern: /```[\s\S]*?```/, extractGroup: 0, description: 'Extract code blocks', usageCount: 0 },
  { id: 'markdown', name: 'Markdown', pattern: /#{1,6}\s+.+/, extractGroup: 0, description: 'Extract markdown headings', usageCount: 0 },
  { id: 'list', name: 'List Items', pattern: /^[-*]\s+.+$/gm, extractGroup: 0, description: 'Extract list items', usageCount: 0 },
  { id: 'number', name: 'Number', pattern: /\d+\.?\d*/, extractGroup: 0, description: 'Extract numbers', usageCount: 0 },
];

export class ResponseParser {
  private _config: ResponseConfig;
  private patterns: Map<string, ParsePattern>;
  private parsedCount = 0;
  private extractCount = 0;
  private validatedCount = 0;
  private failedCount = 0;

  constructor(config: Partial<ResponseConfig> = {}) {
    this._config = {
      strictMode: config.strictMode ?? false,
      maxLength: config.maxLength || 50000,
      encoding: config.encoding || 'utf-8',
    };
    this.patterns = new Map();
    DEFAULT_PATTERNS.forEach(p => this.patterns.set(p.id, { ...p }));
  }

  get config(): ResponseConfig {
    return { ...this._config };
  }

  parse(response: string): ParseResult {
    if (!response || response.length === 0) {
      this.failedCount++;
      return { success: false, data: null, error: 'Empty response' };
    }

    if (response.length > this._config.maxLength) {
      response = response.substring(0, this._config.maxLength);
    }

    try {
      const trimmed = response.trim();
      this.parsedCount++;

      if (this._config.strictMode) {
        return { success: true, data: trimmed, matchedPattern: 'raw' };
      }

      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, data: parsed, matchedPattern: 'json' };
      }

      return { success: true, data: trimmed, matchedPattern: 'raw' };
    } catch (err) {
      this.failedCount++;
      return { success: false, data: null, error: String(err) };
    }
  }

  extract(response: string, patternId: string): string[] {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return [];

    const matches = response.match(pattern.pattern);
    this.extractCount++;
    pattern.usageCount++;

    if (matches) {
      if (pattern.extractGroup > 0 && matches[pattern.extractGroup]) {
        return [matches[pattern.extractGroup]];
      }
      return matches;
    }
    return [];
  }

  validate(response: string, schema?: Record<string, unknown>): boolean {
    this.validatedCount++;

    if (!response || response.length === 0) {
      return false;
    }

    if (schema) {
      try {
        const parsed = JSON.parse(response);
        return this.validateSchema(parsed, schema);
      } catch {
        return false;
      }
    }

    return response.length > 0 && response.length <= this._config.maxLength;
  }

  private validateSchema(obj: unknown, schema: Record<string, unknown>): boolean {
    if (typeof obj !== 'object' || obj === null) return false;

    for (const [key, expectedType] of Object.entries(schema)) {
      if (!(key in obj)) return false;
      const actualType = typeof (obj as Record<string, unknown>)[key];
      if (expectedType !== actualType) return false;
    }
    return true;
  }

  getPatterns(): ParsePattern[] {
    return Array.from(this.patterns.values());
  }

  getPattern(id: string): ParsePattern | undefined {
    return this.patterns.get(id);
  }

  addPattern(pattern: ParsePattern): void {
    this.patterns.set(pattern.id, { ...pattern, usageCount: 0 });
  }

  removePattern(patternId: string): boolean {
    return this.patterns.delete(patternId);
  }

  updatePattern(patternId: string, updates: Partial<ParsePattern>): boolean {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return false;
    this.patterns.set(patternId, { ...pattern, ...updates, id: patternId });
    return true;
  }

  getSnapshot(): { metrics: ResponseSnapshot } {
    return {
      metrics: {
        parsedCount: this.parsedCount,
        extractCount: this.extractCount,
        validatedCount: this.validatedCount,
        failedCount: this.failedCount,
        totalPatterns: this.patterns.size,
      },
    };
  }

  reset(): void {
    this.parsedCount = 0;
    this.extractCount = 0;
    this.validatedCount = 0;
    this.failedCount = 0;
    this._config = {
      strictMode: false,
      maxLength: 50000,
      encoding: 'utf-8',
    };
    this.patterns.clear();
    DEFAULT_PATTERNS.forEach(p => this.patterns.set(p.id, { ...p }));
  }

  getReport(): string {
    return [
      '=== Response Parser Report ===',
      `Parsed Count: ${this.parsedCount}`,
      `Extract Count: ${this.extractCount}`,
      `Validated Count: ${this.validatedCount}`,
      `Failed Count: ${this.failedCount}`,
      `Total Patterns: ${this.patterns.size}`,
      `Strict Mode: ${this._config.strictMode}`,
      `Max Length: ${this._config.maxLength}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V59-ai-engine-1.0',
    };
  }
}
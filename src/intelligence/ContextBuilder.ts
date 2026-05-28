/**
 * ContextBuilder - Context building and parsing for doc-editor V28
 * Provides build, parse, and getContext capabilities
 */

export interface ContextData {
  id: string;
  type: string;
  content: unknown;
  metadata?: Record<string, unknown>;
  created: number;
  expires?: number;
}

export interface ParsedContext {
  context: ContextData;
  parsed: unknown;
  entities: string[];
  relationships: Array<{ source: string; target: string; type: string }>;
  confidence: number;
}

export interface BuildOptions {
  includeMetadata?: boolean;
  maxDepth?: number;
  validate?: boolean;
  ttl?: number;
}

export interface Snapshot {
  contextsBuilt: number;
  contextsParsed: number;
  activeContexts: number;
  lastBuild: number;
  averageParseTime: number;
}

export class ContextBuilder {
  private contexts: Map<string, ContextData> = new Map();
  private parseHistory: ParsedContext[] = [];
  private lastBuildTime: number = 0;
  private totalParseTime: number = 0;

  constructor() {
    this.lastBuildTime = Date.now();
  }

  /**
   * Build a new context from input data
   */
  build(data: unknown, options?: BuildOptions): ContextData {
    const maxDepth = options?.maxDepth ?? 5;
    const context: ContextData = {
      id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.inferContextType(data),
      content: this.sanitizeContent(data, maxDepth),
      metadata: options?.includeMetadata ? this.generateMetadata(data) : undefined,
      created: Date.now(),
      expires: options?.ttl ? Date.now() + options?.ttl : undefined,
    };

    if (options?.validate && !this.validateContext(context)) {
      throw new Error('Invalid context structure');
    }

    this.contexts.set(context.id, context);
    this.lastBuildTime = Date.now();
    return context;
  }

  /**
   * Parse an existing context and extract structure
   */
  parse(contextId: string, options?: {
    extractEntities?: boolean;
    extractRelationships?: boolean;
  }): ParsedContext | null {
    const context = this.contexts.get(contextId);
    if (!context) return null;

    const startTime = performance.now();
    const parsed = this.extractStructure(context.content);
    const entities = options?.extractEntities !== false
      ? this.extractEntities(context.content)
      : [];
    const relationships = options?.extractRelationships !== false
      ? this.extractRelationships(context.content)
      : [];
    const parseTime = performance.now() - startTime;

    const parsedContext: ParsedContext = {
      context,
      parsed,
      entities,
      relationships,
      confidence: this.calculateParseConfidence(parsed, entities, relationships),
    };

    this.parseHistory.push(parsedContext);
    this.totalParseTime += parseTime;
    return parsedContext;
  }

  /**
   * Get context by ID
   */
  getContext(contextId: string): ContextData | null {
    return this.contexts.get(contextId) ?? null;
  }

  /**
   * Get all active contexts
   */
  getAllContexts(options?: {
    type?: string;
    includeExpired?: boolean;
  }): ContextData[] {
    const now = Date.now();
    let contexts = Array.from(this.contexts.values());

    if (!options?.includeExpired) {
      contexts = contexts.filter(c => !c.expires || c.expires > now);
    }

    if (options?.type) {
      contexts = contexts.filter(c => c.type === options.type);
    }

    return contexts;
  }

  /**
   * Get current state snapshot
   */
  getSnapshot(): Snapshot {
    return {
      contextsBuilt: this.contexts.size,
      contextsParsed: this.parseHistory.length,
      activeContexts: this.countActiveContexts(),
      lastBuild: this.lastBuildTime,
      averageParseTime: this.totalParseTime / Math.max(1, this.parseHistory.length),
    };
  }

  /**
   * Reset builder state
   */
  reset(): void {
    this.contexts.clear();
    this.parseHistory = [];
    this.lastBuildTime = Date.now();
    this.totalParseTime = 0;
  }

  /**
   * Generate comprehensive report
   */
  getReport(): {
    builder: string;
    version: string;
    snapshot: Snapshot;
    contexts: ContextData[];
    parseHistory: ParsedContext[];
    statistics: Record<string, unknown>;
  } {
    return {
      builder: 'ContextBuilder',
      version: 'V28',
      snapshot: this.getSnapshot(),
      contexts: Array.from(this.contexts.values()).slice(-20),
      parseHistory: this.parseHistory.slice(-20),
      statistics: {
        totalContexts: this.contexts.size,
        activeContexts: this.countActiveContexts(),
        totalParses: this.parseHistory.length,
        averageParseTime: this.totalParseTime / Math.max(1, this.parseHistory.length),
        byType: this.countByType(),
      },
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): Record<string, unknown> {
    return {
      builder: 'ContextBuilder',
      version: 'V28',
      timestamp: Date.now(),
      metrics: {
        totalContexts: this.contexts.size,
        activeContexts: this.countActiveContexts(),
        totalParses: this.parseHistory.length,
        averageParseTime: this.totalParseTime / Math.max(1, this.parseHistory.length),
        lastBuild: this.lastBuildTime,
      },
      contexts: Array.from(this.contexts.values()),
      parseHistory: this.parseHistory,
    };
  }

  // Private helper methods
  private inferContextType(data: unknown): string {
    if (Array.isArray(data)) return 'array';
    if (data && typeof data === 'object') {
      if ('type' in (data as object)) return 'typed';
      if ('content' in (data as object)) return 'document';
      return 'object';
    }
    return typeof data;
  }

  private sanitizeContent(data: unknown, maxDepth: number, depth: number = 0): unknown {
    if (depth >= maxDepth) return '[max depth reached]';
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeContent(item, maxDepth, depth + 1));
    }
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (key.startsWith('_')) continue;
      sanitized[key] = this.sanitizeContent(value, maxDepth, depth + 1);
    }
    return sanitized;
  }

  private generateMetadata(data: unknown): Record<string, unknown> {
    return {
      size: JSON.stringify(data).length,
      keys: data && typeof data === 'object' ? Object.keys(data).length : 0,
      type: typeof data,
    };
  }

  private validateContext(context: ContextData): boolean {
    if (!context.id || !context.type) return false;
    if (context.content === undefined) return false;
    if (context.expires && context.expires < Date.now()) return false;
    return true;
  }

  private extractStructure(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return { primitive: data };
    }
    if (Array.isArray(data)) {
      return { items: data.length, structure: 'array' };
    }
    const keys = Object.keys(data);
    return {
      keys,
      structure: 'object',
      nested: keys.some(k => typeof (data as Record<string, unknown>)[k] === 'object'),
    };
  }

  private extractEntities(data: unknown): string[] {
    const entities: string[] = [];
    if (typeof data === 'string') {
      const words = data.match(/\b[A-Z][a-z]+\b/g) ?? [];
      entities.push(...words);
    } else if (Array.isArray(data)) {
      for (const item of data) {
        entities.push(...this.extractEntities(item));
      }
    } else if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (typeof value === 'string' && /^[A-Z]/.test(value)) {
          entities.push(value);
        }
      }
    }
    return [...new Set(entities)];
  }

  private extractRelationships(data: unknown): Array<{ source: string; target: string; type: string }> {
    const relationships: Array<{ source: string; target: string; type: string }> = [];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (typeof value === 'string' && value.startsWith('ref:')) {
          relationships.push({
            source: 'parent',
            target: value.replace('ref:', ''),
            type: key,
          });
        }
      }
    }
    return relationships;
  }

  private calculateParseConfidence(
    parsed: unknown,
    entities: string[],
    relationships: Array<{ source: string; target: string; type: string }>
  ): number {
    let confidence = 0.5;
    if (parsed && typeof parsed === 'object' && Object.keys(parsed as object).length > 0) {
      confidence += 0.2;
    }
    if (entities.length > 0) confidence += 0.15;
    if (relationships.length > 0) confidence += 0.15;
    return Math.min(1, confidence);
  }

  private countActiveContexts(): number {
    const now = Date.now();
    return Array.from(this.contexts.values()).filter(c => !c.expires || c.expires > now).length;
  }

  private countByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const ctx of this.contexts.values()) {
      counts[ctx.type] = (counts[ctx.type] ?? 0) + 1;
    }
    return counts;
  }
}
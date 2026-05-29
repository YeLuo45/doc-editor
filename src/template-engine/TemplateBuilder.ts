/**
 * TemplateBuilder.ts - V69 Template Engine Builder
 * Creates and compiles document templates with variable placeholders
 */

type TemplateConfig = {
  maxVariables: number;
  maxTemplateSize: number;
  strictMode: boolean;
  autoEscape: boolean;
  cacheCompiled: boolean;
};

interface CompiledTemplate {
  id: string;
  source: string;
  ast: unknown;
  variables: string[];
  createdAt: number;
  compiledAt: number;
}

interface TemplateAST {
  type: string;
  children?: TemplateAST[];
  value?: string;
  variable?: string;
}

export class TemplateBuilder {
  private templates: Map<string, CompiledTemplate> = new Map();
  public readonly config: TemplateConfig;

  constructor(config: Partial<TemplateConfig> = {}) {
    this.config = {
      maxVariables: config.maxVariables ?? 50,
      maxTemplateSize: config.maxTemplateSize ?? 1024 * 10, // 10KB
      strictMode: config.strictMode ?? false,
      autoEscape: config.autoEscape ?? true,
      cacheCompiled: config.cacheCompiled ?? true,
    };
  }

  create(source: string, id?: string): CompiledTemplate {
    if (!source || typeof source !== 'string') {
      throw new Error('Invalid template source: must be non-empty string');
    }

    if (source.length > this.config.maxTemplateSize) {
      throw new Error(`Template exceeds max size: ${source.length} > ${this.config.maxTemplateSize}`);
    }

    const templateId = id || this.generateId();
    const variables = this.extractVariables(source);
    
    if (variables.length > this.config.maxVariables) {
      throw new Error(`Too many variables: ${variables.length} > ${this.config.maxVariables}`);
    }

    const compiled: CompiledTemplate = {
      id: templateId,
      source,
      ast: this.parseAST(source),
      variables,
      createdAt: Date.now(),
      compiledAt: Date.now(),
    };

    this.templates.set(templateId, compiled);
    return compiled;
  }

  compile(source: string, id?: string): CompiledTemplate {
    // Compile is same as create but forces recompilation
    const templateId = id || this.generateId();
    const existing = this.templates.get(templateId);
    
    if (existing) {
      const recompiled: CompiledTemplate = {
        ...existing,
        source,
        ast: this.parseAST(source),
        variables: this.extractVariables(source),
        compiledAt: Date.now(),
      };
      this.templates.set(templateId, recompiled);
      return recompiled;
    }

    return this.create(source, templateId);
  }

  getTemplate(id: string): CompiledTemplate | null {
    return this.templates.get(id) || null;
  }

  getAllTemplates(): CompiledTemplate[] {
    return Array.from(this.templates.values());
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  private extractVariables(source: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(source)) !== null) {
      const varName = match[1];
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }
    
    return variables;
  }

  private parseAST(source: string): TemplateAST {
    const regex = /\{\{(\w+)\}\}|([^{}]+)/g;
    const children: TemplateAST[] = [];
    let match;

    while ((match = regex.exec(source)) !== null) {
      if (match[1]) {
        children.push({ type: 'variable', variable: match[1] });
      } else if (match[2]) {
        children.push({ type: 'literal', value: match[2] });
      }
    }

    return { type: 'root', children };
  }

  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    const templates = this.getAllTemplates();
    const totalVariables = templates.reduce((sum, t) => sum + t.variables.length, 0);
    
    return {
      metrics: {
        templateCount: templates.length,
        totalVariables,
        avgVariablesPerTemplate: templates.length > 0 ? totalVariables / templates.length : 0,
        maxVariables: this.config.maxVariables,
        strictMode: this.config.strictMode,
        autoEscape: this.config.autoEscape,
      },
    };
  }

  reset(): void {
    this.templates.clear();
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== TemplateBuilder Report ===',
      `Templates: ${snapshot.metrics.templateCount}`,
      `Total Variables: ${snapshot.metrics.totalVariables}`,
      `Avg Variables/Template: ${snapshot.metrics.avgVariablesPerTemplate?.toFixed(2)}`,
      `Max Variables Allowed: ${snapshot.metrics.maxVariables}`,
      `Strict Mode: ${snapshot.metrics.strictMode ? 'ON' : 'OFF'}`,
      `Auto Escape: ${snapshot.metrics.autoEscape ? 'ON' : 'OFF'}`,
      '============================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v69-template-engine/builder' };
  }
}
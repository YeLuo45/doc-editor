/**
 * V62 Notification Engine - NotificationFormatter
 * Format notifications with format/applyTemplate/getTemplates
 */

export type TemplateVariable = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  defaultValue?: unknown;
};

export interface NotificationTemplate {
  id: string;
  name: string;
  template: string;
  variables: TemplateVariable[];
  createdAt: number;
  description?: string;
}

export interface FormatterConfig {
  defaultLocale: string;
  dateFormat: string;
  enableHtml: boolean;
  maxTemplateSize: number;
  strictMode: boolean;
}

export class NotificationFormatter {
  private _templates: Map<string, NotificationTemplate> = new Map();
  private _config: FormatterConfig;
  private _metrics = {
    totalFormatted: 0,
    totalTemplateApplied: 0,
    templateCacheHits: 0,
    templateCacheMisses: 0,
  };

  constructor(config: FormatterConfig) {
    this._config = { ...config };
  }

  get config(): FormatterConfig {
    return { ...this._config };
  }

  get templates(): NotificationTemplate[] {
    return Array.from(this._templates.values());
  }

  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  format(templateId: string, variables: Record<string, unknown>): string {
    const template = this._templates.get(templateId);
    if (!template) {
      this._metrics.templateCacheMisses++;
      throw new Error(`Template '${templateId}' not found`);
    }

    this._metrics.totalFormatted++;
    this._metrics.templateCacheHits++;

    return this._applyTemplateVariables(template.template, variables, template.variables);
  }

  applyTemplate(templateId: string, data: Record<string, unknown>): { formatted: string; template: NotificationTemplate } {
    const template = this._templates.get(templateId);
    if (!template) {
      this._metrics.templateCacheMisses++;
      throw new Error(`Template '${templateId}' not found`);
    }

    this._metrics.totalTemplateApplied++;
    this._metrics.templateCacheHits++;

    const variables = this._extractVariables(data, template.variables);
    const formatted = this._applyTemplateVariables(template.template, variables, template.variables);

    return { formatted, template };
  }

  getTemplates(filter?: { name?: string }): NotificationTemplate[] {
    if (!filter || !filter.name) return this.templates;
    return this.templates.filter(t => t.name.includes(filter.name!));
  }

  addTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt'>): NotificationTemplate {
    if (template.template.length > this._config.maxTemplateSize) {
      throw new Error(`Template size exceeds maximum (${this._config.maxTemplateSize})`);
    }

    const newTemplate: NotificationTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: Date.now(),
    };

    this._templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  removeTemplate(id: string): boolean {
    return this._templates.delete(id);
  }

  private _extractVariables(data: Record<string, unknown>, variableDefs: TemplateVariable[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const varDef of variableDefs) {
      if (data[varDef.name] !== undefined) {
        result[varDef.name] = this._coerceType(data[varDef.name], varDef.type);
      } else if (varDef.defaultValue !== undefined) {
        result[varDef.name] = varDef.defaultValue;
      }
    }

    return result;
  }

  private _coerceType(value: unknown, type: TemplateVariable['type']): unknown {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(Number(value) * 1000).toISOString();
      default:
        return value;
    }
  }

  private _applyTemplateVariables(
    template: string,
    variables: Record<string, unknown>,
    variableDefs: TemplateVariable[]
  ): string {
    let result = template;

    for (const varDef of variableDefs) {
      const value = variables[varDef.name];
      const placeholder = `{{${varDef.name}}}`;
      const replacement = value !== undefined ? String(value) : varDef.defaultValue !== undefined ? String(varDef.defaultValue) : '';

      result = result.split(placeholder).join(replacement);
    }

    // Apply date formatting if configured
    if (this._config.dateFormat && result.includes('{{date}}')) {
      const formattedDate = new Date().toLocaleDateString(this._config.defaultLocale);
      result = result.split('{{date}}').join(formattedDate);
    }

    return result;
  }

  getSnapshot(): { metrics: typeof NotificationFormatter.prototype._metrics; config: FormatterConfig; templateCount: number } {
    return {
      metrics: { ...this._metrics },
      config: this.config,
      templateCount: this._templates.size,
    };
  }

  reset(): void {
    this._templates.clear();
    this._metrics = {
      totalFormatted: 0,
      totalTemplateApplied: 0,
      templateCacheHits: 0,
      templateCacheMisses: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== NotificationFormatter Report ===',
      `Total Formatted: ${snapshot.metrics.totalFormatted}`,
      `Total Template Applied: ${snapshot.metrics.totalTemplateApplied}`,
      `Cache Hits: ${snapshot.metrics.templateCacheHits}`,
      `Cache Misses: ${snapshot.metrics.templateCacheMisses}`,
      `Stored Templates: ${snapshot.templateCount}`,
      `Default Locale: ${snapshot.config.defaultLocale}`,
      `Date Format: ${snapshot.config.dateFormat}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof NotificationFormatter.prototype._metrics } {
    return {
      version: 'V62',
      metrics: { ...this._metrics },
    };
  }
}

export default NotificationFormatter;
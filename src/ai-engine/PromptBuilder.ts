/**
 * V59 AI Engine - PromptBuilder.ts
 * Prompt Construction and Management Module
 */

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: string;
  usageCount: number;
}

export interface PromptConfig {
  maxLength: number;
  defaultVariables: Record<string, string>;
  enablePresets: boolean;
}

export interface PromptSnapshot {
  builtCount: number;
  combinedCount: number;
  presetCount: number;
  totalVariablesReplaced: number;
}

const DEFAULT_PRESETS: PromptTemplate[] = [
  { id: 'summarize', name: 'Summarize', template: 'Summarize the following content:\n\n{{content}}', variables: ['content'], category: 'document', usageCount: 0 },
  { id: 'expand', name: 'Expand', template: 'Expand on this topic with detailed explanation:\n\n{{topic}}', variables: ['topic'], category: 'document', usageCount: 0 },
  { id: 'review', name: 'Review', template: 'Review the following text and provide feedback:\n\n{{content}}\n\nFocus on: {{focus_area}}', variables: ['content', 'focus_area'], category: 'review', usageCount: 0 },
  { id: 'translate', name: 'Translate', template: 'Translate the following to {{target_language}}:\n\n{{content}}', variables: ['content', 'target_language'], category: 'document', usageCount: 0 },
  { id: 'question', name: 'Question Answer', template: 'Answer the following question based on the context:\n\nContext: {{context}}\n\nQuestion: {{question}}', variables: ['context', 'question'], category: 'qa', usageCount: 0 },
];

export class PromptBuilder {
  private _config: PromptConfig;
  private presets: Map<string, PromptTemplate>;
  private builtCount = 0;
  private combinedCount = 0;
  private totalVariablesReplaced = 0;

  constructor(config: Partial<PromptConfig> = {}) {
    this._config = {
      maxLength: config.maxLength || 10000,
      defaultVariables: config.defaultVariables || {},
      enablePresets: config.enablePresets ?? true,
    };
    this.presets = new Map();
    DEFAULT_PRESETS.forEach(p => this.presets.set(p.id, { ...p }));
  }

  get config(): PromptConfig {
    return { ...this._config };
  }

  build(template: string, variables: Record<string, string>): string {
    let result = template;
    let replaced = 0;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      if (result.includes(placeholder)) {
        result = result.replace(new RegExp(placeholder, 'g'), value);
        replaced++;
        this.totalVariablesReplaced++;
      }
    }

    for (const [key, value] of Object.entries(this._config.defaultVariables)) {
      const placeholder = `{{${key}}}`;
      if (result.includes(placeholder) && !variables[key]) {
        result = result.replace(new RegExp(placeholder, 'g'), value);
        replaced++;
        this.totalVariablesReplaced++;
      }
    }

    if (result.length > this._config.maxLength) {
      result = result.substring(0, this._config.maxLength);
    }

    this.builtCount++;
    return result;
  }

  combine(prompts: string[], separator: string = '\n\n'): string {
    const combined = prompts.filter(p => p.length > 0).join(separator);
    this.combinedCount++;
    return combined;
  }

  preset(presetId: string, variables: Record<string, string>): string | null {
    const preset = this.presets.get(presetId);
    if (!preset) return null;

    preset.usageCount++;
    return this.build(preset.template, variables);
  }

  getPresets(): PromptTemplate[] {
    return Array.from(this.presets.values());
  }

  getPreset(id: string): PromptTemplate | undefined {
    return this.presets.get(id);
  }

  addPreset(preset: PromptTemplate): void {
    this.presets.set(preset.id, { ...preset, usageCount: 0 });
  }

  removePreset(presetId: string): boolean {
    return this.presets.delete(presetId);
  }

  updatePreset(presetId: string, updates: Partial<PromptTemplate>): boolean {
    const preset = this.presets.get(presetId);
    if (!preset) return false;
    this.presets.set(presetId, { ...preset, ...updates, id: presetId });
    return true;
  }

  setDefaultVariable(key: string, value: string): void {
    this._config.defaultVariables[key] = value;
  }

  clearDefaultVariables(): void {
    this._config.defaultVariables = {};
  }

  getSnapshot(): { metrics: PromptSnapshot } {
    return {
      metrics: {
        builtCount: this.builtCount,
        combinedCount: this.combinedCount,
        presetCount: this.presets.size,
        totalVariablesReplaced: this.totalVariablesReplaced,
      },
    };
  }

  reset(): void {
    this.builtCount = 0;
    this.combinedCount = 0;
    this.totalVariablesReplaced = 0;
    this._config = {
      maxLength: 10000,
      defaultVariables: {},
      enablePresets: true,
    };
    this.presets.clear();
    DEFAULT_PRESETS.forEach(p => this.presets.set(p.id, { ...p }));
  }

  getReport(): string {
    return [
      '=== Prompt Builder Report ===',
      `Built Count: ${this.builtCount}`,
      `Combined Count: ${this.combinedCount}`,
      `Total Presets: ${this.presets.size}`,
      `Total Variables Replaced: ${this.totalVariablesReplaced}`,
      `Max Length: ${this._config.maxLength}`,
      `Default Variables: ${Object.keys(this._config.defaultVariables).join(', ') || 'None'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V59-ai-engine-1.0',
    };
  }
}
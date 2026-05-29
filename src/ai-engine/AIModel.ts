/**
 * V59 AI Engine - AIModel.ts
 * AI Model Management Module
 */

export interface AIModelConfig {
  modelId: string;
  provider: string;
  name: string;
  version: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  enabled: boolean;
}

export interface AIModelSnapshot {
  activeModel: string | null;
  selectionHistory: string[];
  lastSelectedAt: number | null;
  totalSelections: number;
}

const DEFAULT_MODELS: AIModelConfig[] = [
  { modelId: 'gpt-4o', provider: 'openai', name: 'GPT-4 Omni', version: '1.0', maxTokens: 128000, temperature: 0.7, topP: 0.9, enabled: true },
  { modelId: 'gpt-4o-mini', provider: 'openai', name: 'GPT-4 Omni Mini', version: '1.0', maxTokens: 128000, temperature: 0.7, topP: 0.9, enabled: true },
  { modelId: 'claude-3-5-sonnet', provider: 'anthropic', name: 'Claude 3.5 Sonnet', version: '2.0', maxTokens: 200000, temperature: 0.8, topP: 0.9, enabled: true },
  { modelId: 'claude-3-5-haiku', provider: 'anthropic', name: 'Claude 3.5 Haiku', version: '2.0', maxTokens: 200000, temperature: 0.8, topP: 0.9, enabled: true },
  { modelId: 'gemini-1-5-pro', provider: 'google', name: 'Gemini 1.5 Pro', version: '1.0', maxTokens: 1000000, temperature: 0.75, topP: 0.95, enabled: true },
  { modelId: 'gemini-1-5-flash', provider: 'google', name: 'Gemini 1.5 Flash', version: '1.0', maxTokens: 1000000, temperature: 0.75, topP: 0.95, enabled: true },
];

export class AIModel {
  private _config: AIModelConfig;
  private models: Map<string, AIModelConfig>;
  private activeModelId: string | null = null;
  private selectionHistory: string[] = [];
  private lastSelectedAt: number | null = null;
  private totalSelections = 0;

  constructor(config: Partial<AIModelConfig> = {}) {
    this._config = {
      modelId: config.modelId || 'gpt-4o',
      provider: config.provider || 'openai',
      name: config.name || 'GPT-4 Omni',
      version: config.version || '1.0',
      maxTokens: config.maxTokens || 128000,
      temperature: config.temperature || 0.7,
      topP: config.topP || 0.9,
      enabled: config.enabled ?? true,
    };
    this.models = new Map();
    DEFAULT_MODELS.forEach(m => this.models.set(m.modelId, m));
  }

  get config(): AIModelConfig {
    return { ...this._config };
  }

  select(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model || !model.enabled) {
      return false;
    }
    this.activeModelId = modelId;
    this._config = { ...model };
    this.selectionHistory.push(modelId);
    this.lastSelectedAt = Date.now();
    this.totalSelections++;
    return true;
  }

  deselect(): void {
    this.activeModelId = null;
    this._config = {
      modelId: '',
      provider: '',
      name: '',
      version: '',
      maxTokens: 0,
      temperature: 0,
      topP: 0,
      enabled: false,
    };
  }

  getModels(): AIModelConfig[] {
    return Array.from(this.models.values());
  }

  getActiveModel(): AIModelConfig | null {
    if (!this.activeModelId) return null;
    return this.models.get(this.activeModelId) || null;
  }

  addModel(model: AIModelConfig): void {
    this.models.set(model.modelId, model);
  }

  removeModel(modelId: string): boolean {
    if (this.activeModelId === modelId) {
      this.deselect();
    }
    return this.models.delete(modelId);
  }

  updateModel(modelId: string, updates: Partial<AIModelConfig>): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;
    const updated = { ...model, ...updates, modelId };
    this.models.set(modelId, updated);
    if (this.activeModelId === modelId) {
      this._config = { ...updated };
    }
    return true;
  }

  getSnapshot(): { metrics: AIModelSnapshot } {
    return {
      metrics: {
        activeModel: this.activeModelId,
        selectionHistory: [...this.selectionHistory],
        lastSelectedAt: this.lastSelectedAt,
        totalSelections: this.totalSelections,
      },
    };
  }

  reset(): void {
    this.activeModelId = null;
    this.selectionHistory = [];
    this.lastSelectedAt = null;
    this.totalSelections = 0;
    this._config = {
      modelId: '',
      provider: '',
      name: '',
      version: '',
      maxTokens: 0,
      temperature: 0,
      topP: 0,
      enabled: false,
    };
  }

  getReport(): string {
    const active = this.getActiveModel();
    return [
      '=== AI Model Report ===',
      `Active Model: ${active ? `${active.name} (${active.modelId})` : 'None'}`,
      `Provider: ${active?.provider || 'N/A'}`,
      `Total Models: ${this.models.size}`,
      `Total Selections: ${this.totalSelections}`,
      `Selection History: ${this.selectionHistory.slice(-5).join(', ') || 'Empty'}`,
      `Last Selected: ${this.lastSelectedAt ? new Date(this.lastSelectedAt).toISOString() : 'Never'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V59-ai-engine-1.0',
    };
  }
}
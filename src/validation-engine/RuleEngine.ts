/**
 * RuleEngine.ts - V82 Rule Engine
 * Rule evaluation and management for validation
 */

export type RuleCondition = {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists';
  value: unknown;
};

export type RuleAction = {
  type: 'error' | 'warning' | 'log';
  message: string;
};

export type RuleDefinition = {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  enabled?: boolean;
};

export type RuleConfig = {
  version: string;
  stopOnFirstError?: boolean;
  enableLogging?: boolean;
};

type Snapshot = {
  metrics: {
    totalEvaluations: number;
    totalMatches: number;
    lastEvaluation: number;
  };
};

export class RuleEngine {
  private _config: RuleConfig;
  private _rules: Map<string, RuleDefinition> = new Map();
  private _metrics = {
    totalEvaluations: 0,
    totalMatches: 0,
    lastEvaluation: 0,
  };

  constructor(config: RuleConfig) {
    this._config = { ...config };
    if (this._config.stopOnFirstError === undefined) this._config.stopOnFirstError = false;
    if (this._config.enableLogging === undefined) this._config.enableLogging = true;
  }

  get config(): RuleConfig {
    return { ...this._config };
  }

  evaluate(data: Record<string, unknown>): { matched: string[]; actions: RuleAction[] } {
    const matched: string[] = [];
    const actions: RuleAction[] = [];
    this._metrics.totalEvaluations++;
    this._metrics.lastEvaluation = Date.now();

    for (const [id, rule] of this._rules) {
      if (rule.enabled === false) continue;

      if (this._evaluateCondition(rule.condition, data)) {
        matched.push(id);
        actions.push(rule.action);
        this._metrics.totalMatches++;

        if (this._config.stopOnFirstError && rule.action.type === 'error') {
          break;
        }
      }
    }

    return { matched, actions };
  }

  private _evaluateCondition(condition: RuleCondition, data: Record<string, unknown>): boolean {
    const fieldValue = this._getFieldValue(condition.field, data);

    switch (condition.operator) {
      case 'exists':
        return fieldValue !== undefined;
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'gt':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue > condition.value;
      case 'lt':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue < condition.value;
      case 'gte':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue >= condition.value;
      case 'lte':
        return typeof fieldValue === 'number' && typeof condition.value === 'number' && fieldValue <= condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && typeof condition.value === 'string' && fieldValue.includes(condition.value);
      default:
        return false;
    }
  }

  private _getFieldValue(path: string, data: Record<string, unknown>): unknown {
    const parts = path.split('.');
    let value: unknown = data;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return value;
  }

  addRule(rule: RuleDefinition): void {
    if (!rule.id || !rule.name || !rule.condition || !rule.action) {
      throw new Error('Invalid rule: id, name, condition, and action are required');
    }
    this._rules.set(rule.id, { ...rule, enabled: rule.enabled !== false });
  }

  removeRule(ruleId: string): boolean {
    return this._rules.delete(ruleId);
  }

  getRules(): RuleDefinition[] {
    return Array.from(this._rules.values());
  }

  getSnapshot(): Snapshot {
    return {
      metrics: { ...this._metrics },
    };
  }

  reset(): void {
    this._rules.clear();
    this._metrics = { totalEvaluations: 0, totalMatches: 0, lastEvaluation: 0 };
  }

  getReport(): string {
    return [
      '=== RuleEngine Report ===',
      `Version: ${this._config.version}`,
      `Total Rules: ${this._rules.size}`,
      `Total Evaluations: ${this._metrics.totalEvaluations}`,
      `Total Matches: ${this._metrics.totalMatches}`,
      `Last Evaluation: ${new Date(this._metrics.lastEvaluation).toISOString()}`,
      `Stop on First Error: ${this._config.stopOnFirstError ?? false}`,
      `Enable Logging: ${this._config.enableLogging ?? true}`,
      `=====================`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: Snapshot } {
    return {
      version: this._config.version,
      metrics: this.getSnapshot(),
    };
  }
}

export default RuleEngine;
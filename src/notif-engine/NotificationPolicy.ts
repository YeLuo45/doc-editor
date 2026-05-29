/**
 * V62 Notification Engine - NotificationPolicy
 * Policy rules with addRule/removeRule/evaluate/getRules
 */

export type RuleCondition = {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
  value: unknown;
};

export type RuleAction = {
  type: 'allow' | 'block' | 'transform' | 'redirect';
  target?: string;
  metadata?: Record<string, unknown>;
};

export interface NotificationRule {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: RuleCondition[];
  action: RuleAction;
  createdAt: number;
  description?: string;
}

export interface NotificationPolicyConfig {
  defaultPolicy: 'allow' | 'block';
  enableLogging: boolean;
  maxRules: number;
  evaluationMode: 'first-match' | 'all-match';
}

export class NotificationPolicy {
  private _rules: Map<string, NotificationRule> = new Map();
  private _config: NotificationPolicyConfig;
  private _metrics = {
    totalEvaluated: 0,
    totalAllowed: 0,
    totalBlocked: 0,
    totalTransformed: 0,
  };

  constructor(config: NotificationPolicyConfig) {
    this._config = { ...config };
  }

  get config(): NotificationPolicyConfig {
    return { ...this._config };
  }

  get rules(): NotificationRule[] {
    return Array.from(this._rules.values()).sort((a, b) => b.priority - a.priority);
  }

  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addRule(rule: Omit<NotificationRule, 'id' | 'createdAt'>): NotificationRule {
    if (this._rules.size >= this._config.maxRules) {
      throw new Error(`Maximum rules limit (${this._config.maxRules}) reached`);
    }

    const newRule: NotificationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: Date.now(),
    };

    this._rules.set(newRule.id, newRule);
    return newRule;
  }

  removeRule(id: string): boolean {
    return this._rules.delete(id);
  }

  evaluate(notification: Record<string, unknown>): { allowed: boolean; rule?: NotificationRule; transformed?: Record<string, unknown> } {
    this._metrics.totalEvaluated++;

    const sortedRules = this.rules.filter(r => r.enabled);

    for (const rule of sortedRules) {
      const matches = this._checkConditions(rule.conditions, notification);
      if (matches) {
        switch (rule.action.type) {
          case 'allow':
            this._metrics.totalAllowed++;
            return { allowed: true, rule };
          case 'block':
            this._metrics.totalBlocked++;
            return { allowed: false, rule };
          case 'transform':
            this._metrics.totalTransformed++;
            return {
              allowed: true,
              rule,
              transformed: { ...notification, ...rule.action.metadata },
            };
          case 'redirect':
            this._metrics.totalAllowed++;
            return { allowed: true, rule };
        }
      }
    }

    // No rule matched - apply default policy
    if (this._config.defaultPolicy === 'allow') {
      this._metrics.totalAllowed++;
      return { allowed: true };
    }
    this._metrics.totalBlocked++;
    return { allowed: false };
  }

  private _checkConditions(conditions: RuleCondition[], data: Record<string, unknown>): boolean {
    if (this._config.evaluationMode === 'first-match') {
      return conditions.some(condition => this._evaluateCondition(condition, data));
    }
    return conditions.every(condition => this._evaluateCondition(condition, data));
  }

  private _evaluateCondition(condition: RuleCondition, data: Record<string, unknown>): boolean {
    const fieldValue = data[condition.field];
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'contains':
        return typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.includes(value);
      case 'greaterThan':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue > value;
      case 'lessThan':
        return typeof fieldValue === 'number' && typeof value === 'number' && fieldValue < value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      default:
        return false;
    }
  }

  getRules(filter?: { enabled?: boolean }): NotificationRule[] {
    if (!filter) return this.rules;
    return this.rules.filter(r => filter.enabled === undefined || r.enabled === filter.enabled);
  }

  getSnapshot(): { metrics: typeof NotificationPolicy.prototype._metrics; config: NotificationPolicyConfig; ruleCount: number } {
    return {
      metrics: { ...this._metrics },
      config: this.config,
      ruleCount: this._rules.size,
    };
  }

  reset(): void {
    this._rules.clear();
    this._metrics = {
      totalEvaluated: 0,
      totalAllowed: 0,
      totalBlocked: 0,
      totalTransformed: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== NotificationPolicy Report ===',
      `Total Evaluated: ${snapshot.metrics.totalEvaluated}`,
      `Total Allowed: ${snapshot.metrics.totalAllowed}`,
      `Total Blocked: ${snapshot.metrics.totalBlocked}`,
      `Total Transformed: ${snapshot.metrics.totalTransformed}`,
      `Active Rules: ${snapshot.ruleCount}`,
      `Default Policy: ${snapshot.config.defaultPolicy}`,
      `Evaluation Mode: ${snapshot.config.evaluationMode}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof NotificationPolicy.prototype._metrics } {
    return {
      version: 'V62',
      metrics: { ...this._metrics },
    };
  }
}

export default NotificationPolicy;
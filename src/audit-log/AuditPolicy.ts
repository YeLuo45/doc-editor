/**
 * AuditPolicy.ts - Audit policy management for doc-editor V63
 * Provides rule management and policy evaluation
 */

export type PolicyEffect = 'ALLOW' | 'DENY' | 'LOG' | 'QUARANTINE';

export interface AuditRule {
  id: string;
  name: string;
  resourceType: string;
  action: string;
  conditions: Record<string, unknown>;
  effect: PolicyEffect;
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyConfig {
  defaultEffect?: PolicyEffect;
  enableQuarantine?: boolean;
  maxRules?: number;
  evaluationMode?: 'FIRST_MATCH' | 'ALL_MATCH';
}

interface PolicySnapshot {
  metrics: {
    totalRules: number;
    enabledRules: number;
    rulesByEffect: Record<PolicyEffect, number>;
    rulesByResourceType: Record<string, number>;
    evaluationCount: number;
    lastEvaluation?: string;
  };
}

const DEFAULT_CONFIG: PolicyConfig = {
  defaultEffect: 'LOG',
  enableQuarantine: false,
  maxRules: 1000,
  evaluationMode: 'FIRST_MATCH',
};

export class AuditPolicy {
  private rules: AuditRule[] = [];
  private _config: PolicyConfig;
  private metrics: PolicySnapshot['metrics'] = {
    totalRules: 0,
    enabledRules: 0,
    rulesByEffect: { ALLOW: 0, DENY: 0, LOG: 0, QUARANTINE: 0 },
    rulesByResourceType: {},
    evaluationCount: 0,
    lastEvaluation: undefined,
  };

  constructor(config: PolicyConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get config(): PolicyConfig {
    return { ...this._config };
  }

  private generateId(): string {
    return `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private updateMetrics(): void {
    this.metrics.totalRules = this.rules.length;
    this.metrics.enabledRules = this.rules.filter((r) => r.enabled).length;
    this.metrics.rulesByEffect = { ALLOW: 0, DENY: 0, LOG: 0, QUARANTINE: 0 };
    this.metrics.rulesByResourceType = {};
    for (const rule of this.rules) {
      if (rule.enabled) {
        this.metrics.rulesByEffect[rule.effect]++;
        this.metrics.rulesByResourceType[rule.resourceType] =
          (this.metrics.rulesByResourceType[rule.resourceType] || 0) + 1;
      }
    }
  }

  addRule(rule: Omit<AuditRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    if (this.rules.length >= (this._config.maxRules || 1000)) {
      throw new Error('Maximum number of rules reached');
    }

    const newRule: AuditRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.push(newRule);
    this.rules.sort((a, b) => b.priority - a.priority);
    this.updateMetrics();

    return newRule.id;
  }

  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((r) => r.id === ruleId);
    if (index === -1) return false;

    this.rules.splice(index, 1);
    this.updateMetrics();
    return true;
  }

  getRules(options?: {
    resourceType?: string;
    action?: string;
    effect?: PolicyEffect;
    enabled?: boolean;
  }): AuditRule[] {
    let filtered = [...this.rules];

    if (options?.resourceType) {
      filtered = filtered.filter((r) => r.resourceType === options.resourceType);
    }
    if (options?.action) {
      filtered = filtered.filter((r) => r.action === options.action);
    }
    if (options?.effect) {
      filtered = filtered.filter((r) => r.effect === options.effect);
    }
    if (options?.enabled !== undefined) {
      filtered = filtered.filter((r) => r.enabled === options.enabled);
    }

    return filtered;
  }

  evaluate(
    resourceType: string,
    action: string,
    context: Record<string, unknown> = {}
  ): PolicyEffect {
    this.metrics.evaluationCount++;
    this.metrics.lastEvaluation = new Date().toISOString();

    const matchingRules = this.rules.filter(
      (rule) =>
        rule.enabled &&
        rule.resourceType === resourceType &&
        (rule.action === '*' || rule.action === action)
    );

    if (matchingRules.length === 0) {
      return this._config.defaultEffect || 'LOG';
    }

    for (const rule of matchingRules) {
      if (this.matchesConditions(rule.conditions, context)) {
        return rule.effect;
      }
    }

    return this._config.defaultEffect || 'LOG';
  }

  private matchesConditions(
    conditions: Record<string, unknown>,
    context: Record<string, unknown>
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }

  getSnapshot(): PolicySnapshot {
    return {
      metrics: { ...this.metrics },
    };
  }

  reset(): void {
    this.rules = [];
    this.metrics = {
      totalRules: 0,
      enabledRules: 0,
      rulesByEffect: { ALLOW: 0, DENY: 0, LOG: 0, QUARANTINE: 0 },
      rulesByResourceType: {},
      evaluationCount: 0,
      lastEvaluation: undefined,
    };
  }

  getReport(): string {
    const lines = [
      '=== Audit Policy Report ===',
      `Total Rules: ${this.metrics.totalRules}`,
      `Enabled Rules: ${this.metrics.enabledRules}`,
      `Default Effect: ${this._config.defaultEffect}`,
      `Evaluation Mode: ${this._config.evaluationMode}`,
      '',
      'Rules by Effect:',
      ...Object.entries(this.metrics.rulesByEffect).map(
        ([effect, count]) => `  ${effect}: ${count}`
      ),
      '',
      'Rules by Resource Type:',
      ...Object.entries(this.metrics.rulesByResourceType).map(
        ([type, count]) => `  ${type}: ${count}`
      ),
      '',
      `Total Evaluations: ${this.metrics.evaluationCount}`,
      `Last Evaluation: ${this.metrics.lastEvaluation || 'N/A'}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string; metrics: PolicySnapshot['metrics'] } {
    return {
      version: 'V63',
      metrics: { ...this.metrics },
    };
  }
}

export default AuditPolicy;
/**
 * Policy.ts - V36 Iteration 6
 * Access policy with check/allow/deny/getPolicies capabilities
 */

export type Resource = string;
export type Action = 'read' | 'write' | 'delete' | 'admin' | '*';
export type Role = string;

export interface PolicyRule {
  id: string;
  name: string;
  roles: Role[];
  resources: Resource[];
  actions: Action[];
  effect: 'allow' | 'deny';
  conditions?: Record<string, unknown>;
}

export interface PolicySnapshot {
  rules: PolicyRule[];
  metrics: {
    totalRules: number;
    allows: number;
    denies: number;
    checks: number;
    roleCount: number;
    resourceCount: number;
  };
}

export interface PolicyCheckResult {
  allowed: boolean;
  rule?: PolicyRule;
  reason?: string;
}

export class Policy {
  private rules: PolicyRule[] = [];
  private allows: number = 0;
  private denies: number = 0;
  private checks: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Add a policy rule
   */
  add(name: string, roles: Role[], resources: Resource[], actions: Action[], effect: 'allow' | 'deny'): PolicyRule {
    const rule: PolicyRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      roles,
      resources,
      actions,
      effect,
    };

    this.rules.push(rule);
    return rule;
  }

  /**
   * Check if a role/resource/action combination is allowed
   */
  check(role: Role, resource: Resource, action: Action): PolicyCheckResult {
    this.checks++;

    // Find matching rules - first match wins (deny takes precedence in same effect)
    for (const rule of this.rules) {
      if (this.matchesRule(role, resource, action, rule)) {
        if (rule.effect === 'deny') {
          this.denies++;
          return {
            allowed: false,
            rule,
            reason: `Denied by rule: ${rule.name}`,
          };
        } else {
          this.allows++;
          return {
            allowed: true,
            rule,
            reason: `Allowed by rule: ${rule.name}`,
          };
        }
      }
    }

    // Default deny if no rule matches
    this.denies++;
    return {
      allowed: false,
      reason: 'No matching policy rule found',
    };
  }

  /**
   * Check if combination matches a rule
   */
  private matchesRule(role: Role, resource: Resource, action: Action, rule: PolicyRule): boolean {
    // Check role match
    if (!rule.roles.includes('*') && !rule.roles.includes(role)) {
      return false;
    }

    // Check resource match
    if (!rule.resources.includes('*') && !rule.resources.includes(resource)) {
      return false;
    }

    // Check action match
    if (!rule.actions.includes('*') && !rule.actions.includes(action)) {
      return false;
    }

    return true;
  }

  /**
   * Shorthand for allowing
   */
  allow(role: Role, resource: Resource, action: Action): boolean {
    return this.check(role, resource, action).allowed;
  }

  /**
   * Shorthand for denying
   */
  deny(role: Role, resource: Resource, action: Action): boolean {
    return !this.check(role, resource, action).allowed;
  }

  /**
   * Get all policies
   */
  getPolicies(): PolicyRule[] {
    return [...this.rules];
  }

  /**
   * Get policies by effect
   */
  getPoliciesByEffect(effect: 'allow' | 'deny'): PolicyRule[] {
    return this.rules.filter(r => r.effect === effect);
  }

  /**
   * Remove a rule by ID
   */
  remove(ruleId: string): boolean {
    const idx = this.rules.findIndex(r => r.id === ruleId);
    if (idx !== -1) {
      this.rules.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all rules
   */
  clear(): void {
    this.rules = [];
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): PolicySnapshot {
    const rolesSet = new Set<Role>();
    const resourcesSet = new Set<Resource>();

    this.rules.forEach(r => {
      r.roles.forEach(role => rolesSet.add(role));
      r.resources.forEach(res => resourcesSet.add(res));
    });

    return {
      rules: [...this.rules],
      metrics: {
        totalRules: this.rules.length,
        allows: this.allows,
        denies: this.denies,
        checks: this.checks,
        roleCount: rolesSet.size,
        resourceCount: resourcesSet.size,
      },
    };
  }

  /**
   * Reset all policy state
   */
  reset(): void {
    this.rules = [];
    this.allows = 0;
    this.denies = 0;
    this.checks = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Policy Report ===',
      `Total Rules: ${snap.metrics.totalRules}`,
      `Checks: ${snap.metrics.checks}`,
      `Allows: ${snap.metrics.allows}`,
      `Denies: ${snap.metrics.denies}`,
      `Unique Roles: ${snap.metrics.roleCount}`,
      `Unique Resources: ${snap.metrics.resourceCount}`,
      '',
      'Rules:',
    ];

    if (this.rules.length === 0) {
      lines.push('  (none)');
    } else {
      this.rules.forEach(r => {
        lines.push(`  [${r.effect}] ${r.name} (${r.roles.join(', ')}) -> ${r.actions.join(', ')} on ${r.resources.join(', ')}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): Record<string, unknown> {
    const snap = this.getSnapshot();
    return {
      totalRules: snap.metrics.totalRules,
      allows: snap.metrics.allows,
      denies: snap.metrics.denies,
      checks: snap.metrics.checks,
      roleCount: snap.metrics.roleCount,
      resourceCount: snap.metrics.resourceCount,
    };
  }
}

export default Policy;
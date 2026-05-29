/**
 * CachePolicy.ts - V88 Cache Policy
 * Handles policy operations with apply/getPolicy/evaluate/getStats
 */

export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'random';
export type PolicyStatus = 'active' | 'paused' | 'disabled';

export interface CachePolicyConfig {
  evictionPolicy: EvictionPolicy;
  maxMemory: number;
  warningThreshold: number;
  criticalThreshold: number;
  autoEviction: boolean;
  namespace?: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  priority: number;
  condition: (stats: PolicyStats) => boolean;
  action: 'evict' | 'warn' | 'clear';
}

export interface PolicyStats {
  currentMemory: number;
  entriesCount: number;
  evictionCount: number;
  warningsIssued: number;
  lastEvaluation: number;
  lastAction: string;
  uptime: number;
}

export class CachePolicy {
  private rules: PolicyRule[] = [];
  public config: CachePolicyConfig;
  private stats: PolicyStats;
  private status: PolicyStatus;
  private startTime: number;

  constructor(config: CachePolicyConfig) {
    this.config = config;
    this.status = 'active';
    this.startTime = Date.now();
    this.stats = {
      currentMemory: 0,
      entriesCount: 0,
      evictionCount: 0,
      warningsIssued: 0,
      lastEvaluation: 0,
      lastAction: 'none',
      uptime: 0
    };
    this.initializeRules();
  }

  private initializeRules(): void {
    this.rules.push({
      id: 'memory_warning',
      name: 'Memory Warning',
      priority: 1,
      condition: (stats) => stats.currentMemory >= this.config.maxMemory * this.config.warningThreshold,
      action: 'warn'
    });
    
    this.rules.push({
      id: 'memory_critical',
      name: 'Memory Critical',
      priority: 2,
      condition: (stats) => stats.currentMemory >= this.config.maxMemory * this.config.criticalThreshold,
      action: 'evict'
    });
  }

  apply(currentMemory: number, entriesCount: number): string {
    this.stats.currentMemory = currentMemory;
    this.stats.entriesCount = entriesCount;
    this.stats.lastEvaluation = Date.now();
    this.stats.uptime = Date.now() - this.startTime;

    if (this.status !== 'active') return 'policy_paused';

    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      if (rule.condition(this.stats)) {
        this.stats.lastAction = rule.action;
        
        if (rule.action === 'evict') {
          this.stats.evictionCount++;
          return 'eviction_triggered';
        } else if (rule.action === 'warn') {
          this.stats.warningsIssued++;
          return 'warning_issued';
        } else if (rule.action === 'clear') {
          return 'clear_triggered';
        }
      }
    }

    this.stats.lastAction = 'no_action';
    return 'policy_satisfied';
  }

  getPolicy(): { config: CachePolicyConfig; status: PolicyStatus; rules: PolicyRule[] } {
    return {
      config: { ...this.config },
      status: this.status,
      rules: [...this.rules]
    };
  }

  evaluate(memoryUsage: number, entryCount: number): { shouldEvict: boolean; shouldWarn: boolean; action: string } {
    const result = this.apply(memoryUsage, entryCount);
    
    return {
      shouldEvict: result === 'eviction_triggered',
      shouldWarn: result === 'warning_issued',
      action: result
    };
  }

  getStats(): PolicyStats {
    return { ...this.stats };
  }

  setStatus(status: PolicyStatus): void {
    this.status = status;
  }

  addRule(rule: Omit<PolicyRule, 'id'>): void {
    this.rules.push({
      ...rule,
      id: `rule_${Date.now()}`
    });
  }

  removeRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  getSnapshot(): { metrics: PolicyStats } {
    return {
      metrics: { ...this.stats }
    };
  }

  reset(): void {
    this.stats = {
      currentMemory: 0,
      entriesCount: 0,
      evictionCount: 0,
      warningsIssued: 0,
      lastEvaluation: 0,
      lastAction: 'none',
      uptime: 0
    };
    this.status = 'active';
  }

  getReport(): string {
    return [
      '=== CachePolicy Report ===',
      `Namespace: ${this.config.namespace || 'default'}`,
      `Status: ${this.status}`,
      `Eviction Policy: ${this.config.evictionPolicy}`,
      `Max Memory: ${this.config.maxMemory}`,
      `Current Memory: ${this.stats.currentMemory}`,
      `Entries: ${this.stats.entriesCount}`,
      `Evictions: ${this.stats.evictionCount}`,
      `Warnings: ${this.stats.warningsIssued}`,
      `Last Action: ${this.stats.lastAction}`,
      `Uptime: ${this.stats.uptime}ms`
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: PolicyStats } {
    return {
      version: 'V88',
      stats: { ...this.stats }
    };
  }
}
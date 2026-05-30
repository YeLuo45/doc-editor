/**
 * BulkheadPolicy.ts - V105 Bulkhead Policy Engine
 * Determines bulkhead allocation and isolation strategies
 */

import { BulkheadConfig, BulkheadState } from './Bulkhead';
import { BulkheadPool } from './BulkheadPool';

export type IsolationLevel = 'exclusive' | 'shared' | 'flexible' | 'bypass';

export type PolicyConfig = {
  name: string;
  defaultIsolationLevel: IsolationLevel;
  maxConcurrent: number;
  maxQueue: number;
  timeout: number;
  autoScale: boolean;
  scaleThreshold: number;
  scaleFactor: number;
};

export type PolicyResult = {
  shouldIsolate: boolean;
  isolationLevel: IsolationLevel;
  limit: number;
  reason: string;
};

export class BulkheadPolicy {
  readonly config: PolicyConfig;
  private activePolicies: Map<string, PolicyResult> = new Map();
  private isolationOverrides: Map<string, IsolationLevel> = new Map();

  constructor(config: PolicyConfig) {
    this.config = config;
  }

  /**
   * Determine if isolation should be applied
   */
  shouldIsolate(context: string, currentLoad: number): boolean {
    const threshold = this.config.maxConcurrent * this.config.scaleThreshold;
    
    if (currentLoad >= threshold) {
      return true;
    }
    
    if (this.isolationOverrides.has(context)) {
      return this.isolationOverrides.get(context)! !== 'bypass';
    }
    
    return currentLoad >= this.config.maxConcurrent * 0.8;
  }

  /**
   * Get the limit for a given context
   */
  getLimit(context: string, baseLimit?: number): number {
    const activePolicy = this.activePolicies.get(context);
    if (activePolicy) {
      return activePolicy.limit;
    }
    
    if (baseLimit) {
      return baseLimit;
    }
    
    return this.config.maxConcurrent;
  }

  /**
   * Get the effective policy for a context
   */
  getPolicy(context: string): PolicyResult | undefined {
    return this.activePolicies.get(context);
  }

  /**
   * Get the isolation level for a context
   */
  getIsolationLevel(context: string): IsolationLevel {
    if (this.isolationOverrides.has(context)) {
      return this.isolationOverrides.get(context)!;
    }
    return this.config.defaultIsolationLevel;
  }

  /**
   * Set isolation level override for a context
   */
  setIsolationLevel(context: string, level: IsolationLevel): void {
    this.isolationOverrides.set(context, level);
  }

  /**
   * Apply policy based on load and context
   */
  applyPolicy(context: string, currentLoad: number): PolicyResult {
    const shouldIsolate = this.shouldIsolate(context, currentLoad);
    const isolationLevel = this.getIsolationLevel(context);
    
    let limit = this.config.maxConcurrent;
    let reason = 'default';
    
    if (shouldIsolate) {
      switch (isolationLevel) {
        case 'exclusive':
          limit = 1;
          reason = 'exclusive isolation';
          break;
        case 'shared':
          limit = Math.floor(this.config.maxConcurrent / 2);
          reason = 'shared isolation';
          break;
        case 'flexible':
          limit = Math.floor(this.config.maxConcurrent * 0.75);
          reason = 'flexible isolation';
          break;
        case 'bypass':
          limit = this.config.maxConcurrent;
          reason = 'bypass mode';
          break;
      }
    }
    
    const result: PolicyResult = {
      shouldIsolate,
      isolationLevel,
      limit,
      reason,
    };
    
    this.activePolicies.set(context, result);
    return result;
  }

  /**
   * Create a policy-based bulkhead config
   */
  createConfig(context: string): BulkheadConfig {
    const policy = this.applyPolicy(context, 0);
    return {
      name: context,
      maxConcurrent: policy.limit,
      maxQueue: this.config.maxQueue,
      timeout: this.config.timeout,
      isolationLevel: policy.isolationLevel,
    };
  }

  /**
   * Clear policy for a context
   */
  clearPolicy(context: string): boolean {
    return this.activePolicies.delete(context);
  }

  /**
   * Clear all policies
   */
  clearAllPolicies(): void {
    this.activePolicies.clear();
  }

  /**
   * Evaluate if scaling should occur
   */
  shouldScale(currentLoad: number, maxCapacity: number): boolean {
    if (!this.config.autoScale) return false;
    
    const utilization = currentLoad / maxCapacity;
    return utilization >= this.config.scaleThreshold;
  }

  /**
   * Calculate scaled capacity
   */
  getScaledCapacity(currentCapacity: number): number {
    if (!this.config.autoScale) return currentCapacity;
    
    return Math.floor(currentCapacity * this.config.scaleFactor);
  }

  /**
   * Reset policy state
   */
  reset(): void {
    this.activePolicies.clear();
    this.isolationOverrides.clear();
  }

  /**
   * Get snapshot of policy state
   */
  getSnapshot(): { activePolicies: number; overrides: number } {
    return {
      activePolicies: this.activePolicies.size,
      overrides: this.isolationOverrides.size,
    };
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const name = this.config.name;
    const policies = this.activePolicies.size;
    const overrides = this.isolationOverrides.size;
    
    return [
      `=== BulkheadPolicy Report: ${name} ===`,
      `Default Isolation: ${this.config.defaultIsolationLevel}`,
      `Max Concurrent: ${this.config.maxConcurrent}`,
      `Auto Scale: ${this.config.autoScale}`,
      `Scale Threshold: ${this.config.scaleThreshold}`,
      `Scale Factor: ${this.config.scaleFactor}`,
      `Active Policies: ${policies}`,
      `Isolation Overrides: ${overrides}`,
    ].join('\n');
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: 'V105',
    };
  }
}
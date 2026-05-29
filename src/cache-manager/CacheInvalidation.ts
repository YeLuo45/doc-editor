/**
 * CacheInvalidation.ts - V72 Cache Invalidation for doc-editor
 * Provides cache invalidation: invalidate, register, getKeys, getInvalidationCount
 */

export interface InvalidationConfig {
  enableWildcards: boolean;
  maxKeys: number;
  cascadeEnabled: boolean;
  asyncMode: boolean;
  propagateChanges: boolean;
}

export interface InvalidationEntry {
  pattern: string | RegExp;
  key: string;
  invalidatedAt: number;
  reason: string;
}

export interface InvalidationMetrics {
  totalInvalidations: number;
  keysInvalidated: number;
  patternsRegistered: number;
  lastInvalidation: number | null;
  averageLatency: number;
}

type KeySet = Set<string>;
type PatternList = (string | RegExp)[];

export class CacheInvalidation {
  public config: InvalidationConfig = {
    enableWildcards: true,
    maxKeys: 10000,
    cascadeEnabled: true,
    asyncMode: false,
    propagateChanges: true
  };

  private registeredKeys: KeySet = new Set();
  private registeredPatterns: PatternList = [];
  private invalidationLog: InvalidationEntry[] = [];
  private totalInvalidations: number = 0;
  private keysInvalidatedCount: number = 0;
  private lastInvalidationTime: number | null = null;
  private latencies: number[] = [];

  constructor(config?: Partial<InvalidationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  invalidate(key: string, reason: string = 'manual'): number {
    const start = Date.now();
    let invalidated = 0;

    if (this.registeredKeys.has(key)) {
      this.registeredKeys.delete(key);
      invalidated++;
    }

    if (this.config.cascadeEnabled) {
      invalidated += this.invalidateCascade(key);
    }

    const patternsToRemove: number[] = [];
    
    for (let i = 0; i < this.registeredPatterns.length; i++) {
      const pattern = this.registeredPatterns[i];
      
      if (this.matchesPattern(key, pattern)) {
        patternsToRemove.push(i);
        invalidated++;
      }
    }

    for (let i = patternsToRemove.length - 1; i >= 0; i--) {
      this.registeredPatterns.splice(patternsToRemove[i], 1);
    }

    this.logInvalidation(key, reason);
    this.totalInvalidations++;
    this.keysInvalidatedCount += invalidated;
    this.lastInvalidationTime = Date.now();
    
    const latency = Date.now() - start;
    this.latencies.push(latency);
    this.pruneLatencies();
    
    return invalidated;
  }

  register(key: string): void {
    if (this.registeredKeys.size >= this.config.maxKeys) {
      this.evictOldestKey();
    }
    
    this.registeredKeys.add(key);
  }

  registerPattern(pattern: string | RegExp): void {
    if (this.registeredPatterns.length >= this.config.maxKeys) {
      this.registeredPatterns.shift();
    }
    
    this.registeredPatterns.push(pattern);
  }

  getKeys(): string[] {
    return Array.from(this.registeredKeys);
  }

  getInvalidationCount(): number {
    return this.totalInvalidations;
  }

  getPatterns(): (string | RegExp)[] {
    return [...this.registeredPatterns];
  }

  getMetrics(): InvalidationMetrics {
    return {
      totalInvalidations: this.totalInvalidations,
      keysInvalidated: this.keysInvalidatedCount,
      patternsRegistered: this.registeredPatterns.length,
      lastInvalidation: this.lastInvalidationTime,
      averageLatency: this.calculateAverageLatency()
    };
  }

  clear(): void {
    this.registeredKeys.clear();
    this.registeredPatterns = [];
    this.invalidationLog = [];
    this.totalInvalidations = 0;
    this.keysInvalidatedCount = 0;
    this.lastInvalidationTime = null;
    this.latencies = [];
  }

  hasKey(key: string): boolean {
    return this.registeredKeys.has(key);
  }

  removeKey(key: string): boolean {
    return this.registeredKeys.delete(key);
  }

  removePattern(pattern: string | RegExp): boolean {
    const index = this.registeredPatterns.findIndex(p => this.patternsEqual(p, pattern));
    
    if (index >= 0) {
      this.registeredPatterns.splice(index, 1);
      return true;
    }
    
    return false;
  }

  getLog(): InvalidationEntry[] {
    return [...this.invalidationLog];
  }

  private invalidateCascade(key: string): number {
    let count = 0;
    const parts = key.split(':');
    
    for (const registeredKey of this.registeredKeys) {
      if (registeredKey.startsWith(key + ':')) {
        this.registeredKeys.delete(registeredKey);
        count++;
      }
      
      for (let i = 1; i < parts.length; i++) {
        const prefix = parts.slice(0, i).join(':');
        if (registeredKey.startsWith(prefix + ':')) {
          this.registeredKeys.delete(registeredKey);
          count++;
          break;
        }
      }
    }
    
    return count;
  }

  private matchesPattern(key: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      if (this.config.enableWildcards) {
        const regex = this.wildcardToRegex(pattern);
        return regex.test(key);
      }
      return key === pattern;
    }
    
    return pattern.test(key);
  }

  private wildcardToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${escaped}$`);
  }

  private patternsEqual(a: string | RegExp, b: string | RegExp): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      return a === b;
    }
    
    if (a instanceof RegExp && b instanceof RegExp) {
      return a.toString() === b.toString();
    }
    
    return false;
  }

  private logInvalidation(key: string, reason: string): void {
    this.invalidationLog.push({
      pattern: key,
      key,
      invalidatedAt: Date.now(),
      reason
    });
    
    if (this.invalidationLog.length > 1000) {
      this.invalidationLog = this.invalidationLog.slice(-500);
    }
  }

  private evictOldestKey(): void {
    const oldestKey = this.invalidationLog[0]?.key;
    
    if (oldestKey) {
      this.registeredKeys.delete(oldestKey);
    } else if (this.registeredKeys.size > 0) {
      const firstKey = this.registeredKeys.values().next().value;
      this.registeredKeys.delete(firstKey);
    }
  }

  private pruneLatencies(): void {
    if (this.latencies.length > 100) {
      this.latencies = this.latencies.slice(-100);
    }
  }

  private calculateAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    
    const sum = this.latencies.reduce((acc, lat) => acc + lat, 0);
    return sum / this.latencies.length;
  }

  getSnapshot(): { metrics: InvalidationMetrics } {
    return {
      metrics: this.getMetrics()
    };
  }

  reset(): void {
    this.clear();
  }

  getReport(): string {
    const metrics = this.getMetrics();
    
    return `CacheInvalidation Report
========================
Total Invalidations: ${metrics.totalInvalidations}
Keys Invalidated: ${metrics.keysInvalidated}
Patterns Registered: ${metrics.patternsRegistered}
Registered Keys: ${this.registeredKeys.size}
Last Invalidation: ${metrics.lastInvalidation ? new Date(metrics.lastInvalidation).toISOString() : 'Never'}
Average Latency: ${metrics.averageLatency.toFixed(2)}ms
Wildcards Enabled: ${this.config.enableWildcards}
Cascade Enabled: ${this.config.cascadeEnabled}
Async Mode: ${this.config.asyncMode}`;
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V72-CacheInvalidation-1.0'
    };
  }
}

export default CacheInvalidation;
/**
 * V134 Analyzer - Core analyzer module
 * Provides document analysis capabilities with rule-based processing
 */

export type AnalyzerConfig = {
  enabled: boolean;
  threshold: number;
  maxDepth: number;
  timeout: number;
};

export interface Rule {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high';
  check: (content: string) => boolean;
}

export interface AnalysisResult {
  ruleId: string;
  passed: boolean;
  message: string;
}

export interface AnalyzerSnapshot {
  timestamp: number;
  config: AnalyzerConfig;
  stats: {
    totalAnalyzed: number;
    rulesCount: number;
    lastAnalyzedAt: number | null;
  };
}

export class Analyzer {
  public config: AnalyzerConfig;
  private rules: Map<string, Rule> = new Map();
  private stats = {
    totalAnalyzed: 0,
    rulesCount: 0,
    lastAnalyzedAt: null as number | null,
  };

  constructor(config: AnalyzerConfig) {
    this.config = { ...config };
  }

  analyze(content: string): AnalysisResult[] {
    if (!this.config.enabled) {
      return [];
    }

    const results: AnalysisResult[] = [];
    this.rules.forEach((rule) => {
      try {
        const passed = rule.check(content);
        results.push({
          ruleId: rule.id,
          passed,
          message: passed ? `Rule ${rule.name} passed` : `Rule ${rule.name} failed`,
        });
      } catch {
        results.push({
          ruleId: rule.id,
          passed: false,
          message: `Rule ${rule.name} error`,
        });
      }
    });

    this.stats.totalAnalyzed++;
    this.stats.lastAnalyzedAt = Date.now();
    return results;
  }

  addRule(rule: Rule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with id ${rule.id} already exists`);
    }
    this.rules.set(rule.id, rule);
    this.stats.rulesCount = this.rules.size;
  }

  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.stats.rulesCount = this.rules.size;
    }
    return deleted;
  }

  getAnalyzer(): Analyzer {
    return this;
  }

  getStats(): { totalAnalyzed: number; rulesCount: number; lastAnalyzedAt: number | null } {
    return { ...this.stats };
  }

  getSnapshot(): AnalyzerSnapshot {
    return {
      timestamp: Date.now(),
      config: { ...this.config },
      stats: { ...this.stats },
    };
  }

  reset(): void {
    this.stats.totalAnalyzed = 0;
    this.stats.lastAnalyzedAt = null;
    this.rules.clear();
    this.stats.rulesCount = 0;
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return JSON.stringify({
      version: 'V134',
      timestamp: snapshot.timestamp,
      config: snapshot.config,
      stats: snapshot.stats,
      rules: Array.from(this.rules.values()).map((r) => ({
        id: r.id,
        name: r.name,
        severity: r.severity,
      })),
    }, null, 2);
  }

  exportMetrics(): { version: string; stats: object } {
    return {
      version: 'V134',
      stats: {
        ...this.stats,
        rulesCount: this.rules.size,
        enabled: this.config.enabled,
      },
    };
  }
}
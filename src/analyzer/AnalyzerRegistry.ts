/**
 * V134 Analyzer Registry - Manages multiple analyzer instances
 * Provides centralized registration and retrieval of analyzers
 */

import { Analyzer, AnalyzerConfig } from './Analyzer.js';

export type RegistryConfig = {
  maxAnalyzers: number;
  allowDuplicate: boolean;
};

export interface RegistryEntry {
  name: string;
  analyzer: Analyzer;
  registeredAt: number;
}

export interface RegistrySnapshot {
  timestamp: number;
  config: RegistryConfig;
  stats: {
    totalAnalyzers: number;
    names: string[];
  };
}

export class AnalyzerRegistry {
  public config: RegistryConfig;
  private analyzers: Map<string, Analyzer> = new Map();
  private entryOrder: string[] = [];

  constructor(config: RegistryConfig) {
    this.config = { ...config };
  }

  register(name: string, analyzer: Analyzer): boolean {
    if (this.analyzers.has(name)) {
      if (!this.config.allowDuplicate) {
        return false;
      }
    }

    if (this.analyzers.size >= this.config.maxAnalyzers && !this.analyzers.has(name)) {
      throw new Error(`Registry full: max ${this.config.maxAnalyzers} analyzers allowed`);
    }

    this.analyzers.set(name, analyzer);
    if (!this.entryOrder.includes(name)) {
      this.entryOrder.push(name);
    }
    return true;
  }

  unregister(name: string): boolean {
    const deleted = this.analyzers.delete(name);
    if (deleted) {
      this.entryOrder = this.entryOrder.filter((n) => n !== name);
    }
    return deleted;
  }

  get(name: string): Analyzer | undefined {
    return this.analyzers.get(name);
  }

  getAll(): Analyzer[] {
    return Array.from(this.analyzers.values());
  }

  has(name: string): boolean {
    return this.analyzers.has(name);
  }

  getSnapshot(): RegistrySnapshot {
    return {
      timestamp: Date.now(),
      config: { ...this.config },
      stats: {
        totalAnalyzers: this.analyzers.size,
        names: Array.from(this.analyzers.keys()),
      },
    };
  }

  reset(): void {
    this.analyzers.clear();
    this.entryOrder = [];
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return JSON.stringify({
      version: 'V134',
      timestamp: snapshot.timestamp,
      config: snapshot.config,
      stats: snapshot.stats,
    }, null, 2);
  }

  exportMetrics(): { version: string; stats: object } {
    return {
      version: 'V134',
      stats: {
        totalAnalyzers: this.analyzers.size,
        maxAnalyzers: this.config.maxAnalyzers,
        names: Array.from(this.analyzers.keys()),
      },
    };
  }
}
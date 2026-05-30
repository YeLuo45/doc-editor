/**
 * V133 EvaluatorRegistry Module
 * Central registry for managing multiple Evaluator instances
 */

import { Evaluator, EvaluatorConfig } from "./Evaluator";

export type RegistryConfig = {
  name: string;
  version: string;
  autoRegister: boolean;
  maxEvaluators: number;
};

export type RegistryStats = {
  totalRegistred: number;
  activeCount: number;
  enabledCount: number;
};

export class EvaluatorRegistry {
  private _config: RegistryConfig;
  private _evaluators: Map<string, Evaluator> = new Map();
  private _registry: Map<string, string> = new Map();

  constructor(config: RegistryConfig) {
    this._config = { ...config };
  }

  get config(): RegistryConfig {
    return { ...this._config };
  }

  register(evaluator: Evaluator): boolean {
    if (this._evaluators.size >= this._config.maxEvaluators) {
      return false;
    }

    if (this._evaluators.has(evaluator.config.id)) {
      return false;
    }

    this._evaluators.set(evaluator.config.id, evaluator);
    this._registry.set(evaluator.config.id, evaluator.config.name);
    return true;
  }

  unregister(evaluatorId: string): boolean {
    const evaluator = this._evaluators.get(evaluatorId);
    if (!evaluator) {
      return false;
    }

    this._registry.delete(evaluatorId);
    return this._evaluators.delete(evaluatorId);
  }

  get(evaluatorId: string): Evaluator | undefined {
    return this._evaluators.get(evaluatorId);
  }

  getAll(): Evaluator[] {
    return Array.from(this._evaluators.values());
  }

  has(evaluatorId: string): boolean {
    return this._evaluators.has(evaluatorId);
  }

  getStats(): RegistryStats {
    let activeCount = 0;
    let enabledCount = 0;

    this._evaluators.forEach((evaluator) => {
      if (evaluator.config.enabled) {
        activeCount++;
        enabledCount++;
      }
    });

    return {
      totalRegistred: this._evaluators.size,
      activeCount,
      enabledCount,
    };
  }

  getSnapshot(): { metrics: RegistryStats } {
    return {
      metrics: this.getStats(),
    };
  }

  reset(): void {
    this._evaluators.clear();
    this._registry.clear();
  }

  getReport(): string {
    const stats = this.getStats();
    return [
      `=== Evaluator Registry Report ===`,
      `Name: ${this._config.name}`,
      `Version: ${this._config.version}`,
      `Auto-Register: ${this._config.autoRegister}`,
      `Max Evaluators: ${this._config.maxEvaluators}`,
      `Total Registered: ${stats.totalRegistred}`,
      `Active: ${stats.activeCount}`,
      `Enabled: ${stats.enabledCount}`,
    ].join("\n");
  }

  exportMetrics(): { version: string } {
    return {
      version: "1.33.0",
    };
  }

  findByName(name: string): Evaluator[] {
    const results: Evaluator[] = [];
    this._evaluators.forEach((evaluator) => {
      if (this._registry.get(evaluator.config.id) === name) {
        results.push(evaluator);
      }
    });
    return results;
  }

  getEvaluatorIds(): string[] {
    return Array.from(this._evaluators.keys());
  }
}
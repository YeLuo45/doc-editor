/**
 * V121 Mutator Module
 * Core mutation engine for document transformations
 */

export type MutatorConfig = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  retries: number;
};

export type MutationResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
};

export type MutationStats = {
  totalMutations: number;
  successfulMutations: number;
  failedMutations: number;
  averageDuration: number;
};

type MutationFn = (data: unknown) => MutationResult;

export class Mutator {
  private config: MutatorConfig;
  private mutations: Map<string, MutationFn> = new Map();
  private stats: MutationStats = {
    totalMutations: 0,
    successfulMutations: 0,
    failedMutations: 0,
    averageDuration: 0,
  };

  constructor(config: MutatorConfig) {
    this.config = { ...config };
  }

  get config(): MutatorConfig {
    return { ...this.config };
  }

  mutate(mutationId: string, data: unknown): MutationResult {
    const mutation = this.mutations.get(mutationId);
    if (!mutation) {
      return {
        success: false,
        error: `Mutation ${mutationId} not found`,
        timestamp: Date.now(),
      };
    }

    const startTime = Date.now();
    try {
      const result = mutation(data);
      const duration = Date.now() - startTime;

      this.stats.totalMutations++;
      if (result.success) {
        this.stats.successfulMutations++;
      } else {
        this.stats.failedMutations++;
      }

      this.stats.averageDuration =
        (this.stats.averageDuration * (this.stats.totalMutations - 1) + duration) /
        this.stats.totalMutations;

      return result;
    } catch (error) {
      this.stats.totalMutations++;
      this.stats.failedMutations++;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  validate(data: unknown): boolean {
    if (!this.config.enabled) return false;
    if (!data) return false;
    return true;
  }

  getMutator(mutatorId: string): MutationFn | undefined {
    return this.mutations.get(mutatorId);
  }

  getStats(): MutationStats {
    return { ...this.stats };
  }

  registerMutation(id: string, fn: MutationFn): void {
    this.mutations.set(id, fn);
  }

  unregisterMutation(id: string): boolean {
    return this.mutations.delete(id);
  }

  getSnapshot(): { metrics: MutationStats; config: MutatorConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  reset(): void {
    this.stats = {
      totalMutations: 0,
      successfulMutations: 0,
      failedMutations: 0,
      averageDuration: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `Mutator Report:
  ID: ${snapshot.config.id}
  Name: ${snapshot.config.name}
  Enabled: ${snapshot.config.enabled}
  Total Mutations: ${snapshot.metrics.totalMutations}
  Successful: ${snapshot.metrics.successfulMutations}
  Failed: ${snapshot.metrics.failedMutations}
  Avg Duration: ${snapshot.metrics.averageDuration.toFixed(2)}ms`;
  }

  exportMetrics(): { version: string; stats: MutationStats; config: MutatorConfig } {
    return {
      version: '1.2.1',
      stats: this.getStats(),
      config: this.config,
    };
  }
}
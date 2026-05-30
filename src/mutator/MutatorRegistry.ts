/**
 * V121 MutatorRegistry Module
 * Registry for managing multiple mutator instances
 */

import { Mutator, MutatorConfig, MutationResult } from './Mutator';

export type RegistryConfig = {
  maxMutators: number;
  allowDuplicates: boolean;
  autoInitialize: boolean;
};

export type RegistryStats = {
  totalRegistrations: number;
  activeMutators: number;
  totalMutations: number;
};

export class MutatorRegistry {
  private config: RegistryConfig;
  private mutators: Map<string, Mutator> = new Map();
  private stats: RegistryStats = {
    totalRegistrations: 0,
    activeMutators: 0,
    totalMutations: 0,
  };

  constructor(config: RegistryConfig) {
    this.config = { ...config };
  }

  get config(): RegistryConfig {
    return { ...this.config };
  }

  register(id: string, mutator: Mutator): boolean {
    if (this.mutators.has(id)) {
      if (!this.config.allowDuplicates) {
        return false;
      }
    }

    if (this.mutators.size >= this.config.maxMutators) {
      return false;
    }

    this.mutators.set(id, mutator);
    this.stats.totalRegistrations++;
    this.stats.activeMutators = this.mutators.size;
    return true;
  }

  unregister(id: string): boolean {
    const result = this.mutators.delete(id);
    if (result) {
      this.stats.activeMutators = this.mutators.size;
    }
    return result;
  }

  get(id: string): Mutator | undefined {
    return this.mutators.get(id);
  }

  getAll(): Map<string, Mutator> {
    return new Map(this.mutators);
  }

  has(id: string): boolean {
    return this.mutators.has(id);
  }

  clear(): void {
    this.mutators.clear();
    this.stats.activeMutators = 0;
  }

  execute(id: string, mutationId: string, data: unknown): MutationResult {
    const mutator = this.mutators.get(id);
    if (!mutator) {
      return {
        success: false,
        error: `Mutator ${id} not found`,
        timestamp: Date.now(),
      };
    }
    return mutator.mutate(mutationId, data);
  }

  getStats(): RegistryStats {
    return { ...this.stats };
  }

  getMutatorStats(id: string) {
    const mutator = this.mutators.get(id);
    return mutator ? mutator.getStats() : undefined;
  }

  getSnapshot(): { stats: RegistryStats; config: RegistryConfig; mutatorIds: string[] } {
    return {
      stats: this.getStats(),
      config: this.config,
      mutatorIds: Array.from(this.mutators.keys()),
    };
  }

  reset(): void {
    this.stats = {
      totalRegistrations: 0,
      activeMutators: 0,
      totalMutations: 0,
    };
    this.mutators.forEach((mutator) => mutator.reset());
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `MutatorRegistry Report:
  Max Mutators: ${snapshot.config.maxMutators}
  Total Registrations: ${snapshot.stats.totalRegistrations}
  Active Mutators: ${snapshot.stats.activeMutators}
  Mutator IDs: ${snapshot.mutatorIds.join(', ') || 'none'}`;
  }

  exportMetrics(): { version: string; stats: RegistryStats; config: RegistryConfig } {
    return {
      version: '1.2.1',
      stats: this.getStats(),
      config: this.config,
    };
  }
}
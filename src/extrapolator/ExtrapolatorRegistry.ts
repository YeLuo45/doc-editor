/**
 * V141 ExtrapolatorRegistry - Registry for managing extrapolators
 * Provides centralized access to all extrapolator instances
 */

import { Extrapolator, ExtrapolatorConfig } from './Extrapolator';

export type RegistryConfig = {
  name: string;
  maxEntries: number;
  enableValidation: boolean;
  autoInitialize: boolean;
};

export interface RegistryStats {
  totalRegistrations: number;
  activeExtrapolators: number;
  failedRegistrations: number;
  lastRegistrationTime: number;
}

export class ExtrapolatorRegistry {
  private config: RegistryConfig;
  private extrapolators: Map<string, Extrapolator>;
  private stats: RegistryStats;
  private lastSnapshot: { metrics: RegistryStats } | null;

  constructor(config: RegistryConfig) {
    this.config = {
      name: config.name || 'default-registry',
      maxEntries: config.maxEntries || 100,
      enableValidation: config.enableValidation ?? true,
      autoInitialize: config.autoInitialize ?? false,
    };
    this.extrapolators = new Map();
    this.stats = {
      totalRegistrations: 0,
      activeExtrapolators: 0,
      failedRegistrations: 0,
      lastRegistrationTime: 0,
    };
    this.lastSnapshot = null;
  }

  get config(): RegistryConfig {
    return { ...this.config };
  }

  register(name: string, extrapolator: Extrapolator): boolean {
    const startTime = Date.now();

    try {
      if (!name || !extrapolator) {
        throw new Error('Name and extrapolator are required');
      }

      if (this.extrapolators.size >= this.config.maxEntries) {
        throw new Error(`Registry full: max ${this.config.maxEntries} entries`);
      }

      if (this.config.enableValidation && this.extrapolators.has(name)) {
        throw new Error(`Extrapolator '${name}' already registered`);
      }

      this.extrapolators.set(name, extrapolator);
      this.stats.totalRegistrations++;
      this.stats.activeExtrapolators = this.extrapolators.size;
      this.stats.lastRegistrationTime = Date.now() - startTime;
      this.lastSnapshot = { metrics: { ...this.stats } };

      return true;
    } catch (error) {
      this.stats.failedRegistrations++;
      throw error;
    }
  }

  unregister(name: string): boolean {
    if (!name) {
      throw new Error('Name is required');
    }

    const existed = this.extrapolators.delete(name);
    if (existed) {
      this.stats.activeExtrapolators = this.extrapolators.size;
      this.lastSnapshot = { metrics: { ...this.stats } };
    }

    return existed;
  }

  get(name: string): Extrapolator | undefined {
    if (!name) {
      return undefined;
    }
    return this.extrapolators.get(name);
  }

  getAll(): Extrapolator[] {
    return Array.from(this.extrapolators.values());
  }

  has(name: string): boolean {
    if (!name) {
      return false;
    }
    return this.extrapolators.has(name);
  }

  getStats(): RegistryStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: RegistryStats } {
    return {
      metrics: { ...this.stats },
    };
  }

  reset(): void {
    this.extrapolators.clear();
    this.stats = {
      totalRegistrations: 0,
      activeExtrapolators: 0,
      failedRegistrations: 0,
      lastRegistrationTime: 0,
    };
    this.lastSnapshot = null;
  }

  getReport(): string {
    return [
      `ExtrapolatorRegistry Report: ${this.config.name}`,
      `Max Entries: ${this.config.maxEntries}`,
      `Validation: ${this.config.enableValidation ? 'enabled' : 'disabled'}`,
      `Total Registrations: ${this.stats.totalRegistrations}`,
      `Active Extrapolators: ${this.stats.activeExtrapolators}`,
      `Failed Registrations: ${this.stats.failedRegistrations}`,
      `Last Registration Time: ${this.stats.lastRegistrationTime}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }

  clear(): void {
    this.extrapolators.clear();
    this.stats.activeExtrapolators = 0;
  }

  size(): number {
    return this.extrapolators.size;
  }

  keys(): string[] {
    return Array.from(this.extrapolators.keys());
  }
}

export default ExtrapolatorRegistry;
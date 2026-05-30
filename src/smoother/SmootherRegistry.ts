/**
 * V142 SmootherRegistry - Registry for managing smoothers
 * Provides centralized access to all smoother instances
 */

import { Smoother, SmootherConfig } from './Smoother';

export type RegistryConfig = {
  name: string;
  maxEntries: number;
  enableValidation: boolean;
  autoInitialize: boolean;
};

export interface RegistryStats {
  totalRegistrations: number;
  activeSmoothers: number;
  failedRegistrations: number;
  lastRegistrationTime: number;
}

export class SmootherRegistry {
  private config: RegistryConfig;
  private smoothers: Map<string, Smoother>;
  private stats: RegistryStats;
  private lastSnapshot: { metrics: RegistryStats } | null;

  constructor(config: RegistryConfig) {
    this.config = {
      name: config.name || 'default-registry',
      maxEntries: config.maxEntries || 100,
      enableValidation: config.enableValidation ?? true,
      autoInitialize: config.autoInitialize ?? false,
    };
    this.smoothers = new Map();
    this.stats = {
      totalRegistrations: 0,
      activeSmoothers: 0,
      failedRegistrations: 0,
      lastRegistrationTime: 0,
    };
    this.lastSnapshot = null;
  }

  get config(): RegistryConfig {
    return { ...this.config };
  }

  register(name: string, smoother: Smoother): boolean {
    const startTime = Date.now();

    try {
      if (!name || !smoother) {
        throw new Error('Name and smoother are required');
      }

      if (this.smoothers.size >= this.config.maxEntries) {
        throw new Error(`Registry full: max ${this.config.maxEntries} entries`);
      }

      if (this.config.enableValidation && this.smoothers.has(name)) {
        throw new Error(`Smoother '${name}' already registered`);
      }

      this.smoothers.set(name, smoother);
      this.stats.totalRegistrations++;
      this.stats.activeSmoothers = this.smoothers.size;
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

    const existed = this.smoothers.delete(name);
    if (existed) {
      this.stats.activeSmoothers = this.smoothers.size;
      this.lastSnapshot = { metrics: { ...this.stats } };
    }

    return existed;
  }

  get(name: string): Smoother | undefined {
    if (!name) {
      return undefined;
    }
    return this.smoothers.get(name);
  }

  getAll(): Smoother[] {
    return Array.from(this.smoothers.values());
  }

  has(name: string): boolean {
    if (!name) {
      return false;
    }
    return this.smoothers.has(name);
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
    this.smoothers.clear();
    this.stats = {
      totalRegistrations: 0,
      activeSmoothers: 0,
      failedRegistrations: 0,
      lastRegistrationTime: 0,
    };
    this.lastSnapshot = null;
  }

  getReport(): string {
    return [
      `SmootherRegistry Report: ${this.config.name}`,
      `Max Entries: ${this.config.maxEntries}`,
      `Validation: ${this.config.enableValidation ? 'enabled' : 'disabled'}`,
      `Total Registrations: ${this.stats.totalRegistrations}`,
      `Active Smoothers: ${this.stats.activeSmoothers}`,
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
    this.smoothers.clear();
    this.stats.activeSmoothers = 0;
  }

  size(): number {
    return this.smoothers.size;
  }

  keys(): string[] {
    return Array.from(this.smoothers.keys());
  }
}

export default SmootherRegistry;
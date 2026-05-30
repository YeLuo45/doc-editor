/**
 * DifferentiatorRegistry.ts - V136 Differentiator Registry
 * Registry for managing differentiator instances
 */

import { Differentiator, DifferentiatorConfig } from './Differentiator';

export type DifferentiatorRegistryConfig = {
  maxRegistrations: number;
  allowOverride: boolean;
  enableAutoRegister: boolean;
};

export type DifferentiatorRegistryStats = {
  totalRegistered: number;
  activeRegistrations: number;
  totalUnregistrations: number;
  maxRegistrationsReached: boolean;
};

export class DifferentiatorRegistry {
  config: DifferentiatorRegistryConfig;
  private registry: Map<string, Differentiator> = new Map();
  private totalRegistered: number = 0;
  private totalUnregistrations: number = 0;

  constructor(config: DifferentiatorRegistryConfig) {
    this.config = { ...config };
  }

  register(name: string, differentiator: Differentiator): boolean {
    if (this.registry.has(name) && !this.config.allowOverride) {
      return false;
    }
    if (this.registry.size >= this.config.maxRegistrations && !this.registry.has(name)) {
      return false;
    }
    this.registry.set(name, differentiator);
    this.totalRegistered++;
    return true;
  }

  unregister(name: string): boolean {
    if (!this.registry.has(name)) {
      return false;
    }
    this.registry.delete(name);
    this.totalUnregistrations++;
    return true;
  }

  get(name: string): Differentiator | undefined {
    return this.registry.get(name);
  }

  getAll(): Map<string, Differentiator> {
    return new Map(this.registry);
  }

  has(name: string): boolean {
    return this.registry.has(name);
  }

  clear(): void {
    this.registry.clear();
  }

  getStats(): DifferentiatorRegistryStats {
    return {
      totalRegistered: this.totalRegistered,
      activeRegistrations: this.registry.size,
      totalUnregistrations: this.totalUnregistrations,
      maxRegistrationsReached: this.registry.size >= this.config.maxRegistrations,
    };
  }

  getSnapshot(): { stats: DifferentiatorRegistryStats; timestamp: number } {
    return { stats: this.getStats(), timestamp: Date.now() };
  }

  reset(): void {
    this.registry.clear();
    this.totalRegistered = 0;
    this.totalUnregistrations = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    return [
      `=== Differentiator Registry Report ===`,
      `Active: ${s.stats.activeRegistrations}`,
      `Total Registered: ${s.stats.totalRegistered}`,
      `Unregistered: ${s.stats.totalUnregistrations}`,
      `Max Reached: ${s.stats.maxRegistrationsReached}`,
      `Time: ${new Date(s.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & DifferentiatorRegistryStats {
    return { version: 'V136', ...this.getStats() };
  }
}
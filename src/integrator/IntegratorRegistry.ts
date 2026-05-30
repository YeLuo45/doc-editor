/**
 * V137 IntegratorRegistry Module
 * Registry for managing multiple integrators
 */

import { Integrator, IntegratorConfig, IntegratorStats, IntegrationResult } from './Integrator';

export interface RegistryConfig {
  name: string;
  version: string;
  autoRegister: boolean;
  maxIntegrators: number;
}

export interface RegistryStats {
  totalRegistrations: number;
  activeIntegrators: number;
  disabledIntegrators: number;
}

export class IntegratorRegistry {
  private integrators: Map<string, Integrator> = new Map();
  private config: RegistryConfig;
  private stats: RegistryStats;
  private lastSnapshot: { metrics: RegistryStats } | null = null;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      name: config.name ?? 'DefaultRegistry',
      version: config.version ?? '1.0.0',
      autoRegister: config.autoRegister ?? true,
      maxIntegrators: config.maxIntegrators ?? 100,
    };

    this.stats = {
      totalRegistrations: 0,
      activeIntegrators: 0,
      disabledIntegrators: 0,
    };
  }

  /**
   * Register a new integrator
   */
  register(config: IntegratorConfig): boolean {
    if (this.integrators.size >= this.config.maxIntegrators) {
      console.warn(`Registry at max capacity: ${this.config.maxIntegrators}`);
      return false;
    }

    if (this.integrators.has(config.id)) {
      console.warn(`Integrator ${config.id} already registered`);
      return false;
    }

    const integrator = new Integrator(config);
    this.integrators.set(config.id, integrator);
    this.stats.totalRegistrations++;

    if (config.enabled) {
      this.stats.activeIntegrators++;
    } else {
      this.stats.disabledIntegrators++;
    }

    return true;
  }

  /**
   * Unregister an integrator by ID
   */
  unregister(id: string): boolean {
    const integrator = this.integrators.get(id);
    if (!integrator) {
      return false;
    }

    const wasEnabled = integrator.config.enabled;
    this.integrators.delete(id);

    if (wasEnabled) {
      this.stats.activeIntegrators--;
    } else {
      this.stats.disabledIntegrators--;
    }

    return true;
  }

  /**
   * Get an integrator by ID
   */
  get(id: string): Integrator | null {
    return this.integrators.get(id) ?? null;
  }

  /**
   * Get all registered integrators
   */
  getAll(): Integrator[] {
    return Array.from(this.integrators.values());
  }

  /**
   * Check if an integrator exists
   */
  has(id: string): boolean {
    return this.integrators.has(id);
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    return { ...this.stats };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: RegistryStats } {
    this.lastSnapshot = { metrics: this.getStats() };
    return this.lastSnapshot;
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.stats = {
      totalRegistrations: this.integrators.size,
      activeIntegrators: 0,
      disabledIntegrators: 0,
    };

    for (const integrator of this.integrators.values()) {
      if (integrator.config.enabled) {
        this.stats.activeIntegrators++;
      } else {
        this.stats.disabledIntegrators++;
      }
    }
  }

  /**
   * Generate a status report
   */
  getReport(): string {
    return [
      `=== Integrator Registry Report ===`,
      `Name: ${this.config.name}`,
      `Version: ${this.config.version}`,
      `Total Registrations: ${this.stats.totalRegistrations}`,
      `Active Integrators: ${this.stats.activeIntegrators}`,
      `Disabled Integrators: ${this.stats.disabledIntegrators}`,
      `Capacity: ${this.integrators.size}/${this.config.maxIntegrators}`,
    ].join('\n');
  }

  /**
   * Export metrics in standard format
   */
  exportMetrics(): { version: string; metrics: RegistryStats; config: RegistryConfig } {
    return {
      version: '1.0.0',
      metrics: this.getStats(),
      config: this.config,
    };
  }

  /**
   * Execute integration on a specific integrator
   */
  async executeIntegration(id: string, data: unknown): Promise<IntegrationResult | null> {
    const integrator = this.get(id);
    if (!integrator) {
      return null;
    }
    return integrator.integrate(data);
  }
}
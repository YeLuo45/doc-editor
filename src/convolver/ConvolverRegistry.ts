/**
 * V145 ConvolverRegistry - Registry for managing multiple Convolver instances
 * Provides centralized registration, lookup, and management of convolvers
 */

import Convolver, { ConvolverConfig } from './Convolver';

export interface RegistryConfig {
  maxConvolvers: number;
  allowDuplicateNames: boolean;
  autoEnable: boolean;
}

export interface RegistryMetrics {
  totalConvolvers: number;
  enabledConvolvers: number;
  disabledConvolvers: number;
}

export class ConvolverRegistry {
  public config: RegistryConfig;
  
  private convolvers: Map<string, Convolver> = new Map();
  private nameIndex: Map<string, string> = new Map();

  constructor(config: RegistryConfig) {
    this.config = { ...config };
  }

  /**
   * Register a new convolver
   */
  register(convolver: Convolver): { success: boolean; error?: string } {
    const existing = this.convolvers.get(convolver.config.id);
    if (existing) {
      return { success: false, error: `Convolver with ID '${convolver.config.id}' already registered` };
    }

    if (this.convolvers.size >= this.config.maxConvolvers) {
      return { success: false, error: 'Maximum convolver limit reached' };
    }

    if (!this.config.allowDuplicateNames && this.nameIndex.has(convolver.config.name)) {
      return { success: false, error: `Convolver with name '${convolver.config.name}' already exists` };
    }

    this.convolvers.set(convolver.config.id, convolver);
    this.nameIndex.set(convolver.config.name, convolver.config.id);

    if (this.config.autoEnable) {
      convolver.enable();
    }

    return { success: true };
  }

  /**
   * Unregister a convolver by ID
   */
  unregister(id: string): { success: boolean; convolver?: Convolver; error?: string } {
    const convolver = this.convolvers.get(id);
    
    if (!convolver) {
      return { success: false, error: `Convolver with ID '${id}' not found` };
    }

    this.convolvers.delete(id);
    this.nameIndex.delete(convolver.config.name);

    return { success: true, convolver };
  }

  /**
   * Get a convolver by ID
   */
  get(id: string): Convolver | undefined {
    return this.convolvers.get(id);
  }

  /**
   * Get a convolver by name
   */
  getByName(name: string): Convolver | undefined {
    const id = this.nameIndex.get(name);
    return id ? this.convolvers.get(id) : undefined;
  }

  /**
   * Get all registered convolvers
   */
  getAll(): Convolver[] {
    return Array.from(this.convolvers.values());
  }

  /**
   * Check if a convolver exists by ID
   */
  has(id: string): boolean {
    return this.convolvers.has(id);
  }

  /**
   * Check if a convolver exists by name
   */
  hasByName(name: string): boolean {
    return this.nameIndex.has(name);
  }

  /**
   * Clear all registered convolvers
   */
  clear(): void {
    this.convolvers.clear();
    this.nameIndex.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryMetrics {
    const all = this.getAll();
    return {
      totalConvolvers: all.length,
      enabledConvolvers: all.filter(c => c.config.enabled).length,
      disabledConvolvers: all.filter(c => !c.config.enabled).length
    };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: RegistryMetrics } {
    return {
      metrics: this.getStats()
    };
  }

  /**
   * Reset all metrics and state
   */
  reset(): void {
    this.convolvers.forEach(c => c.reset());
  }

  /**
   * Generate a human-readable report
   */
  getReport(): string {
    const stats = this.getStats();
    const lines = [
      'Convolver Registry Report',
      `Total Convolvers: ${stats.totalConvolvers}`,
      `Enabled: ${stats.enabledConvolvers}`,
      `Disabled: ${stats.disabledConvolvers}`,
      '',
      'Registered Convolvers:'
    ];

    this.getAll().forEach(c => {
      lines.push(`  - ${c.config.name} (${c.config.id}) [${c.config.enabled ? 'ENABLED' : 'DISABLED'}]`);
    });

    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
      registry: {
        config: this.config,
        stats: this.getStats()
      }
    };
  }

  /**
   * Enable all convolvers
   */
  enableAll(): void {
    this.convolvers.forEach(c => c.enable());
  }

  /**
   * Disable all convolvers
   */
  disableAll(): void {
    this.convolvers.forEach(c => c.disable());
  }
}

export default ConvolverRegistry;
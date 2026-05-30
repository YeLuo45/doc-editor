/**
 * ValidatorRegistryV2.ts - Validator Registry V2 Implementation
 * Version: 1.20.0
 * 
 * Central registry for managing multiple validator instances,
 * providing lookup, registration, and management capabilities.
 */

import { ValidatorV2, ValidatorConfig } from './ValidatorV2';

export type RegistryEntry = {
  name: string;
  validator: ValidatorV2;
  description?: string;
  tags: string[];
};

export type RegistryConfig = {
  allowOverwrite: boolean;
  maxValidators: number;
  autoInitialize: boolean;
};

const DEFAULT_REGISTRY_CONFIG: RegistryConfig = {
  allowOverwrite: false,
  maxValidators: 100,
  autoInitialize: true,
};

export class ValidatorRegistryV2 {
  private readonly _validators = new Map<string, RegistryEntry>();
  private _registrationCount = 0;
  private _lookupCount = 0;
  private _lastLookupTime = 0;
  private _totalLookupDuration = 0;

  constructor(public readonly config: RegistryConfig = DEFAULT_REGISTRY_CONFIG) {
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
  }

  /**
   * Registers a new validator with the given name
   */
  register(
    name: string,
    validator: ValidatorV2,
    description?: string,
    tags: string[] = []
  ): void {
    if (this._validators.has(name) && !this.config.allowOverwrite) {
      throw new Error(`Validator "${name}" is already registered`);
    }
    
    if (this._validators.size >= this.config.maxValidators) {
      throw new Error(`Maximum validator count (${this.config.maxValidators}) reached`);
    }
    
    this._validators.set(name, { name, validator, description, tags });
    this._registrationCount++;
  }

  /**
   * Unregisters a validator by name
   */
  unregister(name: string): boolean {
    return this._validators.delete(name);
  }

  /**
   * Gets a validator by name
   */
  get(name: string): ValidatorV2 | undefined {
    const startTime = Date.now();
    this._lookupCount++;
    
    const result = this._validators.get(name);
    
    const duration = Date.now() - startTime;
    this._lastLookupTime = duration;
    this._totalLookupDuration += duration;
    
    return result?.validator;
  }

  /**
   * Gets all registered validator entries
   */
  getAll(): Map<string, RegistryEntry> {
    return new Map(this._validators);
  }

  /**
   * Checks if a validator exists
   */
  has(name: string): boolean {
    return this._validators.has(name);
  }

  /**
   * Gets statistics about the registry
   */
  getStats(): {
    totalValidators: number;
    totalRegistrations: number;
    totalLookups: number;
    averageLookupDuration: number;
    lastLookupDuration: number;
  } {
    return {
      totalValidators: this._validators.size,
      totalRegistrations: this._registrationCount,
      totalLookups: this._lookupCount,
      averageLookupDuration: this._lookupCount > 0 
        ? this._totalLookupDuration / this._lookupCount 
        : 0,
      lastLookupDuration: this._lastLookupTime,
    };
  }

  /**
   * Gets a snapshot of current metrics
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    const validatorStats: Record<string, unknown> = {};
    
    for (const [name, entry] of this._validators) {
      validatorStats[name] = {
        description: entry.description,
        tags: entry.tags,
        stats: entry.validator.getStats(),
      };
    }
    
    return {
      metrics: {
        registrySize: this._validators.size,
        registrationCount: this._registrationCount,
        lookupCount: this._lookupCount,
        totalLookupDuration: this._totalLookupDuration,
        config: this.config,
        validators: validatorStats,
      },
    };
  }

  /**
   * Resets all statistics
   */
  reset(): void {
    this._registrationCount = 0;
    this._lookupCount = 0;
    this._lastLookupTime = 0;
    this._totalLookupDuration = 0;
  }

  /**
   * Generates a text report of registry state
   */
  getReport(): string {
    const stats = this.getStats();
    
    let report = '=== Validator Registry V2 Report ===\n';
    report += `Total Validators: ${stats.totalValidators}\n`;
    report += `Total Registrations: ${stats.totalRegistrations}\n`;
    report += `Total Lookups: ${stats.totalLookups}\n`;
    report += `Average Lookup Duration: ${stats.averageLookupDuration.toFixed(2)}ms\n`;
    report += `Max Validators: ${this.config.maxValidators}\n`;
    report += `Allow Overwrite: ${this.config.allowOverwrite}\n`;
    report += '\nRegistered Validators:\n';
    
    for (const [name, entry] of this._validators) {
      report += `  - ${name}`;
      if (entry.description) report += `: ${entry.description}`;
      if (entry.tags.length > 0) report += ` [${entry.tags.join(', ')}]`;
      report += '\n';
    }
    
    return report;
  }

  /**
   * Exports metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: '1.20.0',
      metrics: this.getSnapshot().metrics,
    };
  }

  /**
   * Creates a new validator and registers it
   */
  createAndRegister(
    name: string,
    config?: ValidatorConfig,
    description?: string,
    tags: string[] = []
  ): ValidatorV2 {
    const validator = new ValidatorV2(config);
    this.register(name, validator, description, tags);
    return validator;
  }
}
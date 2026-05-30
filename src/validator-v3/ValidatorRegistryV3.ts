/**
 * ValidatorRegistryV3.ts - Validator Registry V3 Implementation
 * Version: 128.0.0
 * 
 * Central registry for managing validator instances with
 * registration, lookup, and lifecycle management.
 */

import { ValidatorV3, ValidatorStats } from './ValidatorV3';

export type RegistryConfig = {
  name: string;
  autoInitialize: boolean;
  maxValidators: number;
  allowDuplicates: boolean;
};

const DEFAULT_REGISTRY_CONFIG: RegistryConfig = {
  name: 'ValidatorRegistryV3',
  autoInitialize: true,
  maxValidators: 100,
  allowDuplicates: false,
};

export class ValidatorRegistryV3 {
  private _validators: Map<string, ValidatorV3> = new Map();
  private _registrationCount = 0;
  private _lookupCount = 0;
  private _lastRegistrationTime = 0;
  private _lastLookupTime = 0;

  constructor(public readonly config: RegistryConfig = DEFAULT_REGISTRY_CONFIG) {
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
  }

  /**
   * Registers a validator with the registry
   */
  register(validator: ValidatorV3, name?: string): boolean {
    const key = name || validator.config.name;

    if (!this.config.allowDuplicates && this._validators.has(key)) {
      return false;
    }

    if (this._validators.size >= this.config.maxValidators) {
      return false;
    }

    this._validators.set(key, validator);
    this._registrationCount++;
    this._lastRegistrationTime = Date.now();
    return true;
  }

  /**
   * Unregisters a validator by name
   */
  unregister(name: string): boolean {
    const result = this._validators.delete(name);
    if (result) {
      this._registrationCount++;
    }
    return result;
  }

  /**
   * Gets a validator by name
   */
  get(name: string): ValidatorV3 | undefined {
    this._lookupCount++;
    this._lastLookupTime = Date.now();
    return this._validators.get(name);
  }

  /**
   * Gets all registered validators
   */
  getAll(): ValidatorV3[] {
    return Array.from(this._validators.values());
  }

  /**
   * Checks if a validator exists
   */
  has(name: string): boolean {
    this._lookupCount++;
    this._lastLookupTime = Date.now();
    return this._validators.has(name);
  }

  /**
   * Gets registry statistics
   */
  getStats(): RegistryStats {
    const validators = this.getAll();
    const totalValidations = validators.reduce(
      (sum, v) => sum + v.getStats().validationCount, 
      0
    );
    const totalErrors = validators.reduce(
      (sum, v) => sum + v.getStats().errorCount, 
      0
    );

    return {
      name: this.config.name,
      validatorCount: this._validators.size,
      totalValidations,
      totalErrors,
      registrationCount: this._registrationCount,
      lookupCount: this._lookupCount,
      lastRegistrationTime: this._lastRegistrationTime,
      lastLookupTime: this._lastLookupTime,
    };
  }

  /**
   * Gets a snapshot of current metrics
   */
  getSnapshot(): { metrics: RegistryStats } {
    return {
      metrics: this.getStats(),
    };
  }

  /**
   * Resets all statistics and unregisters all validators
   */
  reset(): void {
    this._validators.clear();
    this._registrationCount = 0;
    this._lookupCount = 0;
    this._lastRegistrationTime = 0;
    this._lastLookupTime = 0;
  }

  /**
   * Generates a text report of registry state
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      `ValidatorRegistryV3 Report: ${stats.name}`,
      `Registered Validators: ${stats.validatorCount}`,
      `Total Validations: ${stats.totalValidations}`,
      `Total Errors: ${stats.totalErrors}`,
      `Registrations: ${stats.registrationCount}`,
      `Lookups: ${stats.lookupCount}`,
    ].join('\n');
  }

  /**
   * Exports metrics in standardized format
   */
  exportMetrics(): { version: string; stats: RegistryStats } {
    return {
      version: '128.0.0',
      stats: this.getStats(),
    };
  }
}

export type RegistryStats = {
  name: string;
  validatorCount: number;
  totalValidations: number;
  totalErrors: number;
  registrationCount: number;
  lookupCount: number;
  lastRegistrationTime: number;
  lastLookupTime: number;
};
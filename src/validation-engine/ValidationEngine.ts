/**
 * ValidationEngine.ts - V82 Validation Engine Core
 * Main validation orchestrator for doc-editor
 */

export type ValidationConfig = {
  strict?: boolean;
  timeout?: number;
  maxErrors?: number;
  enableCache?: boolean;
  version: string;
};

export type ValidationRule = {
  id: string;
  name: string;
  validate: (data: unknown) => boolean | Promise<boolean>;
  priority?: number;
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  timestamp: number;
};

type Snapshot = {
  metrics: {
    totalValidations: number;
    totalErrors: number;
    lastValidation: number;
  };
};

export class ValidationEngine {
  private _config: ValidationConfig;
  private _rules: Map<string, ValidationRule> = new Map();
  private _metrics = {
    totalValidations: 0,
    totalErrors: 0,
    lastValidation: 0,
  };

  constructor(config: ValidationConfig) {
    this._config = { ...config };
    this._validateConfig();
  }

  get config(): ValidationConfig {
    return { ...this._config };
  }

  private _validateConfig(): void {
    if (!this._config.version) {
      this._config.version = '1.0.0';
    }
    if (!this._config.maxErrors) {
      this._config.maxErrors = 100;
    }
    if (this._config.timeout === undefined) {
      this._config.timeout = 5000;
    }
  }

  async validate(data: unknown): Promise<ValidationResult> {
    const errors: string[] = [];
    this._metrics.totalValidations++;
    this._metrics.lastValidation = Date.now();

    for (const [id, rule] of this._rules) {
      try {
        const result = await rule.validate(data);
        if (!result) {
          errors.push(`Rule "${rule.name}" (${id}) failed`);
          if (errors.length >= (this._config.maxErrors ?? 100)) {
            break;
          }
        }
      } catch (e) {
        errors.push(`Rule "${rule.name}" error: ${(e as Error).message}`);
        this._metrics.totalErrors++;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      timestamp: Date.now(),
    };
  }

  addRule(rule: ValidationRule): void {
    if (!rule.id || !rule.name || typeof rule.validate !== 'function') {
      throw new Error('Invalid rule: id, name, and validate are required');
    }
    this._rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this._rules.delete(ruleId);
  }

  getRules(): ValidationRule[] {
    return Array.from(this._rules.values());
  }

  getSnapshot(): Snapshot {
    return {
      metrics: { ...this._metrics },
    };
  }

  reset(): void {
    this._rules.clear();
    this._metrics = {
      totalValidations: 0,
      totalErrors: 0,
      lastValidation: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== ValidationEngine Report ===',
      `Version: ${this._config.version}`,
      `Total Validations: ${snapshot.metrics.totalValidations}`,
      `Total Errors: ${snapshot.metrics.totalErrors}`,
      `Last Validation: ${new Date(snapshot.metrics.lastValidation).toISOString()}`,
      `Active Rules: ${this._rules.size}`,
      `Strict Mode: ${this._config.strict ?? false}`,
      `===========================`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: Snapshot } {
    return {
      version: this._config.version,
      metrics: this.getSnapshot(),
    };
  }
}

export default ValidationEngine;
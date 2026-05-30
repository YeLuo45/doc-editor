/**
 * ValidatorV2.ts - Validator V2 Implementation
 * Version: 1.20.0
 * 
 * Provides core validation functionality with rule management,
 * validation execution, and statistics tracking.
 */

export type ValidationRule = {
  id: string;
  name: string;
  validate: (value: unknown) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
};

export type ValidatorConfig = {
  strictMode: boolean;
  timeout: number;
  maxErrors: number;
  continueOnError: boolean;
};

export type ValidationResult = {
  valid: boolean;
  errors: Array<{ ruleId: string; message: string }>;
  warnings: Array<{ ruleId: string; message: string }>;
  duration: number;
};

type RuleStorage = Map<string, ValidationRule>;

const DEFAULT_CONFIG: ValidatorConfig = {
  strictMode: true,
  timeout: 5000,
  maxErrors: 10,
  continueOnError: true,
};

export class ValidatorV2 {
  private readonly _rules: RuleStorage = new Map();
  private _validationCount = 0;
  private _errorCount = 0;
  private _lastValidationTime = 0;
  private _totalValidationDuration = 0;

  constructor(public readonly config: ValidatorConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validates a value against all registered rules
   */
  validate(value: unknown): ValidationResult {
    const startTime = Date.now();
    this._validationCount++;
    
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];
    
    for (const [id, rule] of this._rules) {
      if (errors.length >= this.config.maxErrors && !this.config.continueOnError) {
        break;
      }
      
      try {
        const isValid = rule.validate(value);
        if (!isValid) {
          if (rule.severity === 'error') {
            errors.push({ ruleId: id, message: rule.message });
            this._errorCount++;
          } else if (rule.severity === 'warning') {
            warnings.push({ ruleId: id, message: rule.message });
          }
        }
      } catch (err) {
        if (this.config.strictMode) {
          errors.push({ ruleId: id, message: `Validation error: ${err}` });
        }
      }
    }
    
    const duration = Date.now() - startTime;
    this._lastValidationTime = duration;
    this._totalValidationDuration += duration;
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      duration,
    };
  }

  /**
   * Adds a new validation rule
   */
  addRule(rule: ValidationRule): void {
    if (this._rules.has(rule.id)) {
      throw new Error(`Rule with id "${rule.id}" already exists`);
    }
    this._rules.set(rule.id, rule);
  }

  /**
   * Removes a validation rule by id
   */
  removeRule(ruleId: string): boolean {
    return this._rules.delete(ruleId);
  }

  /**
   * Gets the underlying validator (this instance)
   */
  getValidator(): ValidatorV2 {
    return this;
  }

  /**
   * Gets validation statistics
   */
  getStats(): {
    totalValidations: number;
    errorCount: number;
    averageDuration: number;
    lastDuration: number;
    ruleCount: number;
  } {
    return {
      totalValidations: this._validationCount,
      errorCount: this._errorCount,
      averageDuration: this._validationCount > 0 
        ? this._totalValidationDuration / this._validationCount 
        : 0,
      lastDuration: this._lastValidationTime,
      ruleCount: this._rules.size,
    };
  }

  /**
   * Gets a snapshot of current metrics
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        validationCount: this._validationCount,
        errorCount: this._errorCount,
        totalDuration: this._totalValidationDuration,
        ruleCount: this._rules.size,
        config: this.config,
      },
    };
  }

  /**
   * Resets all statistics and state
   */
  reset(): void {
    this._validationCount = 0;
    this._errorCount = 0;
    this._lastValidationTime = 0;
    this._totalValidationDuration = 0;
  }

  /**
   * Generates a text report of validator state
   */
  getReport(): string {
    const stats = this.getStats();
    const rules = Array.from(this._rules.values());
    
    let report = '=== Validator V2 Report ===\n';
    report += `Total Validations: ${stats.totalValidations}\n`;
    report += `Error Count: ${stats.errorCount}\n`;
    report += `Average Duration: ${stats.averageDuration.toFixed(2)}ms\n`;
    report += `Last Duration: ${stats.lastDuration}ms\n`;
    report += `Active Rules: ${stats.ruleCount}\n`;
    report += `Strict Mode: ${this.config.strictMode}\n`;
    report += '\nRegistered Rules:\n';
    
    for (const rule of rules) {
      report += `  - [${rule.severity}] ${rule.name} (${rule.id})\n`;
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
}
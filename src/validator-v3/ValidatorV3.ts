/**
 * ValidatorV3.ts - Validator V3 Implementation
 * Version: 128.0.0
 * 
 * Core validator with rule management, validation execution,
 * and comprehensive metrics reporting.
 */

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  duration: number;
  timestamp: number;
};

export type ValidationError = {
  code: string;
  message: string;
  field?: string;
  context?: Record<string, unknown>;
};

export type ValidationWarning = {
  code: string;
  message: string;
  field?: string;
};

export type ValidationRule = {
  id: string;
  name: string;
  validate: (value: unknown) => ValidationResult;
  priority: number;
  enabled: boolean;
};

export type ValidatorConfig = {
  name: string;
  description: string;
  strict: boolean;
  autoReset: boolean;
  maxErrors: number;
  timeout: number;
};

const DEFAULT_VALIDATOR_CONFIG: ValidatorConfig = {
  name: 'ValidatorV3',
  description: 'Validator V3 - Core validation with rule management',
  strict: false,
  autoReset: false,
  maxErrors: 100,
  timeout: 5000,
};

export class ValidatorV3 {
  private _rules: Map<string, ValidationRule> = new Map();
  private _validationCount = 0;
  private _errorCount = 0;
  private _warningCount = 0;
  private _totalValidationTime = 0;
  private _lastValidationResult: ValidationResult | null = null;

  constructor(public readonly config: ValidatorConfig = DEFAULT_VALIDATOR_CONFIG) {
    this.config = { ...DEFAULT_VALIDATOR_CONFIG, ...config };
  }

  /**
   * Validates a value against all registered rules
   */
  validate(value: unknown): ValidationResult {
    const startTime = Date.now();
    this._validationCount++;

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const [id, rule] of this._rules) {
      if (!rule.enabled) continue;

      try {
        const result = rule.validate(value);
        
        if (!result.valid && errors.length < this.config.maxErrors) {
          errors.push(...result.errors);
        }
        
        warnings.push(...result.warnings);
      } catch (error) {
        if (errors.length < this.config.maxErrors) {
          errors.push({
            code: 'RULE_EXECUTION_ERROR',
            message: String(error),
            field: id,
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    this._totalValidationTime += duration;

    const valid = errors.length === 0;

    const result: ValidationResult = {
      valid,
      errors: errors.slice(0, this.config.maxErrors),
      warnings,
      duration,
      timestamp: Date.now(),
    };

    this._lastValidationResult = result;
    if (!valid) this._errorCount++;
    if (warnings.length > 0) this._warningCount++;

    return result;
  }

  /**
   * Adds a new validation rule
   */
  addRule(rule: ValidationRule): boolean {
    if (!rule.id) return false;
    
    const newRule: ValidationRule = {
      ...rule,
      enabled: rule.enabled !== false,
      priority: rule.priority || 0,
    };

    this._rules.set(rule.id, newRule);
    return true;
  }

  /**
   * Removes a validation rule by ID
   */
  removeRule(ruleId: string): boolean {
    return this._rules.delete(ruleId);
  }

  /**
   * Gets the validator instance (self-reference)
   */
  getValidator(): ValidatorV3 {
    return this;
  }

  /**
   * Gets validation statistics
   */
  getStats(): ValidatorStats {
    return {
      name: this.config.name,
      ruleCount: this._rules.size,
      validationCount: this._validationCount,
      errorCount: this._errorCount,
      warningCount: this._warningCount,
      totalValidationTime: this._totalValidationTime,
      averageValidationTime: this._validationCount > 0 
        ? this._totalValidationTime / this._validationCount 
        : 0,
      lastValidationDuration: this._lastValidationResult?.duration || 0,
    };
  }

  /**
   * Gets a snapshot of current metrics
   */
  getSnapshot(): { metrics: ValidatorStats } {
    return {
      metrics: this.getStats(),
    };
  }

  /**
   * Resets all statistics and state
   */
  reset(): void {
    this._validationCount = 0;
    this._errorCount = 0;
    this._warningCount = 0;
    this._totalValidationTime = 0;
    this._lastValidationResult = null;
  }

  /**
   * Generates a text report of validator state
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      `ValidatorV3 Report: ${stats.name}`,
      `Rules: ${stats.ruleCount}`,
      `Validations: ${stats.validationCount}`,
      `Errors: ${stats.errorCount}`,
      `Warnings: ${stats.warningCount}`,
      `Avg Time: ${stats.averageValidationTime.toFixed(2)}ms`,
    ].join('\n');
  }

  /**
   * Exports metrics in standardized format
   */
  exportMetrics(): { version: string; stats: ValidatorStats } {
    return {
      version: '128.0.0',
      stats: this.getStats(),
    };
  }
}

export type ValidatorStats = {
  name: string;
  ruleCount: number;
  validationCount: number;
  errorCount: number;
  warningCount: number;
  totalValidationTime: number;
  averageValidationTime: number;
  lastValidationDuration: number;
};
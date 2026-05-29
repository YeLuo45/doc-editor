/**
 * Validator.ts - Input validator module for doc-editor V33 Iteration 3
 * Handles input validation with validate/check/isValid
 */

export interface ValidationRule {
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  field?: string;
  value?: unknown;
  message?: string;
  validator?: (value: unknown) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: number;
}

export interface ValidatorMetrics {
  totalValidated: number;
  totalPassed: number;
  totalFailed: number;
  averageValidationTime: number;
  rulesCount: number;
}

export interface ValidatorSnapshot {
  results: Map<string, ValidationResult>;
  metrics: ValidatorMetrics;
  timestamp: number;
}

export interface ValidatorReport {
  status: 'idle' | 'active' | 'error';
  metrics: ValidatorMetrics;
  passedCount: number;
  failedCount: number;
  rulesCount: number;
}

export interface ValidatorExportedMetrics {
  timestamp: number;
  metrics: ValidatorMetrics;
  version: string;
  exportVersion: string;
}

export class Validator {
  private results: Map<string, ValidationResult> = new Map();
  private metrics: ValidatorMetrics = {
    totalValidated: 0,
    totalPassed: 0,
    totalFailed: 0,
    averageValidationTime: 0,
    rulesCount: 0,
  };
  private validationHistory: Array<{ id: string; duration: number; success: boolean }> = [];

  /**
   * Validate data against rules
   */
  validate(data: unknown, rules: ValidationRule[]): ValidationResult {
    const startTime = Date.now();
    const id = `valid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      for (const rule of rules) {
        const result = this.applyRule(data, rule);
        if (!result.valid) {
          errors.push(result.errors.join(', '));
        }
        if (result.warnings.length > 0) {
          warnings.push(...result.warnings);
        }
      }

      const duration = Date.now() - startTime;
      const validationResult: ValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        timestamp: Date.now(),
      };

      this.results.set(id, validationResult);
      this.metrics.totalValidated++;
      this.metrics.rulesCount = rules.length;

      if (errors.length === 0) {
        this.metrics.totalPassed++;
      } else {
        this.metrics.totalFailed++;
      }

      this.validationHistory.push({ id, duration, success: errors.length === 0 });
      this.updateAverageValidationTime();

      return validationResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const validationResult: ValidationResult = {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        timestamp: Date.now(),
      };

      this.results.set(id, validationResult);
      this.metrics.totalValidated++;
      this.metrics.totalFailed++;
      this.validationHistory.push({ id, duration, success: false });
      this.updateAverageValidationTime();

      return validationResult;
    }
  }

  /**
   * Check a specific condition
   */
  check(data: unknown, condition: string): boolean {
    try {
      switch (condition) {
        case 'is-defined':
          return data !== undefined && data !== null;
        case 'is-string':
          return typeof data === 'string';
        case 'is-number':
          return typeof data === 'number' && !isNaN(data);
        case 'is-boolean':
          return typeof data === 'boolean';
        case 'is-object':
          return typeof data === 'object' && data !== null && !Array.isArray(data);
        case 'is-array':
          return Array.isArray(data);
        case 'is-empty':
          return this.isEmpty(data);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Check if data is valid according to rules
   */
  isValid(data: unknown, rules: ValidationRule[]): boolean {
    const result = this.validate(data, rules);
    return result.valid;
  }

  /**
   * Get validation result by ID
   */
  getResult(id: string): ValidationResult | undefined {
    return this.results.get(id);
  }

  /**
   * Get all validation results
   */
  getAllResults(): Map<string, ValidationResult> {
    return new Map(this.results);
  }

  /**
   * Get a snapshot of current validator state
   */
  getSnapshot(): ValidatorSnapshot {
    return {
      results: new Map(this.results),
      metrics: { ...this.metrics },
      timestamp: Date.now(),
    };
  }

  /**
   * Reset all results and metrics
   */
  reset(): void {
    this.results.clear();
    this.metrics = {
      totalValidated: 0,
      totalPassed: 0,
      totalFailed: 0,
      averageValidationTime: 0,
      rulesCount: 0,
    };
    this.validationHistory = [];
  }

  /**
   * Generate a detailed status report
   */
  getReport(): ValidatorReport {
    return {
      status: this.metrics.totalFailed > 0 ? 'error' : this.results.size > 0 ? 'active' : 'idle',
      metrics: { ...this.metrics },
      passedCount: this.metrics.totalPassed,
      failedCount: this.metrics.totalFailed,
      rulesCount: this.metrics.rulesCount,
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): ValidatorExportedMetrics {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      version: '1.0.0',
      exportVersion: 'V33-I3',
    };
  }

  private applyRule(data: unknown, rule: ValidationRule): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (rule.type) {
      case 'required':
        if (this.isEmpty(data)) {
          errors.push(rule.message || 'Field is required');
        }
        break;

      case 'type':
        if (rule.field && typeof data === 'object' && data !== null) {
          const value = (data as Record<string, unknown>)[rule.field];
          if (rule.value && typeof value !== rule.value) {
            errors.push(rule.message || `Expected type ${rule.value}`);
          }
        }
        break;

      case 'range':
        if (rule.field && typeof data === 'object' && data !== null) {
          const value = (data as Record<string, unknown>)[rule.field] as number;
          if (typeof value === 'number' && rule.value && typeof rule.value === 'object') {
            const range = rule.value as { min?: number; max?: number };
            if (range.min !== undefined && value < range.min) {
              errors.push(rule.message || `Value must be >= ${range.min}`);
            }
            if (range.max !== undefined && value > range.max) {
              errors.push(rule.message || `Value must be <= ${range.max}`);
            }
          }
        }
        break;

      case 'pattern':
        if (rule.field && typeof data === 'object' && data !== null) {
          const value = String((data as Record<string, unknown>)[rule.field]);
          const pattern = rule.value as string;
          if (pattern && !new RegExp(pattern).test(value)) {
            errors.push(rule.message || `Value does not match pattern ${pattern}`);
          }
        }
        break;

      case 'custom':
        if (rule.validator && rule.field && typeof data === 'object' && data !== null) {
          const value = (data as Record<string, unknown>)[rule.field];
          if (!rule.validator(value)) {
            errors.push(rule.message || 'Custom validation failed');
          }
        }
        break;
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private isEmpty(data: unknown): boolean {
    if (data === undefined || data === null) return true;
    if (typeof data === 'string') return data.trim().length === 0;
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === 'object') return Object.keys(data as object).length === 0;
    return false;
  }

  private updateAverageValidationTime(): void {
    const total = this.validationHistory.length;
    if (total > 0) {
      const sum = this.validationHistory.reduce((acc, v) => acc + v.duration, 0);
      this.metrics.averageValidationTime = sum / total;
    }
  }
}

export default Validator;
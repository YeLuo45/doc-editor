/**
 * ModuleD - Utils module for doc-editor V31 Iteration 1
 * Handles validation, formatting, and utility operations
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: number;
}

export interface FormatOptions {
  indent?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  trim?: boolean;
  nullify?: boolean;
}

export class ModuleD {
  private validationLog: ValidationResult[] = [];
  private formatLog: { input: unknown; output: unknown; timestamp: number }[] = [];
  private metrics: {
    totalValidations: number;
    totalFormats: number;
    validCount: number;
    invalidCount: number;
  } = {
    totalValidations: 0,
    totalFormats: 0,
    validCount: 0,
    invalidCount: 0,
  };

  /**
   * Validate input against rules
   */
  validate(input: unknown, rules?: { required?: boolean; type?: string; minLength?: number }): ValidationResult {
    this.metrics.totalValidations++;
    const errors: string[] = [];
    const warnings: string[] = [];

    if (rules?.required && (input === null || input === undefined)) {
      errors.push('Input is required but was null or undefined');
    }

    if (rules?.type && typeof input !== rules.type) {
      errors.push(`Expected type '${rules.type}' but got '${typeof input}'`);
    }

    if (rules?.minLength && typeof input === 'string' && input.length < rules.minLength) {
      errors.push(`Input length ${input.length} is below minimum ${rules.minLength}`);
    }

    if (typeof input === 'string' && input.length === 0) {
      warnings.push('Input is an empty string');
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: Date.now(),
    };

    this.validationLog.push(result);
    if (result.valid) {
      this.metrics.validCount++;
    } else {
      this.metrics.invalidCount++;
    }

    return result;
  }

  /**
   * Format input according to options
   */
  format(input: unknown, options?: FormatOptions): unknown {
    this.metrics.totalFormats++;

    if (input === null || input === undefined) {
      return options?.nullify ? null : input;
    }

    let output: unknown = input;

    if (typeof input === 'string') {
      if (options?.trim) {
        output = (output as string).trim();
      }
      if (options?.uppercase) {
        output = (output as string).toUpperCase();
      }
      if (options?.lowercase) {
        output = (output as string).toLowerCase();
      }
    }

    if (typeof input === 'object' && input !== null) {
      const formatted = JSON.stringify(output, null, options?.indent ?? 2);
      output = JSON.parse(formatted);
    }

    this.formatLog.push({
      input,
      output,
      timestamp: Date.now(),
    });

    return output;
  }

  /**
   * Get utility functions
   */
  getUtils(): {
    uuid: () => string;
    clamp: (value: number, min: number, max: number) => number;
    debounce: <T extends (...args: unknown[]) => void>(fn: T, delay: number) => T;
    throttle: <T extends (...args: unknown[]) => void>(fn: T, limit: number) => T;
  } {
    return {
      uuid: () => `uuid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
      debounce: <T extends (...args: unknown[]) => void>(fn: T, delay: number): T => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return ((...args: unknown[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), delay);
        }) as T;
      },
      throttle: <T extends (...args: unknown[]) => void>(fn: T, limit: number): T => {
        let inThrottle = false;
        return ((...args: unknown[]) => {
          if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
          }
        }) as T;
      },
    };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): {
    validationLog: ValidationResult[];
    formatLog: { input: unknown; output: unknown; timestamp: number }[];
    metrics: typeof this.metrics;
  } {
    return {
      validationLog: [...this.validationLog],
      formatLog: [...this.formatLog],
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset all state and metrics
   */
  reset(): void {
    this.validationLog = [];
    this.formatLog = [];
    this.metrics = {
      totalValidations: 0,
      totalFormats: 0,
      validCount: 0,
      invalidCount: 0,
    };
  }

  /**
   * Generate a status report
   */
  getReport(): {
    status: 'idle' | 'active';
    totalValidations: number;
    totalFormats: number;
    metrics: typeof this.metrics;
    validationSuccessRate: number;
  } {
    const successRate =
      this.metrics.totalValidations > 0
        ? this.metrics.validCount / this.metrics.totalValidations
        : 0;

    return {
      status: this.validationLog.length > 0 ? 'active' : 'idle',
      totalValidations: this.validationLog.length,
      totalFormats: this.formatLog.length,
      metrics: { ...this.metrics },
      validationSuccessRate: successRate,
    };
  }

  /**
   * Export metrics
   */
  exportMetrics(): {
    timestamp: number;
    metrics: typeof this.metrics;
    version: string;
  } {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      version: '1.0.0',
    };
  }
}

export default ModuleD;
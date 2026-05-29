/**
 * DataValidator.ts - V71 Import/Export Engine - Data Validation Module
 * Handles data validation, error reporting, and schema validation
 */

type ValidatorConfig = {
  strictMode: boolean;
  allowExtraFields: boolean;
  trimWhitespace: boolean;
  coerceTypes: boolean;
  schemaValidation: boolean;
};

interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  data: unknown;
  metadata: Record<string, unknown>;
}

interface ValidatorSchema {
  type: string;
  required?: string[];
  properties?: Record<string, ValidatorSchema>;
  items?: ValidatorSchema;
}

interface ValidatorMetrics {
  totalValidations: number;
  passedValidations: number;
  failedValidations: number;
  errorsByType: Record<string, number>;
}

export class DataValidator {
  private validationHistory: ValidationResult[] = [];
  private metrics: ValidatorMetrics = {
    totalValidations: 0,
    passedValidations: 0,
    failedValidations: 0,
    errorsByType: {},
  };
  private schema: ValidatorSchema | null = null;
  public readonly config: ValidatorConfig;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = {
      strictMode: config.strictMode ?? false,
      allowExtraFields: config.allowExtraFields ?? true,
      trimWhitespace: config.trimWhitespace ?? true,
      coerceTypes: config.coerceTypes ?? false,
      schemaValidation: config.schemaValidation ?? true,
    };
  }

  validate(data: unknown, schema?: ValidatorSchema): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      data,
      metadata: {},
    };

    if (schema) {
      this.schema = schema;
    }

    try {
      if (data === null || data === undefined) {
        result.errors.push({
          field: 'root',
          message: 'Data cannot be null or undefined',
          code: 'NULL_VALUE',
          severity: 'error',
        });
        result.valid = false;
      }

      if (this.schema && this.config.schemaValidation) {
        const schemaResult = this.validateAgainstSchema(data, this.schema);
        result.errors.push(...schemaResult.errors);
        result.warnings.push(...schemaResult.warnings);
        if (!schemaResult.valid) {
          result.valid = false;
        }
      }

      if (typeof data === 'object' && data !== null) {
        this.validateObject(data as Record<string, unknown>, result);
      }

      result.metadata = {
        validationTime: Date.now(),
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        strictMode: this.config.strictMode,
      };
    } catch (error) {
      result.errors.push({
        field: 'root',
        message: error instanceof Error ? error.message : 'Validation error',
        code: 'VALIDATION_ERROR',
        severity: 'error',
      });
      result.valid = false;
    }

    this.validationHistory.push(result);
    this.metrics.totalValidations++;
    if (result.valid) {
      this.metrics.passedValidations++;
    } else {
      this.metrics.failedValidations++;
      for (const err of result.errors) {
        this.metrics.errorsByType[err.code] = (this.metrics.errorsByType[err.code] || 0) + 1;
      }
    }

    return result;
  }

  getErrors(result: ValidationResult): ValidationError[] {
    return result.errors.filter(e => e.severity === 'error');
  }

  clean(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.clean(item));
    }

    const cleaned: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      const cleanedKey = this.config.trimWhitespace ? key.trim() : key;
      
      if (typeof value === 'string' && this.config.trimWhitespace) {
        cleaned[cleanedKey] = value.trim();
      } else if (typeof value === 'object' && value !== null) {
        cleaned[cleanedKey] = this.clean(value);
      } else {
        cleaned[cleanedKey] = value;
      }
    }

    return cleaned;
  }

  getSchema(): ValidatorSchema | null {
    return this.schema;
  }

  getSnapshot(): { metrics: ValidatorMetrics } {
    return { metrics: { ...this.metrics } };
  }

  reset(): void {
    this.validationHistory = [];
    this.metrics = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      errorsByType: {},
    };
    this.schema = null;
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const errorStats = Object.entries(snapshot.metrics.errorsByType)
      .map(([code, count]) => `  ${code}: ${count}`)
      .join('\n');
    
    return [
      '=== DataValidator Report ===',
      `Total Validations: ${snapshot.metrics.totalValidations}`,
      `Passed: ${snapshot.metrics.passedValidations}`,
      `Failed: ${snapshot.metrics.failedValidations}`,
      `Error Types:\n${errorStats || '  (none)'}`,
      '===========================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v71-data-validator' };
  }

  private validateObject(obj: Record<string, unknown>, result: ValidationResult): void {
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        result.errors.push({
          field: key,
          message: `Field '${key}' is undefined`,
          code: 'UNDEFINED_VALUE',
          severity: 'error',
        });
        result.valid = false;
      }

      if (typeof value === 'string') {
        if (this.config.trimWhitespace && value !== value.trim()) {
          result.warnings.push({
            field: key,
            message: `Field '${key}' has leading/trailing whitespace`,
            code: 'WHITESPACE',
            severity: 'warning',
          });
        }
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nestedResult: ValidationResult = {
          valid: true,
          errors: [],
          warnings: [],
          data: value,
          metadata: {},
        };
        this.validateObject(value as Record<string, unknown>, nestedResult);
        result.errors.push(...nestedResult.errors);
        result.warnings.push(...nestedResult.warnings);
        if (!nestedResult.valid) {
          result.valid = false;
        }
      }
    }
  }

  private validateAgainstSchema(
    data: unknown,
    schema: ValidatorSchema
  ): { valid: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let valid = true;

    if (schema.type) {
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      if (schema.type !== actualType && !(schema.type === 'object' && typeof data === 'object' && data !== null)) {
        errors.push({
          field: 'root',
          message: `Type mismatch: expected ${schema.type}, got ${actualType}`,
          code: 'TYPE_MISMATCH',
          severity: 'error',
        });
        valid = false;
      }
    }

    if (schema.required && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      for (const requiredField of schema.required) {
        if (!(requiredField in obj) || obj[requiredField] === undefined) {
          errors.push({
            field: requiredField,
            message: `Required field '${requiredField}' is missing`,
            code: 'MISSING_REQUIRED',
            severity: 'error',
          });
          valid = false;
        }
      }
    }

    if (schema.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      
      if (!this.config.allowExtraFields) {
        for (const key of Object.keys(obj)) {
          if (!schema.properties[key]) {
            errors.push({
              field: key,
              message: `Extra field '${key}' not allowed in strict mode`,
              code: 'EXTRA_FIELD',
              severity: 'error',
            });
            valid = false;
          }
        }
      }

      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in obj) {
          const propResult = this.validateAgainstSchema(obj[propName], propSchema);
          errors.push(...propResult.errors.map(e => ({ ...e, field: `${propName}.${e.field}` })));
          warnings.push(...propResult.warnings.map(w => ({ ...w, field: `${propName}.${w.field}` })));
          if (!propResult.valid) {
            valid = false;
          }
        }
      }
    }

    return { valid, errors, warnings };
  }
}
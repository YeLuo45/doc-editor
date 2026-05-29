/**
 * SchemaValidator.ts - V82 Schema Validator
 * Handles JSON schema validation for doc structures
 */

export type SchemaField = {
  type: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
};

export type SchemaDefinition = {
  [key: string]: SchemaField;
};

export type SchemaConfig = {
  version: string;
  strict?: boolean;
  allowAdditional?: boolean;
};

export type SchemaError = {
  field: string;
  message: string;
  code: string;
};

type Snapshot = {
  metrics: {
    totalValidations: number;
    totalErrors: number;
    lastValidation: number;
  };
};

export class SchemaValidator {
  private _config: SchemaConfig;
  private _schema: SchemaDefinition = {};
  private _errors: SchemaError[] = [];
  private _metrics = {
    totalValidations: 0,
    totalErrors: 0,
    lastValidation: 0,
  };

  constructor(config: SchemaConfig) {
    this._config = { ...config };
  }

  get config(): SchemaConfig {
    return { ...this._config };
  }

  getErrors(): SchemaError[] {
    return [...this._errors];
  }

  getSchema(): SchemaDefinition {
    return { ...this._schema };
  }

  validate(data: Record<string, unknown>): boolean {
    this._errors = [];
    this._metrics.totalValidations++;
    this._metrics.lastValidation = Date.now();

    if (!data || typeof data !== 'object') {
      this._addError('root', 'Data must be an object', 'INVALID_TYPE');
      return false;
    }

    for (const [field, spec] of Object.entries(this._schema)) {
      const value = data[field];

      if (spec.required && (value === undefined || value === null)) {
        this._addError(field, 'Field is required', 'REQUIRED');
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      if (!this._validateType(field, value, spec.type)) {
        this._addError(field, `Expected type ${spec.type}`, 'TYPE_MISMATCH');
      } else if (spec.minLength !== undefined && typeof value === 'string' && value.length < spec.minLength) {
        this._addError(field, `Min length ${spec.minLength}`, 'TOO_SHORT');
      } else if (spec.maxLength !== undefined && typeof value === 'string' && value.length > spec.maxLength) {
        this._addError(field, `Max length ${spec.maxLength}`, 'TOO_LONG');
      } else if (spec.pattern && typeof value === 'string' && !new RegExp(spec.pattern).test(value)) {
        this._addError(field, `Pattern mismatch: ${spec.pattern}`, 'PATTERN_FAIL');
      }
    }

    this._metrics.totalErrors += this._errors.length;
    return this._errors.length === 0;
  }

  private _validateType(field: string, value: unknown, expected: string): boolean {
    const actual = Array.isArray(value) ? 'array' : typeof value;
    if (expected === 'number') {
      return actual === 'number';
    }
    if (expected === 'boolean') {
      return actual === 'boolean';
    }
    if (expected === 'string') {
      return actual === 'string';
    }
    if (expected === 'object') {
      return actual === 'object' && !Array.isArray(value);
    }
    if (expected === 'array') {
      return Array.isArray(value);
    }
    return actual === expected;
  }

  private _addError(field: string, message: string, code: string): void {
    this._errors.push({ field, message, code });
  }

  apply(schema: SchemaDefinition): void {
    this._schema = { ...schema };
  }

  getSnapshot(): Snapshot {
    return {
      metrics: { ...this._metrics },
    };
  }

  reset(): void {
    this._schema = {};
    this._errors = [];
    this._metrics = { totalValidations: 0, totalErrors: 0, lastValidation: 0 };
  }

  getReport(): string {
    return [
      '=== SchemaValidator Report ===',
      `Version: ${this._config.version}`,
      `Schema Fields: ${Object.keys(this._schema).length}`,
      `Total Validations: ${this._metrics.totalValidations}`,
      `Total Errors: ${this._metrics.totalErrors}`,
      `Last Validation: ${new Date(this._metrics.lastValidation).toISOString()}`,
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

export default SchemaValidator;
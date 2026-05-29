/**
 * ConfigValidator.ts
 * V79 Config Validator - Configuration validation and schema enforcement
 */

import { ConfigValue } from './ConfigRegistry';

export type ValidationError = {
  field: string;
  message: string;
  code: string;
};

export type SchemaDefinition = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'null';
  required?: boolean;
  default?: ConfigValue;
  validator?: (value: ConfigValue) => boolean;
};

export type SchemaMap = Map<string, SchemaDefinition>;
export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

export type ValidatorMetrics = {
  validatedCount: number;
  errorCount: number;
  timestamp: number;
};

export interface IConfigValidator {
  validate(data: Record<string, ConfigValue>): ValidationResult;
  getErrors(): ValidationError[];
  apply(data: Record<string, ConfigValue>): Record<string, ConfigValue>;
  getSchema(key: string): SchemaDefinition | undefined;
}

export class ConfigValidator implements IConfigValidator {
  private _schema: SchemaMap = new Map();
  private _errors: ValidationError[] = [];
  private _validatedCount: number = 0;
  private _errorCount: number = 0;
  private _creationTime: number = Date.now();

  get config(): SchemaMap {
    return this._schema;
  }

  addSchema(key: string, definition: SchemaDefinition): void {
    this._schema.set(key, definition);
  }

  removeSchema(key: string): boolean {
    return this._schema.delete(key);
  }

  validate(data: Record<string, ConfigValue>): ValidationResult {
    this._errors = [];
    this._validatedCount++;

    for (const [key, definition] of this._schema.entries()) {
      const value = data[key];

      if (definition.required && (value === undefined || value === null)) {
        this._errors.push({
          field: key,
          message: `Field '${key}' is required but missing`,
          code: 'REQUIRED_FIELD_MISSING',
        });
        this._errorCount++;
        continue;
      }

      if (value !== undefined && value !== null) {
        const actualType = typeof value;
        if (actualType !== definition.type) {
          this._errors.push({
            field: key,
            message: `Field '${key}' expected type '${definition.type}' but got '${actualType}'`,
            code: 'TYPE_MISMATCH',
          });
          this._errorCount++;
        }

        if (definition.validator && !definition.validator(value)) {
          this._errors.push({
            field: key,
            message: `Field '${key}' failed custom validation`,
            code: 'VALIDATION_FAILED',
          });
          this._errorCount++;
        }
      }
    }

    return {
      valid: this._errors.length === 0,
      errors: [...this._errors],
    };
  }

  getErrors(): ValidationError[] {
    return [...this._errors];
  }

  apply(data: Record<string, ConfigValue>): Record<string, ConfigValue> {
    const result: Record<string, ConfigValue> = { ...data };

    for (const [key, definition] of this._schema.entries()) {
      if (result[key] === undefined && definition.default !== undefined) {
        result[key] = definition.default;
      }
    }

    return result;
  }

  getSchema(key: string): SchemaDefinition | undefined {
    return this._schema.get(key);
  }

  getAllSchemas(): Record<string, SchemaDefinition> {
    const result: Record<string, SchemaDefinition> = {};
    this._schema.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  clearSchemas(): void {
    this._schema.clear();
    this._errors = [];
  }

  getSnapshot(): { metrics: ValidatorMetrics } {
    return {
      metrics: {
        validatedCount: this._validatedCount,
        errorCount: this._errorCount,
        timestamp: Date.now(),
      },
    };
  }

  reset(): void {
    this._schema.clear();
    this._errors = [];
    this._validatedCount = 0;
    this._errorCount = 0;
    this._creationTime = Date.now();
  }

  getReport(): string {
    const uptime = Date.now() - this._creationTime;
    const lines = [
      '=== ConfigValidator Report ===',
      `Defined Schemas: ${this._schema.size}`,
      `Total Validations: ${this._validatedCount}`,
      `Total Errors: ${this._errorCount}`,
      `Uptime: ${uptime}ms`,
      '=== End Report ===',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V79-ConfigValidator-1.0',
    };
  }
}

export const defaultValidator = new ConfigValidator();
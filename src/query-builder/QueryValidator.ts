export type ValidatorConfig = {
  strict?: boolean;
  schema?: Record<string, unknown>;
};

export type ValidationError = {
  field: string;
  message: string;
  code: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

export class QueryValidator {
  config: ValidatorConfig;
  private errors: ValidationError[];
  private validationCount: number;
  private lastCheckResult: boolean;

  constructor(config: ValidatorConfig = {}) {
    this.config = config;
    this.errors = [];
    this.validationCount = 0;
    this.lastCheckResult = false;
  }

  validate(query: string, params: unknown[] = []): ValidationResult {
    this.validationCount++;
    this.errors = [];

    if (!query || typeof query !== 'string') {
      this.errors.push({
        field: 'query',
        message: 'Query must be a non-empty string',
        code: 'INVALID_QUERY',
      });
    }

    if (this.config.strict && query.includes(';')) {
      this.errors.push({
        field: 'query',
        message: 'Query contains forbidden character',
        code: 'SQL_INJECTION_RISK',
      });
    }

    if (!Array.isArray(params)) {
      this.errors.push({
        field: 'params',
        message: 'Params must be an array',
        code: 'INVALID_PARAMS',
      });
    }

    if (this.config.schema) {
      this.validateSchema(params);
    }

    this.lastCheckResult = this.errors.length === 0;
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
    };
  }

  private validateSchema(params: unknown[]): void {
    if (!this.config.schema) return;

    const schemaProps = Object.keys(this.config.schema);
    if (params.length !== schemaProps.length && this.config.strict) {
      this.errors.push({
        field: 'params',
        message: `Expected ${schemaProps.length} params but got ${params.length}`,
        code: 'SCHEMA_MISMATCH',
      });
    }
  }

  getErrors(): ValidationError[] {
    return [...this.errors];
  }

  check(query: string): boolean {
    const result = this.validate(query);
    return result.valid;
  }

  getSchema(): Record<string, unknown> | null {
    return this.config.schema ? { ...this.config.schema } : null;
  }

  reset(): void {
    this.errors = [];
    this.validationCount = 0;
    this.lastCheckResult = false;
  }

  getSnapshot(): { metrics: { validationCount: number; errorCount: number } } {
    return {
      metrics: {
        validationCount: this.validationCount,
        errorCount: this.errors.length,
      },
    };
  }

  getReport(): string {
    return JSON.stringify({
      config: this.config,
      validationCount: this.validationCount,
      errors: this.errors,
      lastCheckResult: this.lastCheckResult,
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V91-QueryValidator-1.0.0',
    };
  }
}
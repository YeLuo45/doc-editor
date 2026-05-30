/**
 * V95 Workflow Registry - WorkflowValidator.ts
 * Workflow validator with validate/getErrors/check/getSchema
 */

export type ValidationError = {
  code: string;
  message: string;
  field?: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

export type WorkflowSchema = {
  requiredFields: string[];
  optionalFields: string[];
  stepSchema?: {
    required: string[];
    optional: string[];
  };
};

export type WorkflowValidatorConfig = {
  strictMode?: boolean;
  schemaVersion?: string;
  allowPartialValidation?: boolean;
};

interface ValidatorMetrics {
  totalValidated: number;
  validCount: number;
  invalidCount: number;
  lastValidationTime?: number;
}

export class WorkflowValidator {
  private errors: ValidationError[] = [];
  private validationCount: number = 0;
  
  readonly config: WorkflowValidatorConfig;

  readonly schema: WorkflowSchema = {
    requiredFields: ['id', 'name', 'version'],
    optionalFields: ['description', 'enabled', 'priority', 'metadata'],
    stepSchema: {
      required: ['id', 'type'],
      optional: ['config', 'next'],
    },
  };

  constructor(config: WorkflowValidatorConfig = {}) {
    this.config = {
      strictMode: config.strictMode ?? false,
      schemaVersion: config.schemaVersion ?? '1.0.0',
      allowPartialValidation: config.allowPartialValidation ?? false,
    };
  }

  validate(workflow: Record<string, unknown>): ValidationResult {
    this.errors = [];
    this.validationCount++;

    for (const field of this.schema.requiredFields) {
      if (!(field in workflow)) {
        this.errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Required field "${field}" is missing`,
          field,
        });
      }
    }

    if (workflow.id !== undefined && typeof workflow.id !== 'string') {
      this.errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Field "id" must be a string',
        field: 'id',
      });
    }

    if (workflow.name !== undefined && typeof workflow.name !== 'string') {
      this.errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Field "name" must be a string',
        field: 'name',
      });
    }

    if (workflow.version !== undefined && typeof workflow.version !== 'string') {
      this.errors.push({
        code: 'INVALID_FIELD_TYPE',
        message: 'Field "version" must be a string',
        field: 'version',
      });
    }

    if (this.config.strictMode && this.errors.length > 0) {
      return { valid: false, errors: [...this.errors] };
    }

    const isValid = this.errors.length === 0 || this.config.allowPartialValidation;
    return { valid: isValid, errors: [...this.errors] };
  }

  getErrors(): ValidationError[] {
    return [...this.errors];
  }

  check(workflow: Record<string, unknown>): boolean {
    return this.validate(workflow).valid;
  }

  getSchema(): WorkflowSchema {
    return { ...this.schema };
  }

  getSnapshot(): { metrics: ValidatorMetrics } {
    return {
      metrics: {
        totalValidated: this.validationCount,
        validCount: this.validationCount - this.errors.length,
        invalidCount: this.errors.length,
        lastValidationTime: Date.now(),
      },
    };
  }

  reset(): void {
    this.errors = [];
    this.validationCount = 0;
  }

  getReport(): string {
    const { metrics } = this.getSnapshot();
    return [
      '=== Workflow Validator Report ===',
      `Total Validated: ${metrics.totalValidated}`,
      `Valid: ${metrics.validCount}`,
      `Invalid: ${metrics.invalidCount}`,
      `Schema Version: ${this.config.schemaVersion}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}
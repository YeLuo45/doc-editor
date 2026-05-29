/**
 * IntegrationUtils.ts - Utility Functions
 * V30 Integration Hub for doc-editor
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TransformOptions {
  inputEncoding?: string;
  outputEncoding?: string;
  strict?: boolean;
}

export class IntegrationUtils {
  private snapshots: Record<string, unknown>[] = [];
  private validationHistory: ValidationResult[] = [];
  private transformCount = { success: 0, failed: 0 };

  validate(data: unknown, schema: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data === undefined || data === null) {
      errors.push('Data is null or undefined');
    }

    if (typeof data !== 'object') {
      errors.push('Data must be an object');
    }

    // Basic schema validation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataObj = data as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schemaObj = schema as any;

    if (schemaObj.required) {
      for (const field of schemaObj.required) {
        if (dataObj[field] === undefined) {
          errors.push(`Required field "${field}" is missing`);
        }
      }
    }

    const result: ValidationResult = { valid: errors.length === 0, errors, warnings };
    this.validationHistory.push(result);
    return result;
  }

  async transform(
    data: unknown,
    transformers: Array<(input: unknown) => Promise<unknown>>,
    options?: TransformOptions
  ): Promise<unknown> {
    const strict = options?.strict ?? true;
    let result: unknown = data;

    for (const transformer of transformers) {
      try {
        result = await transformer(result);
        this.transformCount.success++;
      } catch (error) {
        this.transformCount.failed++;
        if (strict) {
          throw new Error(`Transform failed: ${error}`);
        }
        warnings.push(`Transform warning: ${error}`);
      }
    }

    return result;
  }

  merge(target: unknown, source: unknown): unknown {
    return this.deepMerge(target, source);
  }

  private deepMerge(target: unknown, source: unknown): unknown {
    if (typeof target !== 'object' || typeof source !== 'object') {
      return source;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = Array.isArray(target) ? [...target] : { ...(target as object) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceObj = source as any;

    for (const key of Object.keys(sourceObj)) {
      if (
        sourceObj[key] &&
        typeof sourceObj[key] === 'object' &&
        !Array.isArray(sourceObj[key])
      ) {
        result[key] = this.deepMerge(result[key] ?? {}, sourceObj[key]);
      } else {
        result[key] = sourceObj[key];
      }
    }
    return result;
  }

  getUtils(): IntegrationUtils {
    return this;
  }

  getSnapshot(): Record<string, unknown> {
    const snapshot = {
      snapshotCount: this.snapshots.length,
      validationCount: this.validationHistory.length,
      transformCount: { ...this.transformCount },
      timestamp: Date.now(),
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  reset(): void {
    this.snapshots = [];
    this.validationHistory = [];
    this.transformCount = { success: 0, failed: 0 };
  }

  getReport(): Record<string, unknown> {
    const validCount = this.validationHistory.filter((r) => r.valid).length;
    return {
      totalValidations: this.validationHistory.length,
      validCount,
      invalidCount: this.validationHistory.length - validCount,
      transformSuccess: this.transformCount.success,
      transformFailed: this.transformCount.failed,
    };
  }

  exportMetrics(): Record<string, unknown> {
    return {
      validationHistory: this.validationHistory.length,
      transformSuccess: this.transformCount.success,
      transformFailed: this.transformCount.failed,
      snapshots: this.snapshots.length,
    };
  }
}

export default IntegrationUtils;
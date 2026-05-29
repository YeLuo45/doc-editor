/**
 * DataValidator.ts - V82 Data Validator
 * Data cleaning and validation operations
 */

export type DataConfig = {
  version: string;
  trimWhitespace?: boolean;
  coerceTypes?: boolean;
  removeNulls?: boolean;
};

export type DataError = {
  path: string;
  message: string;
  value?: unknown;
};

export type ValidationStats = {
  totalCleaned: number;
  errorsFound: number;
  nullsRemoved: number;
  stringsTrimmed: number;
};

type Snapshot = {
  metrics: {
    totalValidations: number;
    totalErrors: number;
    lastValidation: number;
  };
};

export class DataValidator {
  private _config: DataConfig;
  private _errors: DataError[] = [];
  private _stats: ValidationStats = {
    totalCleaned: 0,
    errorsFound: 0,
    nullsRemoved: 0,
    stringsTrimmed: 0,
  };
  private _metrics = {
    totalValidations: 0,
    totalErrors: 0,
    lastValidation: 0,
  };

  constructor(config: DataConfig) {
    this._config = { ...config };
    if (this._config.trimWhitespace === undefined) this._config.trimWhitespace = true;
    if (this._config.coerceTypes === undefined) this._config.coerceTypes = false;
    if (this._config.removeNulls === undefined) this._config.removeNulls = false;
  }

  get config(): DataConfig {
    return { ...this._config };
  }

  validate(data: unknown): boolean {
    this._errors = [];
    this._metrics.totalValidations++;
    this._metrics.lastValidation = Date.now();

    if (data === null || data === undefined) {
      this._addError('root', 'Data cannot be null or undefined');
      return false;
    }

    if (typeof data === 'object') {
      this._validateObject(data as Record<string, unknown>);
    } else {
      this._addError('root', `Unsupported data type: ${typeof data}`);
    }

    this._metrics.totalErrors += this._errors.length;
    this._stats.errorsFound = this._errors.length;
    return this._errors.length === 0;
  }

  private _validateObject(obj: Record<string, unknown>, path = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (value === null) {
        if (this._config.removeNulls) {
          this._stats.nullsRemoved++;
        } else {
          this._addError(currentPath, 'Null value found', value);
        }
        continue;
      }

      if (typeof value === 'string' && this._config.trimWhitespace) {
        const trimmed = value.trim();
        if (trimmed !== value) {
          this._stats.stringsTrimmed++;
          obj[key] = trimmed;
        }
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this._validateObject(value as Record<string, unknown>, currentPath);
      }
    }
  }

  clean(data: unknown): Record<string, unknown> {
    this._stats.totalCleaned++;
    if (typeof data !== 'object' || data === null) {
      return {};
    }

    const result: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      if (value === null && this._config.removeNulls) {
        continue;
      }
      if (typeof value === 'string' && this._config.trimWhitespace) {
        result[key] = value.trim();
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.clean(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  getErrors(): DataError[] {
    return [...this._errors];
  }

  getStats(): ValidationStats {
    return { ...this._stats };
  }

  private _addError(path: string, message: string, value?: unknown): void {
    this._errors.push({ path, message, value });
  }

  getSnapshot(): Snapshot {
    return {
      metrics: { ...this._metrics },
    };
  }

  reset(): void {
    this._errors = [];
    this._stats = { totalCleaned: 0, errorsFound: 0, nullsRemoved: 0, stringsTrimmed: 0 };
    this._metrics = { totalValidations: 0, totalErrors: 0, lastValidation: 0 };
  }

  getReport(): string {
    return [
      '=== DataValidator Report ===',
      `Version: ${this._config.version}`,
      `Total Cleaned: ${this._stats.totalCleaned}`,
      `Errors Found: ${this._stats.errorsFound}`,
      `Nulls Removed: ${this._stats.nullsRemoved}`,
      `Strings Trimmed: ${this._stats.stringsTrimmed}`,
      `Total Validations: ${this._metrics.totalValidations}`,
      `Total Errors: ${this._metrics.totalErrors}`,
      `Last Validation: ${new Date(this._metrics.lastValidation).toISOString()}`,
      `=======================`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: Snapshot } {
    return {
      version: this._config.version,
      metrics: this.getSnapshot(),
    };
  }
}

export default DataValidator;
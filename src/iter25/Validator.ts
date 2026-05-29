export type ValidatorConfig = { schema?: Record<string, unknown> };
export type ValidatorSnapshot = { validated: number; errors: number };
export type ValidatorMetrics = { version: string };

export class Validator {
  config: ValidatorConfig;
  private validated = 0;
  private errors: string[] = [];

  constructor(config: ValidatorConfig = {}) { this.config = config; }

  validate(data: unknown): boolean { this.validated++; return data !== null && data !== undefined; }
  getErrors(): string[] { return [...this.errors]; }
  addError(msg: string): void { this.errors.push(msg); }
  clearErrors(): void { this.errors = []; }
  getSnapshot(): ValidatorSnapshot { return { validated: this.validated, errors: this.errors.length }; }
  reset(): void { this.validated = 0; this.errors = []; }
  getReport(): string { return `Validator[validated=${this.validated}, errors=${this.errors.length}]`; }
  exportMetrics(): ValidatorMetrics { return { version: 'V55-I25' }; }
}

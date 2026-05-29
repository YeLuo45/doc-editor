/**
 * V40 Iteration 10 - Validator Module
 */

export type ValidationRule = { pattern?: RegExp; minLength?: number };
export type ValidationResult = { valid: boolean; error?: string };
export type ValidationError = { field: string; message: string };
export type ValidatorState = { validCount: number; invalidCount: number };
export type ValidatorSnapshot = ValidatorState & { rules: number };
export type ValidatorMetrics = { version: string };

export class Validator {
  private state: ValidatorState = { validCount: 0, invalidCount: 0 };
  private rules: ValidationRule[] = [];

  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  validate(data: string): boolean {
    const result = this.check(data);
    if (result) this.state.validCount++;
    else this.state.invalidCount++;
    return result;
  }

  check(data: string): boolean {
    if (!data || data.trim() === '') return false;
    for (const rule of this.rules) {
      if (rule.minLength && data.length < rule.minLength) return false;
      if (rule.pattern && !rule.pattern.test(data)) return false;
    }
    return true;
  }

  isValid(data: string): boolean {
    return data.length > 0;
  }

  getSnapshot(): ValidatorSnapshot {
    return { ...this.state, rules: this.rules.length };
  }

  reset(): void {
    this.state = { validCount: 0, invalidCount: 0 };
    this.rules = [];
  }

  getReport(): string {
    return `Validator[valid=${this.state.validCount}, invalid=${this.state.invalidCount}]`;
  }

  exportMetrics(): ValidatorMetrics {
    return { version: 'V40-I10' };
  }
}
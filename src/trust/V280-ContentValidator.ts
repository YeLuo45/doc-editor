/**
 * V280 ContentValidator - Direction E Trust Verification (Iter 6/30)
 * thunderbolt: Validate content (schema/format/safety)
 */
export type ValidationRule = 'required' | 'minLength' | 'maxLength' | 'pattern' | 'type' | 'range';

export interface ValidationIssue {
  rule: ValidationRule;
  path: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ValidationResult {
  docId: string;
  valid: boolean;
  issues: ValidationIssue[];
  validatedAt: number;
}

export interface ValidatorState {
  results: Map<string, ValidationResult>;
  totalValidations: number;
  totalValid: number;
  totalInvalid: number;
}

export function createValidatorState(): ValidatorState {
  return { results: new Map(), totalValidations: 0, totalValid: 0, totalInvalid: 0 };
}

export function validateRequired(state: ValidatorState, docId: string, value: any, path: string): ValidationIssue[] {
  if (value === null || value === undefined || value === '') {
    return [{ rule: 'required', path, message: 'Field is required', severity: 'error' }];
  }
  return [];
}

export function validateMinLength(state: ValidatorState, docId: string, value: string, min: number, path: string): ValidationIssue[] {
  if (typeof value === 'string' && value.length < min) {
    return [{ rule: 'minLength', path, message: `Min length ${min}`, severity: 'error' }];
  }
  return [];
}

export function validateMaxLength(state: ValidatorState, docId: string, value: string, max: number, path: string): ValidationIssue[] {
  if (typeof value === 'string' && value.length > max) {
    return [{ rule: 'maxLength', path, message: `Max length ${max}`, severity: 'error' }];
  }
  return [];
}

export function validatePattern(state: ValidatorState, docId: string, value: string, pattern: RegExp, path: string): ValidationIssue[] {
  if (typeof value === 'string' && !pattern.test(value)) {
    return [{ rule: 'pattern', path, message: `Does not match pattern ${pattern}`, severity: 'error' }];
  }
  return [];
}

export function validateDoc(state: ValidatorState, docId: string, checks: { path: string; value: any; rules: { minLength?: number; maxLength?: number; pattern?: RegExp; required?: boolean } }[]): { state: ValidatorState; result: ValidationResult } {
  const issues: ValidationIssue[] = [];
  for (const check of checks) {
    if (check.rules.required) issues.push(...validateRequired(state, docId, check.value, check.path));
    if (check.rules.minLength !== undefined) issues.push(...validateMinLength(state, docId, check.value, check.rules.minLength, check.path));
    if (check.rules.maxLength !== undefined) issues.push(...validateMaxLength(state, docId, check.value, check.rules.maxLength, check.path));
    if (check.rules.pattern) issues.push(...validatePattern(state, docId, check.value, check.rules.pattern, check.path));
  }
  const valid = !issues.some(i => i.severity === 'error');
  const result: ValidationResult = { docId, valid, issues, validatedAt: Date.now() };
  return {
    state: { ...state, results: new Map(state.results).set(docId, result), totalValidations: state.totalValidations + 1, totalValid: state.totalValid + (valid ? 1 : 0), totalInvalid: state.totalInvalid + (valid ? 0 : 1) },
    result,
  };
}

export function getValidation(state: ValidatorState, docId: string): ValidationResult | undefined {
  return state.results.get(docId);
}

export function getInvalidDocs(state: ValidatorState): ValidationResult[] {
  return Array.from(state.results.values()).filter(r => !r.valid);
}

export function clearValidations(state: ValidatorState): ValidatorState {
  return createValidatorState();
}

export function getValidatorReport(state: ValidatorState): { totalValidations: number; totalValid: number; totalInvalid: number; invalidDocs: number } {
  return { totalValidations: state.totalValidations, totalValid: state.totalValid, totalInvalid: state.totalInvalid, invalidDocs: getInvalidDocs(state).length };
}

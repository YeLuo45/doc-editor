import { describe, it, expect } from 'vitest';
import {
  createValidatorState, validateRequired, validateMinLength, validateMaxLength, validatePattern,
  validateDoc, getValidation, getInvalidDocs, clearValidations, getValidatorReport,
} from '../../trust/V280-ContentValidator';

describe('V280 ContentValidator', () => {
  it('should create empty state', () => {
    const s = createValidatorState();
    expect(s.results.size).toBe(0);
  });

  it('should validate required', () => {
    const s = createValidatorState();
    expect(validateRequired(s, 'd1', null, 'title')).toHaveLength(1);
    expect(validateRequired(s, 'd1', 'ok', 'title')).toHaveLength(0);
  });

  it('should validate min length', () => {
    const s = createValidatorState();
    expect(validateMinLength(s, 'd1', 'a', 3, 'title')).toHaveLength(1);
    expect(validateMinLength(s, 'd1', 'abc', 3, 'title')).toHaveLength(0);
  });

  it('should validate max length', () => {
    const s = createValidatorState();
    expect(validateMaxLength(s, 'd1', 'abcdef', 3, 'title')).toHaveLength(1);
  });

  it('should validate pattern', () => {
    const s = createValidatorState();
    expect(validatePattern(s, 'd1', 'abc', /^[0-9]+$/, 'title')).toHaveLength(1);
  });

  it('should validate doc with multiple rules', () => {
    let s = createValidatorState();
    const r = validateDoc(s, 'd1', [
      { path: 'title', value: 'ab', rules: { required: true, minLength: 3 } },
      { path: 'desc', value: 'ok', rules: { required: true } },
    ]);
    expect(r.result.valid).toBe(false);
    expect(r.result.issues.length).toBeGreaterThanOrEqual(1);
  });

  it('should validate valid doc', () => {
    let s = createValidatorState();
    const r = validateDoc(s, 'd1', [
      { path: 'title', value: 'Hello', rules: { required: true, minLength: 3, maxLength: 100 } },
    ]);
    expect(r.result.valid).toBe(true);
  });

  it('should get validation', () => {
    let s = createValidatorState();
    const r = validateDoc(s, 'd1', [{ path: 't', value: 'x', rules: { required: true } }]);
    expect(getValidation(r.state, 'd1')).toBeDefined();
  });

  it('should get invalid docs', () => {
    let s = createValidatorState();
    s = validateDoc(s, 'd1', [{ path: 't', value: null, rules: { required: true } }]).state;
    s = validateDoc(s, 'd2', [{ path: 't', value: 'x', rules: { required: true } }]).state;
    expect(getInvalidDocs(s)).toHaveLength(1);
  });

  it('should clear validations', () => {
    let s = createValidatorState();
    s = validateDoc(s, 'd1', [{ path: 't', value: 'x', rules: { required: true } }]).state;
    s = clearValidations(s);
    expect(s.results.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createValidatorState();
    const r = validateDoc(s, 'd1', [{ path: 't', value: null, rules: { required: true } }]);
    const report = getValidatorReport(r.state);
    expect(report.totalInvalid).toBe(1);
  });
});

/**
 * V187 AgentValidator Tests - Direction B Agent Forge (Iter 3/30)
 */
import { describe, it, expect } from 'vitest';
import {
  createValidatorState, addRule, removeRule, validateTemplate,
  getValidationByLevel, clearHistory, getValidatorReport,
} from '../../forge/V187-AgentValidator';

describe('V187 AgentValidator', () => {
  it('should create empty state', () => {
    const s = createValidatorState();
    expect(s.rules.size).toBe(0);
    expect(s.history).toHaveLength(0);
  });

  it('should add rule', () => {
    let s = createValidatorState();
    s = addRule(s, 'name-no-spaces', 'name', 'custom', (v: string) => !v.includes(' '), 'No spaces allowed');
    expect(s.rules.size).toBe(1);
  });

  it('should remove rule', () => {
    let s = createValidatorState();
    s = addRule(s, 'r1', 'name', 'custom', () => true, 'msg');
    s = removeRule(s, 'r1');
    expect(s.rules.size).toBe(0);
  });

  it('should validate valid template', () => {
    const s = createValidatorState();
    const r = validateTemplate(s, { name: 'editor', role: 'edit', systemPrompt: 'You are an editor', tools: ['spell'], parameters: {} });
    expect(r.result.valid).toBe(true);
    expect(r.result.errorCount).toBe(0);
  });

  it('should detect missing required fields', () => {
    const s = createValidatorState();
    const r = validateTemplate(s, { name: '', role: '', systemPrompt: '' });
    expect(r.result.valid).toBe(false);
    expect(r.result.errorCount).toBeGreaterThan(0);
  });

  it('should warn on long name', () => {
    const s = createValidatorState();
    const longName = 'a'.repeat(60);
    const r = validateTemplate(s, { name: longName, role: 'r', systemPrompt: 'a long enough system prompt' });
    expect(r.result.warningCount).toBeGreaterThan(0);
  });

  it('should reject non-array tools', () => {
    const s = createValidatorState();
    const r = validateTemplate(s, { name: 'a', role: 'r', systemPrompt: 'a long enough system prompt', tools: 'not array' as any, parameters: {} });
    expect(r.result.valid).toBe(false);
  });

  it('should apply custom rules', () => {
    let s = createValidatorState();
    s = addRule(s, 'no-spaces', 'name', 'custom', (v: string) => !v.includes(' '), 'No spaces');
    const r = validateTemplate(s, { name: 'has spaces', role: 'r', systemPrompt: 'a long enough system prompt', tools: [], parameters: {} });
    expect(r.result.valid).toBe(false);
  });

  it('should get validations by level', () => {
    const s = createValidatorState();
    const r = validateTemplate(s, { name: '', role: '', systemPrompt: '' });
    const errors = getValidationByLevel(r.state, 'error');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should clear history', () => {
    const s = createValidatorState();
    const r = validateTemplate(s, { name: 'a' });
    const cleared = clearHistory(r.state);
    expect(cleared.history).toHaveLength(0);
  });

  it('should produce report', () => {
    const s = createValidatorState();
    const r = validateTemplate(s, { name: 'a', role: 'r', systemPrompt: 'a long enough system prompt', tools: [], parameters: {} });
    const report = getValidatorReport(r.state);
    expect(report.validationsRun).toBe(1);
  });
});

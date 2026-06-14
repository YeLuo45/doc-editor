import { describe, it, expect } from 'vitest';
import {
  createCompatibilityState, addCustomRule, checkCompatibility, parseVersion,
  getHistoryForAgent, getBreakingChanges, clearHistory, getCompatibilityReport,
} from '../../forge/V199-AgentCompatibility';

describe('V199 AgentCompatibility', () => {
  it('should create empty state', () => {
    const s = createCompatibilityState();
    expect(s.history).toHaveLength(0);
    expect(s.customRules).toHaveLength(0);
  });

  it('should add custom rule', () => {
    let s = createCompatibilityState();
    s = addCustomRule(s, { name: 'tools-changed', description: 'Tools list changed', check: (a, b) => JSON.stringify(a.tools) !== JSON.stringify(b.tools) });
    expect(s.customRules).toHaveLength(1);
  });

  it('should parse version', () => {
    expect(parseVersion('1.2.3').major).toBe(1);
    expect(parseVersion('1.2.3').minor).toBe(2);
    expect(parseVersion('1.2.3').patch).toBe(3);
  });

  it('should check compatible versions', () => {
    const s = createCompatibilityState();
    const r = checkCompatibility(s, 'a', '1.0.0', '1.0.5');
    expect(r.check.level).toBe('compatible');
  });

  it('should detect minor breaking', () => {
    const s = createCompatibilityState();
    const r = checkCompatibility(s, 'a', '1.0.0', '1.1.0');
    expect(r.check.level).toBe('minor_breaking');
  });

  it('should detect major breaking', () => {
    const s = createCompatibilityState();
    const r = checkCompatibility(s, 'a', '1.0.0', '2.0.0');
    expect(r.check.level).toBe('major_breaking');
  });

  it('should detect downgrade', () => {
    const s = createCompatibilityState();
    const r = checkCompatibility(s, 'a', '2.0.0', '1.0.0');
    expect(r.check.level).toBe('major_breaking');
  });

  it('should handle pre-1.0 versions', () => {
    const s = createCompatibilityState();
    const r = checkCompatibility(s, 'a', '0.5.0', '0.6.0');
    expect(r.check.level).toBe('minor_breaking');
  });

  it('should apply custom rules', () => {
    let s = createCompatibilityState();
    s = addCustomRule(s, { name: 'tools-changed', description: 'Tools changed', check: (a, b) => JSON.stringify(a.tools) !== JSON.stringify(b.tools) });
    const r = checkCompatibility(s, 'a', '1.0.0', '1.0.0', { tools: ['a'] }, { tools: ['b'] });
    expect(r.check.breakingChanges).toContain('Tools changed');
  });

  it('should get history for agent', () => {
    let s = createCompatibilityState();
    s = checkCompatibility(s, 'a', '1.0.0', '2.0.0').state;
    s = checkCompatibility(s, 'b', '1.0.0', '1.0.0').state;
    expect(getHistoryForAgent(s, 'a')).toHaveLength(1);
  });

  it('should get breaking changes only', () => {
    let s = createCompatibilityState();
    s = checkCompatibility(s, 'a', '1.0.0', '1.0.0').state;
    s = checkCompatibility(s, 'a', '1.0.0', '2.0.0').state;
    const breaking = getBreakingChanges(s, 'a');
    expect(breaking).toHaveLength(1);
    expect(breaking[0].level).toBe('major_breaking');
  });

  it('should clear history', () => {
    let s = createCompatibilityState();
    s = checkCompatibility(s, 'a', '1.0.0', '2.0.0').state;
    s = clearHistory(s);
    expect(s.history).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createCompatibilityState();
    s = checkCompatibility(s, 'a', '1.0.0', '2.0.0').state;
    const r = getCompatibilityReport(s);
    expect(r.totalChecks).toBe(1);
    expect(r.byLevel['major_breaking']).toBe(1);
  });
});

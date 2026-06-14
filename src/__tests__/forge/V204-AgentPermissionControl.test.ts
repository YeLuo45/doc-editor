import { describe, it, expect } from 'vitest';
import {
  createPermissionState, addRule, removeRule, checkPermission,
  getRulesForAgent, getDecisionsByAgent, clearDecisions, getPermissionReport,
} from '../../forge/V204-AgentPermissionControl';

describe('V204 AgentPermissionControl', () => {
  it('should create empty state', () => {
    const s = createPermissionState();
    expect(s.rules.size).toBe(0);
  });

  it('should add rule', () => {
    const s = createPermissionState();
    const r = addRule(s, 'a', 'read', '*', 'allow');
    expect(r.state.rules.size).toBe(1);
  });

  it('should remove rule', () => {
    let s = createPermissionState();
    const r = addRule(s, 'a', 'read', '*', 'allow');
    s = removeRule(r.state, r.ruleId);
    expect(s.rules.size).toBe(0);
  });

  it('should allow with allow rule', () => {
    let s = createPermissionState();
    const r = addRule(s, 'a', 'read', '*', 'allow');
    const result = checkPermission(r.state, 'a', 'read', 'file.txt');
    expect(result.allowed).toBe(true);
  });

  it('should deny with no rules', () => {
    const s = createPermissionState();
    const result = checkPermission(s, 'a', 'read', 'file.txt');
    expect(result.allowed).toBe(false);
  });

  it('should deny with explicit deny rule', () => {
    let s = createPermissionState();
    const r1 = addRule(s, 'a', 'read', '*', 'allow');
    const r2 = addRule(r1.state, 'a', 'read', 'secret*', 'deny', 10);
    const result = checkPermission(r2.state, 'a', 'read', 'secret.txt');
    expect(result.allowed).toBe(false);
  });

  it('should support wildcard resource', () => {
    let s = createPermissionState();
    const r = addRule(s, 'a', 'write', 'docs/*', 'allow');
    const result = checkPermission(r.state, 'a', 'write', 'docs/file.txt');
    expect(result.allowed).toBe(true);
  });

  it('should get rules for agent', () => {
    let s = createPermissionState();
    s = addRule(s, 'a', 'read', '*', 'allow').state;
    s = addRule(s, 'a', 'write', '*', 'allow').state;
    s = addRule(s, 'b', 'read', '*', 'allow').state;
    expect(getRulesForAgent(s, 'a')).toHaveLength(2);
  });

  it('should get decisions by agent', () => {
    let s = createPermissionState();
    const r = addRule(s, 'a', 'read', '*', 'allow');
    checkPermission(r.state, 'a', 'read', 'file');
    checkPermission(r.state, 'a', 'read', 'file2');
    expect(getDecisionsByAgent(s, 'a')).toHaveLength(0);
  });

  it('should clear decisions', () => {
    let s = createPermissionState();
    const r = addRule(s, 'a', 'read', '*', 'allow');
    s = checkPermission(r.state, 'a', 'read', 'file').state;
    s = clearDecisions(s);
    expect(s.decisions).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createPermissionState();
    const r = addRule(s, 'a', 'read', '*', 'allow');
    s = checkPermission(r.state, 'a', 'read', 'file').state;
    const report = getPermissionReport(s);
    expect(report.rules).toBe(1);
    expect(report.decisions).toBe(1);
    expect(report.allowRate).toBe(1);
  });
});

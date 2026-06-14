import { describe, it, expect } from 'vitest';
import {
  createBudgetState, addBudget, removeBudget, checkBudget, consumeBudget,
  resetBudget, getBudgetUsage, getBudgetReport,
} from '../../perf/V250-BudgetGate';

describe('V250 BudgetGate', () => {
  it('should create empty state', () => {
    const s = createBudgetState();
    expect(s.configs.size).toBe(0);
  });

  it('should add budget', () => {
    let s = createBudgetState();
    s = addBudget(s, { name: 'tokens', limit: 1000, unit: 'tokens', windowMs: 0, action: 'reject' });
    expect(s.configs.size).toBe(1);
  });

  it('should allow within budget', () => {
    let s = createBudgetState();
    s = addBudget(s, { name: 't', limit: 100, unit: 'tokens', windowMs: 0, action: 'reject' });
    const r = checkBudget(s, 't', 50);
    expect(r.action).toBe('allow');
    expect(r.remaining).toBe(50);
  });

  it('should reject when over budget', () => {
    let s = createBudgetState();
    s = addBudget(s, { name: 't', limit: 100, unit: 'tokens', windowMs: 0, action: 'reject' });
    let r = checkBudget(s, 't', 80);
    s = r.state;
    r = checkBudget(s, 't', 80);
    expect(r.action).toBe('reject');
  });

  it('should queue when over budget with queue action', () => {
    let s = createBudgetState();
    s = addBudget(s, { name: 't', limit: 100, unit: 'tokens', windowMs: 0, action: 'queue' });
    let r = checkBudget(s, 't', 150);
    expect(r.action).toBe('queue');
    expect(s.totalQueued).toBe(0); // state not updated
    s = r.state;
    expect(s.totalQueued).toBe(1);
  });

  it('should remove budget', () => {
    let s = createBudgetState();
    s = addBudget(s, { name: 't', limit: 100, unit: 'tokens', windowMs: 0, action: 'reject' });
    s = removeBudget(s, 't');
    expect(s.configs.size).toBe(0);
  });

  it('should allow for missing budget', () => {
    const s = createBudgetState();
    const r = checkBudget(s, 'missing');
    expect(r.action).toBe('allow');
  });

  it('should reset budget', () => {
    let s = createBudgetState();
    s = addBudget(s, { name: 't', limit: 100, unit: 'tokens', windowMs: 0, action: 'reject' });
    s = consumeBudget(s, 't', 50);
    s = resetBudget(s, 't');
    expect(getBudgetUsage(s, 't')).toBe(0);
  });

  it('should consume budget', () => {
    let s = createBudgetState();
    s = addBudget(s, { name: 't', limit: 100, unit: 'tokens', windowMs: 0, action: 'reject' });
    s = consumeBudget(s, 't', 30);
    expect(getBudgetUsage(s, 't')).toBe(30);
  });

  it('should produce report', () => {
    let s = createBudgetState();
    s = addBudget(s, { name: 't', limit: 100, unit: 'tokens', windowMs: 0, action: 'reject' });
    s = consumeBudget(s, 't', 30);
    const r = getBudgetReport(s);
    expect(r.byBudget.t).toBe(30);
  });
});

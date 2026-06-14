import { describe, it, expect } from 'vitest';
import {
  createRoleState, assignRole, unassignRole, getAssignment,
  getAssignmentsByRole, getTotalBudget, getMaxConcurrent, getRoleReport,
} from '../../perf/V268-PerfRole';

describe('V268 PerfRole', () => {
  it('should create empty state', () => {
    const s = createRoleState();
    expect(s.assignments.size).toBe(0);
  });

  it('should assign role', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'heavy');
    expect(s.assignments.size).toBe(1);
  });

  it('should use default budget for role', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'heavy');
    expect(getAssignment(s, 'a1')!.budgetTokens).toBe(10000);
  });

  it('should use custom budget', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'light', 5000);
    expect(getAssignment(s, 'a1')!.budgetTokens).toBe(5000);
  });

  it('should unassign role', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'heavy');
    s = unassignRole(s, 'a1');
    expect(s.assignments.size).toBe(0);
  });

  it('should update heavy count on assign', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'heavy');
    expect(s.totalHeavy).toBe(1);
  });

  it('should update heavy count on reassign', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'heavy');
    s = assignRole(s, 'a1', 'light');
    expect(s.totalHeavy).toBe(0);
    expect(s.totalLight).toBe(1);
  });

  it('should get assignments by role', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'heavy');
    s = assignRole(s, 'a2', 'heavy');
    s = assignRole(s, 'a3', 'light');
    expect(getAssignmentsByRole(s, 'heavy')).toHaveLength(2);
  });

  it('should get total budget', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'heavy');
    s = assignRole(s, 'a2', 'light');
    expect(getTotalBudget(s)).toBe(11000);
  });

  it('should get max concurrent', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'heavy');
    s = assignRole(s, 'a2', 'light');
    expect(getMaxConcurrent(s)).toBe(13);  // 3 + 10
  });

  it('should produce report', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'heavy');
    s = assignRole(s, 'a2', 'light');
    const r = getRoleReport(s);
    expect(r.heavy).toBe(1);
    expect(r.light).toBe(1);
  });
});

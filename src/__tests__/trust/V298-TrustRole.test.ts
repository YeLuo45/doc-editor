import { describe, it, expect } from 'vitest';
import {
  createTrustRoleState, assignTrustRole, unassignTrustRole, canAgentIssue,
  canAgentRevoke, getTrustRoleAssignment, getAgentsByRole, clearTrustRoles, getTrustRoleReport,
} from '../../trust/V298-TrustRole';

describe('V298 TrustRole', () => {
  it('should create empty state', () => {
    const s = createTrustRoleState();
    expect(s.assignments.size).toBe(0);
  });

  it('should assign role', () => {
    let s = createTrustRoleState();
    s = assignTrustRole(s, 'a1', 'verifier', ['d1']);
    expect(s.assignments.size).toBe(1);
  });

  it('should grant permissions based on role', () => {
    let s = createTrustRoleState();
    s = assignTrustRole(s, 'a1', 'admin', []);
    expect(canAgentIssue(s, 'a1')).toBe(true);
    expect(canAgentRevoke(s, 'a1')).toBe(true);
  });

  it('should restrict verifier from issuing', () => {
    let s = createTrustRoleState();
    s = assignTrustRole(s, 'a1', 'verifier', []);
    expect(canAgentIssue(s, 'a1')).toBe(false);
  });

  it('should unassign role', () => {
    let s = createTrustRoleState();
    s = assignTrustRole(s, 'a1', 'verifier', []);
    s = unassignTrustRole(s, 'a1');
    expect(s.assignments.size).toBe(0);
  });

  it('should return undefined for unassigned agent on get', () => {
    const s = createTrustRoleState();
    expect(getTrustRoleAssignment(s, 'a1')).toBeUndefined();
  });

  it('should get assignment', () => {
    let s = createTrustRoleState();
    s = assignTrustRole(s, 'a1', 'verifier', ['d1']);
    expect(getTrustRoleAssignment(s, 'a1')!.scopes).toEqual(['d1']);
  });

  it('should get agents by role', () => {
    let s = createTrustRoleState();
    s = assignTrustRole(s, 'a1', 'verifier', []);
    s = assignTrustRole(s, 'a2', 'verifier', []);
    s = assignTrustRole(s, 'a3', 'admin', []);
    expect(getAgentsByRole(s, 'verifier')).toHaveLength(2);
  });

  it('should return false for unassigned agent on permissions', () => {
    const s = createTrustRoleState();
    expect(canAgentIssue(s, 'a1')).toBe(false);
    expect(canAgentRevoke(s, 'a1')).toBe(false);
  });

  it('should clear roles', () => {
    let s = createTrustRoleState();
    s = assignTrustRole(s, 'a1', 'verifier', []);
    s = clearTrustRoles(s);
    expect(s.assignments.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createTrustRoleState();
    s = assignTrustRole(s, 'a1', 'verifier', []);
    s = assignTrustRole(s, 'a2', 'admin', []);
    const r = getTrustRoleReport(s);
    expect(r.total).toBe(2);
    expect(r.byRole.verifier).toBe(1);
  });
});

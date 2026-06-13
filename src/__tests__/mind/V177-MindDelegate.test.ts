import { describe, it, expect } from 'vitest';
import {
  createDelegationState, delegate, acceptDelegation, rejectDelegation, completeDelegation,
  getDelegationsByStatus, getDelegationsForRole, getDelegationReport,
} from '../../mind/V177-MindDelegate';

describe('V177 MindDelegate', () => {
  it('should create empty state', () => {
    const s = createDelegationState();
    expect(s.delegations).toHaveLength(0);
    expect(s.nextId).toBe(1);
  });

  it('should delegate work', () => {
    const s = createDelegationState();
    const { state, id } = delegate(s, 'editor', 'reviewer', 'review this', { doc: 'x' });
    expect(state.delegations).toHaveLength(1);
    expect(id).toMatch(/^del-/);
    expect(state.delegationCounts.get('reviewer')).toBe(1);
  });

  it('should accept delegation', () => {
    let s = createDelegationState();
    const { state, id } = delegate(s, 'editor', 'reviewer', 'review', {});
    s = acceptDelegation(state, id);
    expect(s.delegations[0].status).toBe('accepted');
  });

  it('should reject delegation', () => {
    let s = createDelegationState();
    const { state, id } = delegate(s, 'editor', 'reviewer', 'review', {});
    s = rejectDelegation(state, id, 'busy');
    expect(s.delegations[0].status).toBe('rejected');
    expect(s.rejectionCounts.get('reviewer')).toBe(1);
  });

  it('should complete delegation', () => {
    let s = createDelegationState();
    const { state, id } = delegate(s, 'editor', 'reviewer', 'review', {});
    s = acceptDelegation(state, id);
    s = completeDelegation(s, id, 'looks good');
    expect(s.delegations[0].status).toBe('completed');
    expect(s.delegations[0].result).toBe('looks good');
  });

  it('should get delegations by status', () => {
    let s = createDelegationState();
    const r1 = delegate(s, 'a', 'b', 'w1', {});
    s = acceptDelegation(r1.state, r1.id);
    const r2 = delegate(s, 'a', 'b', 'w2', {});
    s = r2.state;
    expect(getDelegationsByStatus(s, 'accepted')).toHaveLength(1);
    expect(getDelegationsByStatus(s, 'pending')).toHaveLength(1);
  });

  it('should get delegations for role', () => {
    let s = createDelegationState();
    s = delegate(s, 'a', 'reviewer', 'w', {}).state;
    s = delegate(s, 'a', 'editor', 'w', {}).state;
    s = delegate(s, 'a', 'reviewer', 'w', {}).state;
    expect(getDelegationsForRole(s, 'reviewer')).toHaveLength(2);
  });

  it('should produce report', () => {
    let s = createDelegationState();
    s = delegate(s, 'a', 'reviewer', 'w', {}).state;
    const r = getDelegationReport(s);
    expect(r.total).toBe(1);
    expect(r.byRole.reviewer).toBe(1);
  });

  it('should cap at 200', () => {
    let s = createDelegationState();
    for (let i = 0; i < 250; i++) s = delegate(s, 'a', 'b', `w${i}`, {}).state;
    expect(s.delegations).toHaveLength(200);
  });
});

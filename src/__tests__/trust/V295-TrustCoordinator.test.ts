import { describe, it, expect } from 'vitest';
import {
  createTrustCoordState, initiateDecision, voteOnDecision, resolveDecision,
  getDecision, getDecisionsForDoc, getPendingDecisions, clearCoordState, getTrustCoordReport,
} from '../../trust/V295-TrustCoordinator';

describe('V295 TrustCoordinator', () => {
  it('should create empty state', () => {
    const s = createTrustCoordState();
    expect(s.decisions.size).toBe(0);
  });

  it('should initiate decision', () => {
    const s = createTrustCoordState();
    const r = initiateDecision(s, 'd1', 'requester1', ['v1', 'v2']);
    expect(r.state.decisions.size).toBe(1);
  });

  it('should vote on decision', () => {
    let s = createTrustCoordState();
    const r = initiateDecision(s, 'd1', 'r1', ['v1']);
    s = voteOnDecision(r.state, r.decisionId, 'v1', 'approve');
    expect(getDecision(s, r.decisionId)!.votes.get('v1')).toBe('approve');
  });

  it('should resolve to approve', () => {
    let s = createTrustCoordState();
    const r = initiateDecision(s, 'd1', 'r1', ['v1', 'v2', 'v3']);
    s = voteOnDecision(r.state, r.decisionId, 'v1', 'approve');
    s = voteOnDecision(s, r.decisionId, 'v2', 'approve');
    s = resolveDecision(s, r.decisionId);
    expect(s.approvedCount).toBe(1);
  });

  it('should resolve to reject', () => {
    let s = createTrustCoordState();
    const r = initiateDecision(s, 'd1', 'r1', ['v1', 'v2', 'v3']);
    s = voteOnDecision(r.state, r.decisionId, 'v1', 'reject');
    s = voteOnDecision(s, r.decisionId, 'v2', 'reject');
    s = resolveDecision(s, r.decisionId);
    expect(s.rejectedCount).toBe(1);
  });

  it('should return unchanged for missing decision', () => {
    const s = createTrustCoordState();
    expect(voteOnDecision(s, 'missing', 'v1', 'approve')).toBe(s);
  });

  it('should return undefined for missing decision on get', () => {
    const s = createTrustCoordState();
    expect(getDecision(s, 'missing')).toBeUndefined();
  });

  it('should get decisions for doc', () => {
    let s = createTrustCoordState();
    s = initiateDecision(s, 'd1', 'r1', ['v1']).state;
    s = initiateDecision(s, 'd2', 'r1', ['v1']).state;
    expect(getDecisionsForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get pending decisions', () => {
    let s = createTrustCoordState();
    s = initiateDecision(s, 'd1', 'r1', ['v1']).state;
    expect(getPendingDecisions(s)).toHaveLength(1);
  });

  it('should clear state', () => {
    let s = createTrustCoordState();
    s = initiateDecision(s, 'd1', 'r1', ['v1']).state;
    s = clearCoordState(s);
    expect(s.decisions.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createTrustCoordState();
    s = initiateDecision(s, 'd1', 'r1', ['v1']).state;
    const r = getTrustCoordReport(s);
    expect(r.total).toBe(1);
    expect(r.pending).toBe(1);
  });
});

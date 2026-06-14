import { describe, it, expect } from 'vitest';
import {
  createTrustNegotiateState, requestTrustLevel, negotiateTrustLevel,
  getPendingRequests, getGrantsForAgent, clearTrustNegotiations, getTrustNegotiateReport,
} from '../../trust/V297-TrustNegotiate';

describe('V297 TrustNegotiate', () => {
  it('should create empty state', () => {
    const s = createTrustNegotiateState();
    expect(s.pendingRequests).toHaveLength(0);
  });

  it('should request trust level', () => {
    const s = createTrustNegotiateState();
    const r = requestTrustLevel(s, 'a1', 'high', 'low', 'doc1');
    expect(r.state.pendingRequests).toHaveLength(1);
  });

  it('should negotiate within available', () => {
    const s = createTrustNegotiateState();
    const r = requestTrustLevel(s, 'a1', 'high', 'low', 'doc1');
    const n = negotiateTrustLevel(r.state, r.requestId, 'critical');
    expect(n.grant).toBeDefined();
    expect(n.grant!.grantedLevel).toBe('high');
  });

  it('should grant min when available < requested', () => {
    const s = createTrustNegotiateState();
    const r = requestTrustLevel(s, 'a1', 'high', 'medium', 'doc1');
    const n = negotiateTrustLevel(r.state, r.requestId, 'medium');
    expect(n.grant).toBeDefined();
    expect(n.grant!.grantedLevel).toBe('medium');
  });

  it('should drop when min not satisfied', () => {
    const s = createTrustNegotiateState();
    const r = requestTrustLevel(s, 'a1', 'critical', 'critical', 'doc1');
    const n = negotiateTrustLevel(r.state, r.requestId, 'low');
    expect(n.grant).toBeUndefined();
  });

  it('should return undefined for missing request', () => {
    const s = createTrustNegotiateState();
    const n = negotiateTrustLevel(s, 'missing', 'low');
    expect(n.grant).toBeUndefined();
  });

  it('should get pending requests', () => {
    let s = createTrustNegotiateState();
    s = requestTrustLevel(s, 'a1', 'high', 'low', 'd1').state;
    s = requestTrustLevel(s, 'a2', 'low', 'low', 'd2').state;
    expect(getPendingRequests(s)).toHaveLength(2);
  });

  it('should get grants for agent', () => {
    let s = createTrustNegotiateState();
    const r = requestTrustLevel(s, 'a1', 'high', 'low', 'd1');
    s = negotiateTrustLevel(r.state, r.requestId, 'critical').state;
    expect(getGrantsForAgent(s, 'a1')).toHaveLength(1);
  });

  it('should clear state', () => {
    let s = createTrustNegotiateState();
    s = requestTrustLevel(s, 'a1', 'high', 'low', 'd1').state;
    s = clearTrustNegotiations(s);
    expect(s.pendingRequests).toHaveLength(0);
  });

  it('should track by level', () => {
    let s = createTrustNegotiateState();
    const r = requestTrustLevel(s, 'a1', 'high', 'low', 'd1');
    s = negotiateTrustLevel(r.state, r.requestId, 'high').state;
    const report = getTrustNegotiateReport(s);
    expect(report.byLevel.high).toBe(1);
  });

  it('should produce report', () => {
    let s = createTrustNegotiateState();
    s = requestTrustLevel(s, 'a1', 'high', 'low', 'd1').state;
    const r = getTrustNegotiateReport(s);
    expect(r.pending).toBe(1);
  });
});

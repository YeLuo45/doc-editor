import { describe, it, expect } from 'vitest';
import {
  createTrustLifecycleState, issueTrustSession, verifyTrustSession, revokeTrustSession,
  renewTrustSession, getSession, getSessionsForDoc, getExpiredSessions, clearTrustLifecycle, getTrustLifecycleReport,
} from '../../trust/V290-TrustLifecycle';

describe('V290 TrustLifecycle', () => {
  it('should create empty state', () => {
    const s = createTrustLifecycleState();
    expect(s.sessions.size).toBe(0);
  });

  it('should issue session', () => {
    const s = createTrustLifecycleState();
    const r = issueTrustSession(s, 'd1', 'issuer1');
    expect(r.state.sessions.size).toBe(1);
  });

  it('should verify valid session', () => {
    let s = createTrustLifecycleState();
    const r = issueTrustSession(s, 'd1', 'issuer1', 10000);
    const v = verifyTrustSession(r.state, r.sessionId);
    expect(v.valid).toBe(true);
  });

  it('should reject revoked session', () => {
    let s = createTrustLifecycleState();
    const r = issueTrustSession(s, 'd1', 'issuer1');
    s = revokeTrustSession(r.state, r.sessionId);
    const v = verifyTrustSession(s, r.sessionId);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('revoked');
  });

  it('should detect expired session', () => {
    let s = createTrustLifecycleState();
    const r = issueTrustSession(s, 'd1', 'issuer1', -1000);  // already expired
    const v = verifyTrustSession(r.state, r.sessionId);
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('expired');
  });

  it('should return not_found for unknown session', () => {
    const s = createTrustLifecycleState();
    const v = verifyTrustSession(s, 'unknown');
    expect(v.valid).toBe(false);
    expect(v.reason).toBe('not_found');
  });

  it('should revoke session', () => {
    let s = createTrustLifecycleState();
    const r = issueTrustSession(s, 'd1', 'issuer1');
    s = revokeTrustSession(r.state, r.sessionId);
    expect(s.sessions.get(r.sessionId)!.phase).toBe('revoked');
  });

  it('should renew session', () => {
    let s = createTrustLifecycleState();
    const r = issueTrustSession(s, 'd1', 'issuer1', -1000);
    s = renewTrustSession(r.state, r.sessionId, 10000);
    expect(s.sessions.get(r.sessionId)!.phase).toBe('renewed');
    expect(s.sessions.get(r.sessionId)!.expiresAt).toBeGreaterThan(Date.now());
  });

  it('should get session by id', () => {
    let s = createTrustLifecycleState();
    const r = issueTrustSession(s, 'd1', 'issuer1');
    s = r.state;
    expect(getSession(s, r.sessionId)).toBeDefined();
  });

  it('should get sessions for doc', () => {
    let s = createTrustLifecycleState();
    s = issueTrustSession(s, 'd1', 'i').state;
    s = issueTrustSession(s, 'd2', 'i').state;
    expect(getSessionsForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get expired sessions', () => {
    let s = createTrustLifecycleState();
    s = issueTrustSession(s, 'd1', 'i', -1000).state;
    s = issueTrustSession(s, 'd2', 'i', 10000).state;
    expect(getExpiredSessions(s)).toHaveLength(1);
  });

  it('should clear state', () => {
    let s = createTrustLifecycleState();
    s = issueTrustSession(s, 'd1', 'i').state;
    s = clearTrustLifecycle(s);
    expect(s.sessions.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createTrustLifecycleState();
    s = issueTrustSession(s, 'd1', 'i').state;
    s = revokeTrustSession(s, s.sessions.keys().next().value!);
    const r = getTrustLifecycleReport(s);
    expect(r.revoked).toBe(1);
  });
});

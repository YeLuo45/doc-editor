import { describe, it, expect } from 'vitest';
import {
  createCollabSessionState, startSession, joinSession, leaveSession, endSession,
  getSession, getSessionsForDoc, getSessionsForUser, getActiveSessions, getCollabSessionReport,
} from '../../federation/V238-CollabSession';

describe('V238 CollabSession', () => {
  it('should create empty state', () => {
    const s = createCollabSessionState();
    expect(s.sessions.size).toBe(0);
  });

  it('should start session', () => {
    const s = createCollabSessionState();
    const r = startSession(s, 'd1', 'u1');
    expect(r.state.sessions.size).toBe(1);
    expect(r.state.activeSessions).toBe(1);
  });

  it('should join session', () => {
    let s = createCollabSessionState();
    const r = startSession(s, 'd1', 'u1');
    s = joinSession(r.state, r.sessionId, 'u2');
    expect(getSession(s, r.sessionId)!.participants.size).toBe(2);
  });

  it('should leave session', () => {
    let s = createCollabSessionState();
    const r = startSession(s, 'd1', 'u1');
    s = joinSession(r.state, r.sessionId, 'u2');
    s = leaveSession(s, r.sessionId, 'u2');
    expect(getSession(s, r.sessionId)!.participants.size).toBe(1);
  });

  it('should end session when host leaves with no participants', () => {
    let s = createCollabSessionState();
    const r = startSession(s, 'd1', 'u1');
    s = leaveSession(r.state, r.sessionId, 'u1');
    expect(getSession(s, r.sessionId)!.active).toBe(false);
  });

  it('should end session manually', () => {
    let s = createCollabSessionState();
    const r = startSession(s, 'd1', 'u1');
    s = endSession(r.state, r.sessionId);
    expect(getSession(s, r.sessionId)!.active).toBe(false);
  });

  it('should get sessions for doc', () => {
    let s = createCollabSessionState();
    s = startSession(s, 'd1', 'u1').state;
    s = startSession(s, 'd2', 'u1').state;
    expect(getSessionsForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get sessions for user', () => {
    let s = createCollabSessionState();
    const r1 = startSession(s, 'd1', 'u1');
    s = joinSession(r1.state, r1.sessionId, 'u2');
    s = startSession(s, 'd2', 'u3').state;
    expect(getSessionsForUser(s, 'u2')).toHaveLength(1);
  });

  it('should get active sessions', () => {
    let s = createCollabSessionState();
    const r = startSession(s, 'd1', 'u1');
    s = endSession(r.state, r.sessionId);
    s = startSession(s, 'd2', 'u2').state;
    expect(getActiveSessions(s)).toHaveLength(1);
  });

  it('should produce report', () => {
    let s = createCollabSessionState();
    s = startSession(s, 'd1', 'u1').state;
    s = startSession(s, 'd1', 'u2').state;
    s = startSession(s, 'd2', 'u3').state;
    const r = getCollabSessionReport(s);
    expect(r.total).toBe(3);
    expect(r.byDoc.d1).toBe(2);
  });
});

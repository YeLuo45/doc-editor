import { describe, it, expect } from 'vitest';
import {
  createPresenceState, joinDoc, leaveDoc, updatePresenceStatus, heartbeat,
  getPresencesInDoc, getPresencesForUser, getActivePresenceCount, getPresenceReport,
} from '../../federation/V221-PresenceTracker';

describe('V221 PresenceTracker', () => {
  it('should create empty state', () => {
    const s = createPresenceState();
    expect(s.presences.size).toBe(0);
  });

  it('should join doc', () => {
    let s = createPresenceState();
    s = joinDoc(s, 'u1', 'dev1', 'd1');
    expect(s.presences.size).toBe(1);
    expect(s.totalJoins).toBe(1);
  });

  it('should leave doc', () => {
    let s = createPresenceState();
    s = joinDoc(s, 'u1', 'dev1', 'd1');
    s = leaveDoc(s, 'u1', 'dev1', 'd1');
    expect(s.presences.size).toBe(0);
    expect(s.totalLeaves).toBe(1);
  });

  it('should update status', () => {
    let s = createPresenceState();
    s = joinDoc(s, 'u1', 'dev1', 'd1');
    s = updatePresenceStatus(s, 'u1', 'dev1', 'd1', 'editing');
    const p = getPresencesInDoc(s, 'd1')[0];
    expect(p.status).toBe('editing');
  });

  it('should heartbeat', () => {
    let s = createPresenceState();
    s = joinDoc(s, 'u1', 'dev1', 'd1');
    s = heartbeat(s, 'u1', 'dev1', 'd1');
    expect(s.presences.size).toBe(1);
  });

  it('should get presences in doc', () => {
    let s = createPresenceState();
    s = joinDoc(s, 'u1', 'dev1', 'd1');
    s = joinDoc(s, 'u2', 'dev1', 'd1');
    s = joinDoc(s, 'u3', 'dev1', 'd2');
    expect(getPresencesInDoc(s, 'd1')).toHaveLength(2);
  });

  it('should get presences for user (multi-device)', () => {
    let s = createPresenceState();
    s = joinDoc(s, 'u1', 'dev1', 'd1');
    s = joinDoc(s, 'u1', 'dev2', 'd2');
    expect(getPresencesForUser(s, 'u1')).toHaveLength(2);
  });

  it('should count active presence', () => {
    let s = createPresenceState();
    s = joinDoc(s, 'u1', 'dev1', 'd1', 'online');
    s = joinDoc(s, 'u2', 'dev1', 'd1', 'editing');
    s = joinDoc(s, 'u3', 'dev1', 'd1', 'offline');
    expect(getActivePresenceCount(s, 'd1')).toBe(2);
  });

  it('should produce report', () => {
    let s = createPresenceState();
    s = joinDoc(s, 'u1', 'dev1', 'd1', 'editing');
    s = joinDoc(s, 'u2', 'dev1', 'd1', 'viewing');
    s = leaveDoc(s, 'u1', 'dev1', 'd1');
    const r = getPresenceReport(s);
    expect(r.joins).toBe(2);
    expect(r.leaves).toBe(1);
  });
});

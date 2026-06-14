import { describe, it, expect } from 'vitest';
import {
  createDocShareState, grantAccess, revokeAccess, checkPermission,
  getGrantsForDoc, getGrantsForGrantee, getActiveGrants, getDocShareReport,
} from '../../federation/V237-DocShare';

describe('V237 DocShare', () => {
  it('should create empty state', () => {
    const s = createDocShareState();
    expect(s.grants.size).toBe(0);
  });

  it('should grant access', () => {
    const s = createDocShareState();
    const r = grantAccess(s, 'd1', 'user', 'u1', 'read');
    expect(r.state.grants.size).toBe(1);
  });

  it('should revoke access', () => {
    let s = createDocShareState();
    const r = grantAccess(s, 'd1', 'user', 'u1', 'read');
    s = revokeAccess(r.state, r.grantId);
    expect(s.grants.get(r.grantId)!.revoked).toBe(true);
  });

  it('should check read permission when granted', () => {
    let s = createDocShareState();
    s = grantAccess(s, 'd1', 'user', 'u1', 'read').state;
    expect(checkPermission(s, 'd1', 'u1', 'read')).toBe(true);
  });

  it('should check higher permission denied', () => {
    let s = createDocShareState();
    s = grantAccess(s, 'd1', 'user', 'u1', 'read').state;
    expect(checkPermission(s, 'd1', 'u1', 'edit')).toBe(false);
  });

  it('should check higher permission allowed by admin', () => {
    let s = createDocShareState();
    s = grantAccess(s, 'd1', 'user', 'u1', 'admin').state;
    expect(checkPermission(s, 'd1', 'u1', 'edit')).toBe(true);
  });

  it('should check expired grant', () => {
    let s = createDocShareState();
    s = grantAccess(s, 'd1', 'user', 'u1', 'read', Date.now() - 1000).state;
    expect(checkPermission(s, 'd1', 'u1', 'read')).toBe(false);
  });

  it('should get grants for doc', () => {
    let s = createDocShareState();
    s = grantAccess(s, 'd1', 'user', 'u1', 'read').state;
    s = grantAccess(s, 'd2', 'user', 'u1', 'read').state;
    expect(getGrantsForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get grants for grantee', () => {
    let s = createDocShareState();
    s = grantAccess(s, 'd1', 'user', 'u1', 'read').state;
    s = grantAccess(s, 'd2', 'user', 'u1', 'read').state;
    expect(getGrantsForGrantee(s, 'u1')).toHaveLength(2);
  });

  it('should get active grants (not revoked)', () => {
    let s = createDocShareState();
    const r1 = grantAccess(s, 'd1', 'user', 'u1', 'read');
    s = r1.state;
    s = grantAccess(s, 'd2', 'user', 'u2', 'read').state;
    s = revokeAccess(s, r1.grantId);
    expect(getActiveGrants(s)).toHaveLength(1);
  });

  it('should produce report', () => {
    let s = createDocShareState();
    s = grantAccess(s, 'd1', 'user', 'u1', 'read').state;
    s = grantAccess(s, 'd1', 'user', 'u2', 'edit').state;
    const r = getDocShareReport(s);
    expect(r.total).toBe(2);
    expect(r.active).toBe(2);
    expect(r.byPermission.read).toBe(1);
  });
});

import { describe, it, expect } from 'vitest';
import {
  createReputationCacheState, getReputation, updateReputation, invalidateReputation,
  getTrustedUsers, getUsersByTrustLevel, clearReputationCache, getReputationCacheReport,
} from '../../trust/V285-ReputationCache';

describe('V285 ReputationCache', () => {
  it('should create empty cache', () => {
    const s = createReputationCacheState();
    expect(s.cache.size).toBe(0);
  });

  it('should miss for unknown user', () => {
    let s = createReputationCacheState();
    const r = getReputation(s, 'u1');
    s = r.state;
    expect(r.hit).toBe(false);
    expect(s.misses).toBe(1);
  });

  it('should hit for cached user', () => {
    let s = createReputationCacheState();
    let r = getReputation(s, 'u1');
    s = r.state;
    r = getReputation(s, 'u1');
    expect(r.hit).toBe(true);
  });

  it('should update reputation', () => {
    let s = createReputationCacheState();
    s = getReputation(s, 'u1').state;
    s = updateReputation(s, 'u1', { type: 'helpful_edit', delta: 0.1 });
    expect(s.cache.get('u1')!.score).toBe(0.6);
  });

  it('should cap score at 1', () => {
    let s = createReputationCacheState();
    s = getReputation(s, 'u1').state;
    s = updateReputation(s, 'u1', { type: 'a', delta: 1.0 });
    expect(s.cache.get('u1')!.score).toBe(1);
  });

  it('should floor score at 0', () => {
    let s = createReputationCacheState();
    s = getReputation(s, 'u1').state;
    s = updateReputation(s, 'u1', { type: 'a', delta: -1.0 });
    expect(s.cache.get('u1')!.score).toBe(0);
  });

  it('should classify trust level', () => {
    let s = createReputationCacheState();
    s = getReputation(s, 'u1').state;
    s = updateReputation(s, 'u1', { type: 'a', delta: 0.3 });
    expect(s.cache.get('u1')!.trustLevel).toBe('trusted');
  });

  it('should invalidate', () => {
    let s = createReputationCacheState();
    s = getReputation(s, 'u1').state;
    s = invalidateReputation(s, 'u1');
    expect(s.cache.size).toBe(0);
  });

  it('should get trusted users', () => {
    let s = createReputationCacheState();
    s = getReputation(s, 'u1').state;
    s = updateReputation(s, 'u1', { type: 'a', delta: 0.3 });
    s = getReputation(s, 'u2').state;
    s = updateReputation(s, 'u2', { type: 'a', delta: -0.3 });
    expect(getTrustedUsers(s)).toHaveLength(1);
  });

  it('should get users by trust level', () => {
    let s = createReputationCacheState();
    s = getReputation(s, 'u1').state;
    s = updateReputation(s, 'u1', { type: 'a', delta: 0.3 });
    expect(getUsersByTrustLevel(s, 'trusted')).toHaveLength(1);
  });

  it('should clear cache', () => {
    let s = createReputationCacheState();
    s = getReputation(s, 'u1').state;
    s = clearReputationCache(s);
    expect(s.cache.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createReputationCacheState();
    s = getReputation(s, 'u1').state;
    s = getReputation(s, 'u1').state;
    const r = getReputationCacheReport(s);
    expect(r.hitRate).toBe(0.5);
  });
});

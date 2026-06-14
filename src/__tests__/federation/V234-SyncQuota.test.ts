import { describe, it, expect } from 'vitest';
import {
  createSyncQuotaState, consumeSyncQuota, setSyncQuotaLimit, resetSyncQuota,
  getSyncQuotaRemaining, getSyncQuotaUsagePercent, getSyncQuotaReport,
} from '../../federation/V234-SyncQuota';

describe('V234 SyncQuota', () => {
  it('should create state with default limits', () => {
    const s = createSyncQuotaState();
    expect(s.limits).toHaveLength(5);
  });

  it('should consume quota', () => {
    let s = createSyncQuotaState();
    const r = consumeSyncQuota(s, 'operations', 100);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9900);
  });

  it('should reject when over limit', () => {
    let s = createSyncQuotaState();
    s = setSyncQuotaLimit(s, 'operations', 100);
    const r = consumeSyncQuota(s, 'operations', 150);
    expect(r.allowed).toBe(false);
    expect(r.state.violations).toHaveLength(1);
  });

  it('should set custom limit', () => {
    let s = createSyncQuotaState();
    s = setSyncQuotaLimit(s, 'storage', 2 * 1024 * 1024 * 1024);
    expect(s.limits.find(l => l.type === 'storage')!.limit).toBe(2 * 1024 * 1024 * 1024);
  });

  it('should reset quota', () => {
    let s = createSyncQuotaState();
    let r = consumeSyncQuota(s, 'operations', 500);
    s = r.state;
    s = resetSyncQuota(s, 'operations');
    expect(getSyncQuotaRemaining(s, 'operations')).toBe(10000);
  });

  it('should get remaining', () => {
    let s = createSyncQuotaState();
    let r = consumeSyncQuota(s, 'operations', 100);
    s = r.state;
    expect(getSyncQuotaRemaining(s, 'operations')).toBe(9900);
  });

  it('should get usage percent', () => {
    let s = createSyncQuotaState();
    s = setSyncQuotaLimit(s, 'operations', 100);
    let r = consumeSyncQuota(s, 'operations', 25);
    s = r.state;
    expect(getSyncQuotaUsagePercent(s, 'operations')).toBe(25);
  });

  it('should produce report', () => {
    const s = createSyncQuotaState();
    const r = getSyncQuotaReport(s);
    expect(r).toHaveLength(5);
    expect(r.find(x => x.type === 'operations')).toBeDefined();
  });

  it('should cap violations at 100', () => {
    let s = createSyncQuotaState();
    s = setSyncQuotaLimit(s, 'operations', 10);
    for (let i = 0; i < 200; i++) {
      const r = consumeSyncQuota(s, 'operations', 100);
      s = r.state;
    }
    expect(s.violations.length).toBeLessThanOrEqual(100);
  });
});

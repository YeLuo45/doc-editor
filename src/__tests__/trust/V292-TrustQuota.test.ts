import { describe, it, expect } from 'vitest';
import {
  createTrustQuotaState, setTrustQuota, checkTrustQuota, resetTrustQuota,
  getTrustQuotaUsage, getTrustQuotaReport,
} from '../../trust/V292-TrustQuota';

describe('V292 TrustQuota', () => {
  it('should create empty state', () => {
    const s = createTrustQuotaState();
    expect(s.configs.size).toBe(0);
  });

  it('should set quota', () => {
    let s = createTrustQuotaState();
    s = setTrustQuota(s, { op: 'verify', limit: 10, windowMs: 1000 });
    expect(s.configs.size).toBe(1);
  });

  it('should allow within limit', () => {
    let s = createTrustQuotaState();
    s = setTrustQuota(s, { op: 'verify', limit: 10, windowMs: 1000 });
    const r = checkTrustQuota(s, 'verify');
    expect(r.allowed).toBe(true);
  });

  it('should block when over limit', () => {
    let s = createTrustQuotaState();
    s = setTrustQuota(s, { op: 'verify', limit: 1, windowMs: 1000 });
    s = checkTrustQuota(s, 'verify').state;
    const r = checkTrustQuota(s, 'verify');
    expect(r.allowed).toBe(false);
  });

  it('should reset quota', () => {
    let s = createTrustQuotaState();
    s = setTrustQuota(s, { op: 'verify', limit: 1, windowMs: 1000 });
    s = checkTrustQuota(s, 'verify').state;
    s = resetTrustQuota(s, 'verify');
    expect(getTrustQuotaUsage(s, 'verify')!.count).toBe(0);
  });

  it('should allow unconfigured op', () => {
    const s = createTrustQuotaState();
    const r = checkTrustQuota(s, 'verify');
    expect(r.allowed).toBe(true);
  });

  it('should auto-reset after window', async () => {
    let s = createTrustQuotaState();
    s = setTrustQuota(s, { op: 'verify', limit: 1, windowMs: 10 });
    s = checkTrustQuota(s, 'verify').state;
    await new Promise(r => setTimeout(r, 20));
    const after = checkTrustQuota(s, 'verify');
    expect(after.allowed).toBe(true);
  });

  it('should count blocks', () => {
    let s = createTrustQuotaState();
    s = setTrustQuota(s, { op: 'verify', limit: 1, windowMs: 1000 });
    s = checkTrustQuota(s, 'verify').state;
    s = checkTrustQuota(s, 'verify').state;
    s = checkTrustQuota(s, 'verify').state;
    expect(s.totalBlocked).toBe(2);
  });

  it('should track per op', () => {
    let s = createTrustQuotaState();
    s = setTrustQuota(s, { op: 'verify', limit: 10, windowMs: 1000 });
    s = setTrustQuota(s, { op: 'issue', limit: 5, windowMs: 1000 });
    s = checkTrustQuota(s, 'verify').state;
    s = checkTrustQuota(s, 'issue').state;
    expect(getTrustQuotaUsage(s, 'verify')!.count).toBe(1);
    expect(getTrustQuotaUsage(s, 'issue')!.count).toBe(1);
  });

  it('should produce report', () => {
    let s = createTrustQuotaState();
    s = setTrustQuota(s, { op: 'verify', limit: 10, windowMs: 1000 });
    s = checkTrustQuota(s, 'verify').state;
    const r = getTrustQuotaReport(s);
    expect(r.configured).toBe(1);
  });
});

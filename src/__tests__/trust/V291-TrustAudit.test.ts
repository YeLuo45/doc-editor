import { describe, it, expect } from 'vitest';
import {
  createTrustAuditState, logAudit, getAuditByAction, getAuditByActor,
  getAuditByTarget, getRecentAudits, searchAuditByReason, clearTrustAudits, getTrustAuditReport,
} from '../../trust/V291-TrustAudit';

describe('V291 TrustAudit', () => {
  it('should create empty state', () => {
    const s = createTrustAuditState();
    expect(s.entries).toHaveLength(0);
  });

  it('should log audit', () => {
    let s = createTrustAuditState();
    s = logAudit(s, 'issue', 'admin', 'd1', 'initial');
    expect(s.entries).toHaveLength(1);
  });

  it('should get by action', () => {
    let s = createTrustAuditState();
    s = logAudit(s, 'issue', 'a', 'd1', 'r');
    s = logAudit(s, 'verify', 'a', 'd1', 'r');
    expect(getAuditByAction(s, 'issue')).toHaveLength(1);
  });

  it('should get by actor', () => {
    let s = createTrustAuditState();
    s = logAudit(s, 'issue', 'admin', 'd1', 'r');
    s = logAudit(s, 'issue', 'user', 'd2', 'r');
    expect(getAuditByActor(s, 'admin')).toHaveLength(1);
  });

  it('should get by target', () => {
    let s = createTrustAuditState();
    s = logAudit(s, 'issue', 'admin', 'd1', 'r');
    s = logAudit(s, 'verify', 'user', 'd2', 'r');
    expect(getAuditByTarget(s, 'd1')).toHaveLength(1);
  });

  it('should get recent audits', () => {
    let s = createTrustAuditState();
    for (let i = 0; i < 20; i++) s = logAudit(s, 'issue', 'a', 'd1', 'r');
    expect(getRecentAudits(s, 5)).toHaveLength(5);
  });

  it('should search by reason', () => {
    let s = createTrustAuditState();
    s = logAudit(s, 'issue', 'a', 'd1', 'periodic review');
    s = logAudit(s, 'verify', 'a', 'd2', 'manual');
    expect(searchAuditByReason(s, 'periodic')).toHaveLength(1);
  });

  it('should clear audits', () => {
    let s = createTrustAuditState();
    s = logAudit(s, 'issue', 'a', 'd1', 'r');
    s = clearTrustAudits(s);
    expect(s.entries).toHaveLength(0);
  });

  it('should track metadata', () => {
    let s = createTrustAuditState();
    s = logAudit(s, 'issue', 'a', 'd1', 'r', { ip: '127.0.0.1' });
    expect(s.entries[0].metadata.ip).toBe('127.0.0.1');
  });

  it('should cap at 2000', () => {
    let s = createTrustAuditState();
    for (let i = 0; i < 2500; i++) s = logAudit(s, 'issue', 'a', 'd1', 'r');
    expect(s.entries).toHaveLength(2000);
  });

  it('should produce report', () => {
    let s = createTrustAuditState();
    s = logAudit(s, 'issue', 'admin', 'd1', 'r');
    s = logAudit(s, 'verify', 'user', 'd2', 'r');
    const r = getTrustAuditReport(s);
    expect(r.total).toBe(2);
    expect(r.byActor.admin).toBe(1);
  });
});
